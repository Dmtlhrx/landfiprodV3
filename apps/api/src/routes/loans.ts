import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hederaService } from '../services/hedera.js';
import { logger } from '../utils/logger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ------------------------
// Zod Schemas
// ------------------------
const createLoanSchema = z.object({
  parcelId: z.string(),
  principalUsd: z.number().min(1000).max(100000),
  ltvBps: z.number().min(3000).max(7000), // 30% to 70%
  borrowerAccountId: z.string().regex(/^0\.0\.\d+$/),
});

const repayLoanSchema = z.object({
  repaymentAccountId: z.string().regex(/^0\.0\.\d+$/),
});

// ------------------------
// Convert Zod → JSON Schema
// ------------------------
const createLoanSchemaJson = zodToJsonSchema(createLoanSchema, 'CreateLoanSchema');
const repayLoanSchemaJson = zodToJsonSchema(repayLoanSchema, 'RepayLoanSchema');

export async function loanRoutes(fastify: FastifyInstance) {
  // Get user loans
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { loans };
    } catch (error) {
      logger.error('Get loans error:', error);
      throw new Error('Failed to fetch loans');
    }
  });

  // Create loan with collateral
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: createLoanSchemaJson,
    },
  }, async (request) => {
    const userId = (request.user as any).userId;
    const data = request.body as z.infer<typeof createLoanSchema>;

    try {
      // Verify parcel ownership and availability
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: data.parcelId,
          ownerId: userId,
          status: 'LISTED',
          htsTokenId: { not: null },
        },
        include: {
          owner: true,
        },
      });

      if (!parcel) {
        throw new Error('Parcel not found or not available for collateral');
      }

      // Verify user's wallet
      if (parcel.owner.walletHedera !== data.borrowerAccountId) {
        throw new Error('Borrower wallet mismatch');
      }

      // Calculate loan terms
      const rateAprBps = 850; // 8.5% base rate
      const collateralValueUsd = Math.round(data.principalUsd / (data.ltvBps / 10000));

      // Create loan contract on Hedera (simplified)
      const contractResult = await hederaService.createLoanContract({
        borrowerId: data.borrowerAccountId,
        lenderId: process.env.HEDERA_TREASURY_ID || process.env.HEDERA_OPERATOR_ID!, // Platform acts as lender
        collateralTokenId: parcel.htsTokenId!,
        principalAmount: data.principalUsd,
        interestRate: rateAprBps / 10000, // Convert basis points to decimal
        duration: 12, // 12 months default
        ltvRatio: data.ltvBps / 10000 // Convert basis points to decimal
      });

      const loan = await prisma.loan.create({
        data: {
          borrowerId: userId,
          parcelId: data.parcelId,
          principalUsd: data.principalUsd,
          ltvBps: data.ltvBps,
          rateAprBps,
          status: 'ACTIVE',
        },
        include: {
          parcel: {
            select: {
              id: true,
              title: true,
              areaM2: true,
              htsTokenId: true,
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

      // Log activity
      await prisma.activity.create({
        data: {
          parcelId: data.parcelId,
          type: 'LOAN_CREATED',
          metadata: { 
            loanId: loan.id, 
            principalUsd: data.principalUsd,
            ltvBps: data.ltvBps,
            // Enlever contractId si ce n'est pas dans le type de retour
            // contractId: contractResult.contractId,
          },
        },
      });

      // Publish to HCS
      await hederaService.publishToHCS({
        event: 'LOAN_CREATED',
        parcelId: data.parcelId,
        tokenId: parcel.htsTokenId!,
        metadata: {
          loanId: loan.id,
          borrower: data.borrowerAccountId,
          principalUsd: data.principalUsd,
          ltvBps: data.ltvBps,
          collateralTokenId: parcel.htsTokenId,
        },
      });

      logger.info(`Loan created: ${loan.id} for parcel ${data.parcelId}`);

      return { loan, contractResult };
    } catch (error) {
      logger.error('Create loan error:', error);
      throw new Error('Failed to create loan: ' + (error as Error).message);
    }
  });

  // Repay loan
  fastify.post('/:id/repay', {
    preHandler: [fastify.authenticate],
    schema: {
      body: repayLoanSchemaJson,
    },
  }, async (request) => {
    const userId = (request.user as any).userId;
    const { id: loanId } = request.params as { id: string };
    const { repaymentAccountId } = request.body as z.infer<typeof repayLoanSchema>;

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

      // Verify repayment account
      if (loan.borrower.walletHedera !== repaymentAccountId) {
        throw new Error('Repayment account mismatch');
      }

      // Calculate total repayment (principal + interest)
      const monthsElapsed = Math.max(1, Math.floor(
        (Date.now() - new Date(loan.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
      ));
      const interestAmount = Math.round(
        (loan.principalUsd * (loan.rateAprBps / 10000) * monthsElapsed) / 12
      );
      const totalRepayment = loan.principalUsd + interestAmount;

      // Update loan status
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: { 
          status: 'REPAID',
          updatedAt: new Date(),
        },
        include: {
          parcel: true,
          borrower: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
        },
      });

      // Release collateral
      await prisma.parcel.update({
        where: { id: loan.parcelId },
        data: { status: 'LISTED' },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          parcelId: loan.parcelId,
          type: 'LOAN_REPAID',
          metadata: { 
            loanId,
            totalRepaymentUsd: totalRepayment,
            interestUsd: interestAmount,
          },
        },
      });

      // Publish to HCS
      await hederaService.publishToHCS({
        event: 'LOAN_REPAID',
        parcelId: loan.parcelId,
        tokenId: loan.parcel.htsTokenId!,
        metadata: {
          loanId,
          borrower: repaymentAccountId,
          totalRepaymentUsd: totalRepayment,
          interestUsd: interestAmount,
        },
      });

      logger.info(`Loan repaid: ${loanId} - Total: $${totalRepayment}`);

      return { 
        loan: updatedLoan, 
        repayment: {
          totalUsd: totalRepayment,
          interestUsd: interestAmount,
          principalUsd: loan.principalUsd,
        },
      };
    } catch (error) {
      logger.error('Repay loan error:', error);
      throw new Error('Failed to repay loan: ' + (error as Error).message);
    }
  });

  // Get loan details
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;
    const { id: loanId } = request.params as { id: string };

    try {
      const loan = await prisma.loan.findFirst({
        where: {
          id: loanId,
          borrowerId: userId,
        },
        include: {
          parcel: {
            include: {
              activities: {
                where: { type: { in: ['LOAN_CREATED', 'LOAN_REPAID'] } },
                orderBy: { createdAt: 'desc' },
              },
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

      if (!loan) {
        throw new Error('Loan not found');
      }

      // Calculate current loan status
      const monthsElapsed = Math.max(1, Math.floor(
        (Date.now() - new Date(loan.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
      ));
      const currentInterest = Math.round(
        (loan.principalUsd * (loan.rateAprBps / 10000) * monthsElapsed) / 12
      );
      const totalOwed = loan.principalUsd + currentInterest;

      return { 
        loan,
        calculations: {
          monthsElapsed,
          currentInterestUsd: currentInterest,
          totalOwedUsd: totalOwed,
          monthlyPaymentUsd: Math.round(totalOwed / 12),
        },
      };
    } catch (error) {
      logger.error('Get loan details error:', error);
      throw new Error('Failed to fetch loan details');
    }
  });
}