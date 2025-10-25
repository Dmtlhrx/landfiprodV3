import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hederaService } from '../services/hedera.js';
import { logger } from '../utils/logger.js';

const createLoanRequestSchema = z.object({
  parcelId: z.string(),
  principalUsd: z.number().min(1000).max(100000),
  interestRate: z.number().min(5).max(50),
  duration: z.number().min(1).max(60),
  collateralRatio: z.number().min(0.3).max(0.8),
  terms: z.object({
    description: z.string(),
    autoLiquidation: z.boolean(),
    gracePeriod: z.number(),
    penaltyRate: z.number(),
    earlyRepaymentAllowed: z.boolean(),
    partialRepaymentAllowed: z.boolean(),
  }),
});

const fundLoanSchema = z.object({
  lenderAccountId: z.string().regex(/^0\.0\.\d+$/),
});

const repayLoanSchema = z.object({
  repaymentAccountId: z.string().regex(/^0\.0\.\d+$/),
});

// Optimized user selection for better performance
const userSelect = {
  id: true,
  email: true,
  displayName: true,
  walletHedera: true,
  reputationScore: true,
  completedLoans: true,
  defaultedLoans: true,
  verifiedTransactions: true,
  communityEndorsements: true,
  riskLevel: true,
};

// Optimized parcel selection
const parcelSelect = {
  id: true,
  title: true,
  description: true,
  latitude: true,
  longitude: true,
  areaM2: true,
  priceUsd: true,
  htsTokenId: true,
  verificationType: true,
  verificationDetails: true,
  riskAssessment: true,
  docUrl: true,
  status: true,
  owner: {
    select: {
      id: true,
      displayName: true,
      walletHedera: true,
    },
  },
};

