import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hederaService } from '../services/hedera.js';
import { logger } from '../utils/logger.js';

const createExpressLoanSchema = z.object({
  parcelId: z.string(),
  principalUsd: z.number().min(1000).max(50000),
  borrowerAccountId: z.string().regex(/^0\.0\.\d+$/),
});

export async function expressLoanRoutes(fastify: FastifyInstance) {
  // Get user's express loans
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;

    try {
      const loans = await prisma.loan.findMany({
        where: { borrowerId: userId },
        include: {
          parcel: {
            select: {
              id: true,
              title: true,
              areaM2: true,
              htsTokenId: true,
              verificationType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { loans };
    } catch (error) {
      logger.error('Get express loans error:', error);
      throw new Error('Failed to fetch express loans');
    }
  });

  // Create express loan (auto-approved for verified parcels)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    
    // Validation manuelle avec Zod
    const validationResult = createExpressLoanSchema.safeParse(request.body);
    
    if (!validationResult.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const data = validationResult.data;

    try {
      // Verify parcel is verified and available
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: data.parcelId,
          ownerId: userId,
          verificationType: 'VERIFIED',
          htsTokenId: { not: null },
          status: { in: ['LISTED', 'MINTED'] },
        },
        include: {
          owner: true,
        },
      });

      if (!parcel) {
        throw new Error('Parcel not found or not eligible for express loan');
      }

      // Verify user's wallet
      if (parcel.owner.walletHedera !== data.borrowerAccountId) {
        throw new Error('Borrower wallet mismatch');
      }

      // Calculate loan terms (6% APR for verified parcels)
      const maxLoanAmount = Math.floor((parcel.priceUsd || 0) * 0.7); // 70% LTV
      if (data.principalUsd > maxLoanAmount) {
        throw new Error(`Maximum loan amount for this parcel is ${maxLoanAmount}`);
      }

      // Create express loan with auto-approval
      const loan = await prisma.loan.create({
        data: {
          borrowerId: userId,
          parcelId: data.parcelId,
          principalUsd: data.principalUsd,
          ltvBps: Math.floor((data.principalUsd / (parcel.priceUsd || 1)) * 10000),
          rateAprBps: 600, // 6% APR
          status: 'ACTIVE',
        },
        include: {
          parcel: {
            select: {
              id: true,
              title: true,
              areaM2: true,
              htsTokenId: true,
              verificationType: true,
            },
          },
          borrower: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
        },
      });

      // Update parcel status
      await prisma.parcel.update({
        where: { id: data.parcelId },
        data: { status: 'COLLATERALIZED' },
      });

      // Create loan contract on Hedera
      const contractResult = await hederaService.createLoanContract({
        borrowerId: data.borrowerAccountId,
        lenderId: 'PLATFORM', // Platform acts as lender for express loans
        collateralTokenId: parcel.htsTokenId!,
        principalAmount: data.principalUsd,
        interestRate: 0.06,
        duration: 12,
        ltvRatio: loan.ltvBps / 10000,
      });

      // Lock collateral
      await hederaService.lockCollateral(
        parcel.htsTokenId!,
        data.borrowerAccountId
      );

      // Log activity
      await prisma.activity.create({
        data: {
          parcelId: data.parcelId,
          type: 'EXPRESS_LOAN_APPROVED',
          ref: contractResult.contractTopicId || '', // ✅ Correction 3: Utiliser contractTopicId
          metadata: { 
            loanId: loan.id, 
            principalUsd: data.principalUsd,
            aprRate: 6.0,
            autoApproved: true,
          },
        },
      });

      // Publish to HCS
      await hederaService.publishToHCS({
        event: 'EXPRESS_LOAN_CREATED',
        parcelId: data.parcelId,
        tokenId: parcel.htsTokenId!,
        metadata: {
          loanId: loan.id,
          borrower: data.borrowerAccountId,
          principalUsd: data.principalUsd,
          aprRate: 6.0,
          verificationType: 'VERIFIED',
          autoApproved: true,
        },
      });

      logger.info(`Express loan approved: ${loan.id} for parcel ${data.parcelId}`);

      return { loan };
    } catch (error) {
      logger.error('Create express loan error:', error);
      throw new Error('Failed to create express loan: ' + error.message);
    }
  });

  // Repay express loan
  fastify.post('/:id/repay', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;
    const { id: loanId } = request.params as { id: string };

    try {
      const loan = await prisma.loan.findFirst({
        where: {
          id: loanId,
          borrowerId: userId,
          status: 'ACTIVE',
        },
        include: { 
          parcel: true,
          borrower: true,
        },
      });

      if (!loan) {
        throw new Error('Loan not found or not repayable');
      }

      // Calculate total repayment
      const totalRepayment = loan.principalUsd * (1 + (loan.rateAprBps / 10000));

      // Update loan status
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'REPAID' },
      });

      // Release collateral
      await prisma.parcel.update({
        where: { id: loan.parcelId },
        data: { status: 'LISTED' },
      });

      // Update borrower reputation
      await prisma.user.update({
        where: { id: userId },
        data: {
          completedLoans: { increment: 1 },
          reputationScore: { increment: 15 }, // Higher bonus for express loans
          verifiedTransactions: { increment: 1 },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          parcelId: loan.parcelId,
          type: 'EXPRESS_LOAN_REPAID',
          metadata: { 
            loanId,
            totalRepaymentUsd: totalRepayment,
          },
        },
      });

      logger.info(`Express loan repaid: ${loanId} - Total: $${totalRepayment}`);

      return { 
        loan, 
        repayment: {
          totalUsd: totalRepayment,
          principalUsd: loan.principalUsd,
        },
      };
    } catch (error) {
      logger.error('Repay express loan error:', error);
      throw new Error('Failed to repay express loan: ' + error.message);
    }
  });
}