export async function p2pLoanRoutes(fastify: FastifyInstance) {
  // Get all loan requests (marketplace) - Optimized
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const query = request.query as any;
    const limit = Math.min(parseInt(query.limit) || 20, 50); // Limit max results
    
    try {
      const where: any = {
        status: { in: ['OPEN', 'FUNDED', 'ACTIVE'] },
      };
      
      // Filter by verification type
      if (query.verification === 'verified') {
        where.parcel = { verificationType: 'VERIFIED' };
      } else if (query.verification === 'unverified') {
        where.parcel = { verificationType: 'UNVERIFIED' };
      }

      // Use separate queries for better performance
      const loans = await prisma.p2PLoan.findMany({
        where,
        select: {
          id: true,
          borrowerId: true,
          lenderId: true,
          parcelId: true,
          principalUsd: true,
          interestRate: true,
          duration: true,
          collateralRatio: true,
          status: true,
          terms: true,
          createdAt: true,
          fundedAt: true,
          dueDate: true,
          borrower: { select: userSelect },
          lender: { select: userSelect },
          parcel: { select: parcelSelect },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Get offers separately to avoid N+1 queries
      const loanIds = loans.map(loan => loan.id);
      const offers = await prisma.loanOffer.findMany({
        where: { loanId: { in: loanIds } },
        include: {
          lender: { select: userSelect },
        },
      });

      // Map offers to loans
      const loansWithOffers = loans.map(loan => ({
        ...loan,
        offers: offers.filter(offer => offer.loanId === loan.id),
      }));

      return { loans: loansWithOffers };
    } catch (error) {
      logger.error('Get P2P loans error:', error);
      return reply.code(500).send({ error: 'Failed to fetch loans' });
    }
  });

  // Get user's loans (as borrower or lender) - Optimized
  fastify.get('/my-loans', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;

    try {
      const loans = await prisma.p2PLoan.findMany({
        where: {
          OR: [
            { borrowerId: userId },
            { lenderId: userId }
          ]
        },
        select: {
          id: true,
          borrowerId: true,
          lenderId: true,
          parcelId: true,
          principalUsd: true,
          interestRate: true,
          duration: true,
          collateralRatio: true,
          status: true,
          terms: true,
          createdAt: true,
          fundedAt: true,
          dueDate: true,
          borrower: { select: userSelect },
          lender: { select: userSelect },
          parcel: { select: parcelSelect },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Reasonable limit
      });

      // Get offers separately
      const loanIds = loans.map(loan => loan.id);
      const offers = await prisma.loanOffer.findMany({
        where: { loanId: { in: loanIds } },
        include: {
          lender: { select: userSelect },
        },
      });

      const loansWithOffers = loans.map(loan => ({
        ...loan,
        offers: offers.filter(offer => offer.loanId === loan.id),
      }));

      return { loans: loansWithOffers };
    } catch (error) {
      logger.error('Get user loans error:', error);
      return reply.code(500).send({ error: 'Failed to fetch user loans' });
    }
  });

  // Create loan request - Enhanced validation
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['parcelId', 'principalUsd', 'interestRate', 'duration', 'collateralRatio', 'terms'],
        properties: {
          parcelId: { type: 'string' },
          principalUsd: { type: 'number', minimum: 1000, maximum: 100000 },
          interestRate: { type: 'number', minimum: 5, maximum: 50 },
          duration: { type: 'number', minimum: 1, maximum: 60 },
          collateralRatio: { type: 'number', minimum: 0.3, maximum: 0.8 },
          terms: {
            type: 'object',
            required: ['description', 'autoLiquidation', 'gracePeriod', 'penaltyRate', 'earlyRepaymentAllowed', 'partialRepaymentAllowed'],
            properties: {
              description: { type: 'string' },
              autoLiquidation: { type: 'boolean' },
              gracePeriod: { type: 'number' },
              penaltyRate: { type: 'number' },
              earlyRepaymentAllowed: { type: 'boolean' },
              partialRepaymentAllowed: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    
    try {
      const data = createLoanRequestSchema.parse(request.body);

      // Check if user exists and get wallet info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, walletHedera: true, displayName: true },
      });

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Verify parcel ownership and availability
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: data.parcelId,
          ownerId: userId,
          status: { in: ['LISTED', 'DRAFT'] },
        },
        select: {
          id: true,
          htsTokenId: true,
          verificationType: true,
          title: true,
          owner: {
            select: { id: true, walletHedera: true },
          },
        },
      });

      if (!parcel) {
        return reply.code(400).send({ error: 'Parcel not found or not available for collateral' });
      }

      if (!parcel.htsTokenId) {
        return reply.code(400).send({ error: 'Parcel must be minted as NFT before using as collateral' });
      }

      // Use transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create loan request
        const loan = await tx.p2PLoan.create({
          data: {
            borrowerId: userId,
            parcelId: data.parcelId,
            principalUsd: data.principalUsd,
            interestRate: data.interestRate / 100, // Convert percentage to decimal
            duration: data.duration,
            collateralRatio: data.collateralRatio,
            status: 'OPEN',
            terms: data.terms,
          },
        });

        // Update parcel status
        await tx.parcel.update({
          where: { id: data.parcelId },
          data: { status: 'COLLATERALIZED' },
        });

        // Log activity
        await tx.activity.create({
          data: {
            parcelId: data.parcelId,
            loanId: loan.id,
            type: 'LOAN_REQUEST_CREATED',
            metadata: { 
              principalUsd: data.principalUsd,
              interestRate: data.interestRate,
              duration: data.duration,
            },
          },
        });

        return loan;
      });

      // Get full loan data for response
      const fullLoan = await prisma.p2PLoan.findUnique({
        where: { id: result.id },
        select: {
          id: true,
          borrowerId: true,
          lenderId: true,
          parcelId: true,
          principalUsd: true,
          interestRate: true,
          duration: true,
          collateralRatio: true,
          status: true,
          terms: true,
          createdAt: true,
          fundedAt: true,
          dueDate: true,
          borrower: { select: userSelect },
          parcel: { select: parcelSelect },
        },
      });

      // Publish to HCS if wallet is connected
      if (user.walletHedera && parcel.htsTokenId) {
        try {
          await hederaService.publishToHCS({
            event: 'P2P_LOAN_REQUEST_CREATED',
            parcelId: data.parcelId,
            tokenId: parcel.htsTokenId,
            metadata: {
              loanId: result.id,
              borrower: user.walletHedera,
              principalUsd: data.principalUsd,
              interestRate: data.interestRate,
              duration: data.duration,
              verificationType: parcel.verificationType,
            },
          });
        } catch (hcsError) {
          logger.error('HCS publish failed:', hcsError);
          // Don't fail the request if HCS fails
        }
      }

      logger.info(`P2P loan request created: ${result.id} for parcel ${data.parcelId}`);

      return { loan: fullLoan };
    } catch (error) {
      logger.error('Create P2P loan error:', error);
      if (error.statusCode) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to create loan request' });
    }
  });

  // Fund a loan (lender action) - Enhanced validation
  // Enhanced fund loan route with better error handling and validation

fastify.post('/:id/fund', {
  preHandler: [fastify.authenticate],
  schema: {
    body: {
      type: 'object',
      required: ['lenderAccountId'],
      properties: {
        lenderAccountId: { 
          type: 'string',
          pattern: '^0\\.0\\.\\d+$'
        },
      },
    },
  },
}, async (request, reply) => {
  const userId = (request.user as any).userId;
  const { id: loanId } = request.params as { id: string };
  
  try {
    const { lenderAccountId } = fundLoanSchema.parse(request.body);

    logger.info(`Funding loan ${loanId} by user ${userId} with account ${lenderAccountId}`);

    // Verify lender exists and wallet matches
    const lender = await prisma.user.findFirst({
      where: {
        id: userId,
        walletHedera: lenderAccountId,
      },
      select: { id: true, walletHedera: true, displayName: true },
    });

    if (!lender) {
      return reply.code(400).send({ error: 'Lender wallet mismatch or user not found' });
    }

    // Get loan with full details
    const loan = await prisma.p2PLoan.findFirst({
      where: {
        id: loanId,
        status: 'OPEN',
      },
      include: { 
        parcel: { 
          select: { 
            id: true, 
            htsTokenId: true, 
            title: true,
            verificationType: true
          } 
        },
        borrower: { 
          select: { 
            id: true, 
            walletHedera: true, 
            displayName: true 
          } 
        },
      },
    });

    if (!loan) {
      return reply.code(404).send({ error: 'Loan not found or not available for funding' });
    }

    if (loan.borrowerId === userId) {
      return reply.code(400).send({ error: 'Cannot fund your own loan' });
    }

    if (!loan.borrower.walletHedera) {
      return reply.code(400).send({ 
        error: 'Borrower wallet not connected. The borrower must connect their Hedera wallet before loan can be funded.' 
      });
    }

    if (!loan.parcel.htsTokenId) {
      return reply.code(400).send({ 
        error: 'Parcel NFT not found. The property must be minted as an NFT before it can be used as collateral.' 
      });
    }

    logger.info(`Loan validation passed. Starting Hedera operations...`);

    // Initialize blockchain operation variables
    let contractResult: any = null;
    let collateralResult: any = null;
    let operationStep = 'validation';

    try {
      // Step 1: Validate system health
      operationStep = 'system_health_check';
      logger.info('Checking system health before blockchain operations...');
      
      await hederaService.validateSystemHealth();
      logger.info('System health check passed');

      // Step 2: Create loan contract
      operationStep = 'loan_contract_creation';
      logger.info('Creating loan contract on Hedera...');
      
      contractResult = await hederaService.createLoanContract({
        borrowerId: loan.borrower.walletHedera,
        lenderId: lenderAccountId,
        collateralTokenId: loan.parcel.htsTokenId,
        principalAmount: loan.principalUsd,
        interestRate: loan.interestRate,
        duration: loan.duration,
        ltvRatio: loan.collateralRatio,
      });

      logger.info(`Loan contract created successfully: ${contractResult.contractTopicId}`);

      // Step 3: Lock collateral
      operationStep = 'collateral_locking';
      logger.info('Locking collateral NFT...');
      
      collateralResult = await hederaService.lockCollateral(
        loan.parcel.htsTokenId,
        loan.borrower.walletHedera
      );

      logger.info(`Collateral locked successfully: ${collateralResult.transactionId}`);

    } catch (hederaError: any) {
      logger.error(`Hedera operation failed at step: ${operationStep}`, {
        error: hederaError.message,
        step: operationStep,
        loanId,
        borrowerAccount: loan.borrower.walletHedera,
        lenderAccount: lenderAccountId,
        tokenId: loan.parcel.htsTokenId
      });

      // Provide specific error messages based on the operation step
      let errorMessage = 'Blockchain transaction failed';
      
      switch (operationStep) {
        case 'system_health_check':
          errorMessage = `System health check failed: ${hederaError.message}`;
          break;
        case 'loan_contract_creation':
          errorMessage = `Failed to create loan contract: ${hederaError.message}`;
          break;
        case 'collateral_locking':
          errorMessage = `Failed to lock collateral: ${hederaError.message}`;
          break;
        default:
          errorMessage = `Blockchain operation failed: ${hederaError.message}`;
      }

      return reply.code(500).send({ 
        error: errorMessage,
        step: operationStep,
        details: process.env.NODE_ENV === 'development' ? hederaError.message : undefined
      });
    }

    logger.info('All Hedera operations completed successfully. Updating database...');

    // Update loan in transaction
    const updatedLoan = await prisma.$transaction(async (tx) => {
      // Update loan status
      const updated = await tx.p2PLoan.update({
        where: { id: loanId },
        data: { 
          lenderId: userId,
          status: 'ACTIVE',
          fundedAt: new Date(),
          dueDate: new Date(Date.now() + loan.duration * 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Log activities
      await tx.activity.create({
        data: {
          loanId,
          type: 'LOAN_FUNDED',
          ref: contractResult?.transactionId,
          metadata: { 
            lenderId: userId,
            lenderAccount: lenderAccountId,
            fundedAmount: loan.principalUsd,
            contractTopicId: contractResult?.contractTopicId,
            collateralLockTxId: collateralResult?.transactionId,
            operationTimestamp: new Date().toISOString()
          },
        },
      });

      // Update lender stats
      await tx.user.update({
        where: { id: userId },
        data: {
          verifiedTransactions: { increment: 1 },
          reputationScore: { increment: 5 },
        },
      });

      return updated;
    }, {
      timeout: 30000, // 30 second timeout for database transaction
    });

    logger.info(`Database updated successfully for loan ${loanId}`);

    // Get full loan data for response
    const fullLoan = await prisma.p2PLoan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        borrowerId: true,
        lenderId: true,
        parcelId: true,
        principalUsd: true,
        interestRate: true,
        duration: true,
        collateralRatio: true,
        status: true,
        terms: true,
        createdAt: true,
        fundedAt: true,
        dueDate: true,
        borrower: { select: userSelect },
        lender: { select: userSelect },
        parcel: { select: parcelSelect },
      },
    });

    // Publish to HCS (non-blocking)
    if (contractResult && loan.parcel.htsTokenId) {
      try {
        await hederaService.publishToHCS({
          event: 'P2P_LOAN_FUNDED',
          parcelId: loan.parcelId,
          tokenId: loan.parcel.htsTokenId,
          metadata: {
            loanId,
            lender: lenderAccountId,
            borrower: loan.borrower.walletHedera,
            principalUsd: loan.principalUsd,
            contractTopicId: contractResult.contractTopicId,
            fundedAt: new Date().toISOString(),
            platform: 'hedera-africa'
          },
        });
      } catch (hcsError) {
        logger.error('HCS publish failed (non-critical):', hcsError);
        // Don't fail the entire operation if HCS fails
      }
    }

    logger.info(`P2P loan funded successfully: ${loanId} by ${lenderAccountId}`);

    return { 
      loan: fullLoan,
      blockchain: {
        contractTopicId: contractResult?.contractTopicId,
        contractTransactionId: contractResult?.transactionId,
        collateralTransactionId: collateralResult?.transactionId,
        escrowAccount: collateralResult?.escrowAccountId
      }
    };

  } catch (error: any) {
    logger.error('Fund P2P loan error:', {
      error: error.message,
      loanId,
      userId,
      stack: error.stack
    });

    // Handle different types of errors
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'Loan not found' });
    } else if (error.message?.includes('Loan not found')) {
      return reply.code(404).send({ error: error.message });
    } else if (error.message?.includes('Cannot fund your own loan')) {
      return reply.code(400).send({ error: error.message });
    } else if (error.message?.includes('wallet')) {
      return reply.code(400).send({ error: error.message });
    } else if (error.message?.includes('NFT')) {
      return reply.code(400).send({ error: error.message });
    } else if (error.statusCode) {
      return reply.code(error.statusCode).send({ error: error.message });
    } else {
      return reply.code(500).send({ 
        error: 'Failed to fund loan',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

  // Repay loan - Enhanced validation
  fastify.post('/:id/repay', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['repaymentAccountId'],
        properties: {
          repaymentAccountId: { 
            type: 'string',
            pattern: '^0\\.0\\.\\d+$'
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id: loanId } = request.params as { id: string };
    
    try {
      const { repaymentAccountId } = repayLoanSchema.parse(request.body);

      const loan = await prisma.p2PLoan.findFirst({
        where: {
          id: loanId,
          borrowerId: userId,
          status: 'ACTIVE',
        },
        include: { 
          parcel: { select: { id: true, htsTokenId: true } },
          borrower: { select: { id: true, walletHedera: true } },
          lender: { select: { id: true, walletHedera: true } },
        },
      });

      if (!loan) {
        return reply.code(404).send({ error: 'Loan not found or not repayable' });
      }

      if (loan.borrower.walletHedera !== repaymentAccountId) {
        return reply.code(400).send({ error: 'Repayment account mismatch' });
      }

      // Calculate total repayment
      const totalRepayment = loan.principalUsd * (1 + (loan.interestRate * loan.duration / 12));

      // Update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update loan status
        const updatedLoan = await tx.p2PLoan.update({
          where: { id: loanId },
          data: { status: 'REPAID' },
        });

        // Release collateral
        await tx.parcel.update({
          where: { id: loan.parcelId },
          data: { status: 'LISTED' },
        });

        // Update borrower reputation
        await tx.user.update({
          where: { id: userId },
          data: {
            completedLoans: { increment: 1 },
            reputationScore: { increment: 10 },
            verifiedTransactions: { increment: 1 },
          },
        });

        // Update lender reputation
        if (loan.lenderId) {
          await tx.user.update({
            where: { id: loan.lenderId },
            data: {
              completedLoans: { increment: 1 },
              reputationScore: { increment: 5 },
              verifiedTransactions: { increment: 1 },
            },
          });
        }

        // Log activity
        await tx.activity.create({
          data: {
            loanId,
            type: 'LOAN_REPAID',
            metadata: { 
              totalRepaymentUsd: totalRepayment,
              repaymentAccount: repaymentAccountId,
            },
          },
        });

        return updatedLoan;
      });

      // Get full loan data
      const fullLoan = await prisma.p2PLoan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          borrowerId: true,
          lenderId: true,
          parcelId: true,
          principalUsd: true,
          interestRate: true,
          duration: true,
          collateralRatio: true,
          status: true,
          terms: true,
          createdAt: true,
          fundedAt: true,
          dueDate: true,
          borrower: { select: userSelect },
          lender: { select: userSelect },
          parcel: { select: parcelSelect },
        },
      });

      // Publish to HCS
      if (loan.parcel.htsTokenId) {
        try {
          await hederaService.publishToHCS({
            event: 'P2P_LOAN_REPAID',
            parcelId: loan.parcelId,
            tokenId: loan.parcel.htsTokenId,
            metadata: {
              loanId,
              borrower: repaymentAccountId,
              lender: loan.lender?.walletHedera,
              totalRepaymentUsd: totalRepayment,
            },
          });
        } catch (hcsError) {
          logger.error('HCS publish failed:', hcsError);
        }
      }

      logger.info(`P2P loan repaid: ${loanId} - Total: $${totalRepayment}`);

      return { 
        loan: fullLoan, 
        repayment: {
          totalUsd: totalRepayment,
          principalUsd: loan.principalUsd,
        },
      };
    } catch (error) {
      logger.error('Repay P2P loan error:', error);
      if (error.statusCode) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to repay loan' });
    }
  });

  // Get loan details - Optimized
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: loanId } = request.params as { id: string };

    try {
      const loan = await prisma.p2PLoan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          borrowerId: true,
          lenderId: true,
          parcelId: true,
          principalUsd: true,
          interestRate: true,
          duration: true,
          collateralRatio: true,
          status: true,
          terms: true,
          createdAt: true,
          fundedAt: true,
          dueDate: true,
          borrower: { select: userSelect },
          lender: { select: userSelect },
          parcel: { select: parcelSelect },
        },
      });

      if (!loan) {
        return reply.code(404).send({ error: 'Loan not found' });
      }

      // Get offers and activities separately
      const [offers, activities] = await Promise.all([
        prisma.loanOffer.findMany({
          where: { loanId },
          include: { lender: { select: userSelect } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.activity.findMany({
          where: { loanId },
          orderBy: { createdAt: 'desc' },
          take: 20, // Limit activities
        }),
      ]);

      const loanWithDetails = {
        ...loan,
        offers,
        activities,
      };

      return { loan: loanWithDetails };
    } catch (error) {
      logger.error('Get loan details error:', error);
      return reply.code(500).send({ error: 'Failed to fetch loan details' });
    }
  });

  // Claim collateral - Enhanced validation
  fastify.post('/:id/claim-collateral', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id: loanId } = request.params as { id: string };

    try {
      const loan = await prisma.p2PLoan.findFirst({
        where: {
          id: loanId,
          lenderId: userId,
          status: 'ACTIVE',
        },
        include: { 
          parcel: { select: { id: true, htsTokenId: true } },
          borrower: { select: { id: true, walletHedera: true } },
          lender: { select: { id: true, walletHedera: true } },
        },
      });

      if (!loan) {
        return reply.code(404).send({ error: 'Loan not found or not eligible for collateral claim' });
      }

      // Check if loan is overdue
      const isOverdue = loan.dueDate && new Date() > loan.dueDate;
      if (!isOverdue) {
        return reply.code(400).send({ error: 'Loan is not overdue yet' });
      }

      // Update in transaction
      await prisma.$transaction(async (tx) => {
        // Transfer NFT ownership to lender
        await tx.parcel.update({
          where: { id: loan.parcelId },
          data: { 
            ownerId: userId,
            status: 'LISTED',
          },
        });

        // Update loan status
        await tx.p2PLoan.update({
          where: { id: loanId },
          data: { status: 'LIQUIDATED' },
        });

        // Update borrower reputation (negative impact)
        await tx.user.update({
          where: { id: loan.borrowerId },
          data: {
            defaultedLoans: { increment: 1 },
            reputationScore: { decrement: 20 },
            riskLevel: 'HIGH',
          },
        });

        // Log activity
        await tx.activity.create({
          data: {
            parcelId: loan.parcelId,
            loanId,
            type: 'COLLATERAL_CLAIMED',
            metadata: { 
              newOwnerId: userId,
              previousOwnerId: loan.borrowerId,
            },
          },
        });
      });

      // Publish to HCS
      if (loan.parcel.htsTokenId) {
        try {
          await hederaService.publishToHCS({
            event: 'COLLATERAL_LIQUIDATED',
            parcelId: loan.parcelId,
            tokenId: loan.parcel.htsTokenId,
            metadata: {
              loanId,
              newOwner: loan.lender?.walletHedera,
              previousOwner: loan.borrower.walletHedera,
            },
          });
        } catch (hcsError) {
          logger.error('HCS publish failed:', hcsError);
        }
      }

      logger.info(`Collateral claimed: ${loanId} - Parcel ${loan.parcelId} transferred to ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Claim collateral error:', error);
      if (error.statusCode) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to claim collateral' });
    }
  });
}