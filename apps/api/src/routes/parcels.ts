import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../config/database.js';
import { hederaService } from '../services/hedera.js';
import { logger } from '../utils/logger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ------------------------
// Zod Schemas
// ------------------------
const createParcelSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  areaM2: z.number().min(100).max(1000000),
  priceUsd: z.number().min(1000).max(10000000),
});

const mintParcelSchema = z.object({
  parcelId: z.string(),
  userAccountId: z.string().regex(/^0\.0\.\d+$/),
  paymentTransactionId: z.string().optional(),
});

const listParcelSchema = z.object({
  parcelId: z.string(),
  priceUsd: z.number().min(1000),
});

const buyParcelSchema = z.object({
  parcelId: z.string(),
  buyerAccountId: z.string().regex(/^0\.0\.\d+$/),
});

// ------------------------
// Convert Zod → JSON Schema
// ------------------------
const createParcelSchemaJson = zodToJsonSchema(createParcelSchema, 'CreateParcelSchema');
const mintParcelSchemaJson = zodToJsonSchema(mintParcelSchema, 'MintParcelSchema');
const listParcelSchemaJson = zodToJsonSchema(listParcelSchema, 'ListParcelSchema');
const buyParcelSchemaJson = zodToJsonSchema(buyParcelSchema, 'BuyParcelSchema');

export async function parcelRoutes(fastify: FastifyInstance) {
  
  // ============================================
  // GET ALL PARCELS WITH FILTERS
  // ============================================
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    logger.debug('🔍 [GET /] Starting parcel search');
    
    const query = request.query as any;
    logger.debug('🔍 [GET /] Query parameters:', JSON.stringify(query, null, 2));
    
    try {
      const where: any = {};
      logger.debug('🔍 [GET /] Building where clause...');
      
      // Apply filters
      if (query.status) {
        where.status = query.status;
        logger.debug('🔍 [GET /] Added status filter:', query.status);
      }
      if (query.minPrice) {
        where.priceUsd = { gte: parseInt(query.minPrice) };
        logger.debug('🔍 [GET /] Added minPrice filter:', parseInt(query.minPrice));
      }
      if (query.maxPrice) {
        where.priceUsd = { ...where.priceUsd, lte: parseInt(query.maxPrice) };
        logger.debug('🔍 [GET /] Added maxPrice filter:', parseInt(query.maxPrice));
      }
      if (query.minArea) {
        where.areaM2 = { gte: parseInt(query.minArea) };
        logger.debug('🔍 [GET /] Added minArea filter:', parseInt(query.minArea));
      }
      if (query.maxArea) {
        where.areaM2 = { ...where.areaM2, lte: parseInt(query.maxArea) };
        logger.debug('🔍 [GET /] Added maxArea filter:', parseInt(query.maxArea));
      }
      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
        logger.debug('🔍 [GET /] Added search filter:', query.search);
      }

      logger.debug('🔍 [GET /] Final where clause:', JSON.stringify(where, null, 2));
      
      const limit = parseInt(query.limit) || 50;
      const offset = parseInt(query.offset) || 0;
      logger.debug(`🔍 [GET /] Pagination: limit=${limit}, offset=${offset}`);

      logger.debug('🔍 [GET /] Executing database query...');
      const parcels = await prisma.parcel.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              loans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      logger.debug(`🔍 [GET /] Found ${parcels.length} parcels`);
      logger.debug('🔍 [GET /] Sample parcel IDs:', parcels.slice(0, 3).map(p => p.id));

      return { parcels };
    } catch (error) {
      logger.error('❌ [GET /] Database error:', error);
      logger.error('❌ [GET /] Error stack:', error.stack);
      throw new Error('Failed to fetch parcels');
    }
  });

  // ============================================
  // CREATE PARCEL (DRAFT) - FIXED VERSION
  // ============================================
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      body: createParcelSchemaJson,
    },
  }, async (request, reply) => {
    logger.debug('📝 [POST /] Starting parcel creation');
    
    const userId = (request.user as any).userId;
    const data = request.body as z.infer<typeof createParcelSchema>;

    logger.debug('📝 [POST /] User ID:', userId);
    logger.debug('📝 [POST /] Parcel data:', JSON.stringify(data, null, 2));

    try {
      // ✅ STEP 1: Verify user exists
      logger.debug('📝 [POST /] Step 1: Verifying user exists...');
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          displayName: true, 
          walletHedera: true 
        }
      });

      if (!userExists) {
        logger.error('❌ [POST /] User not found:', userId);
        return reply.code(404).send({ 
          error: 'User not found',
          details: { 
            userId,
            message: 'The authenticated user does not exist in the database'
          }
        });
      }

      logger.debug('📝 [POST /] User verified:', {
        id: userExists.id,
        displayName: userExists.displayName,
        hasWallet: !!userExists.walletHedera
      });

      // ✅ STEP 2: Create parcel with Prisma relation
      logger.debug('📝 [POST /] Step 2: Creating parcel in database...');
      
      const parcel = await prisma.parcel.create({
        data: {
          title: data.title,
          description: data.description,
          latitude: data.latitude,
          longitude: data.longitude,
          areaM2: data.areaM2,
          priceUsd: data.priceUsd,
          status: 'DRAFT',
          // ✅ Use Prisma relation instead of direct assignment
          owner: {
            connect: { id: userId }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
          activities: true,
        },
      });

      logger.debug('📝 [POST /] Parcel created successfully:', {
        id: parcel.id,
        title: parcel.title,
        status: parcel.status,
        ownerId: parcel.ownerId
      });

      // ✅ STEP 3: Log activity
      logger.debug('📝 [POST /] Step 3: Creating activity log...');
      
      await prisma.activity.create({
        data: {
          parcelId: parcel.id,
          type: 'CREATED',
          metadata: { 
            action: 'parcel_created_draft',
            createdBy: userId,
            timestamp: new Date().toISOString()
          },
        },
      });
      
      logger.debug('📝 [POST /] Activity logged successfully');

      // ✅ STEP 4: Publish to HCS (non-blocking)
      logger.debug('📝 [POST /] Step 4: Publishing to HCS (async)...');
      
      hederaService.publishToHCS({
        event: 'PARCEL_CREATED',
        parcelId: parcel.id,
        metadata: {
          title: parcel.title,
          areaM2: parcel.areaM2,
          coordinates: { lat: parcel.latitude, lng: parcel.longitude },
          owner: userId
        },
      }).then(() => {
        logger.debug('📝 [POST /] HCS publication successful');
      }).catch(hcsError => {
        logger.warn('⚠️ [POST /] HCS publication failed (non-critical):', hcsError.message);
      });

      logger.info(`✅ [POST /] Parcel created successfully: ${parcel.id} by user ${userId}`);

      return reply.code(201).send({ 
        success: true,
        parcel,
        message: 'Parcel created successfully'
      });

    } catch (error: any) {
      logger.error('❌ [POST /] Creation error:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        name: error.name
      });

      // ✅ Enhanced error handling
      if (error.code === 'P2002') {
        return reply.code(409).send({ 
          error: 'Parcel with this data already exists',
          details: { 
            constraint: error.meta?.target,
            message: 'A unique constraint was violated'
          }
        });
      }

      if (error.code === 'P2003') {
        return reply.code(400).send({ 
          error: 'Invalid user reference',
          details: { 
            userId,
            message: 'The user ID does not exist'
          }
        });
      }

      if (error.code === 'P2025') {
        return reply.code(404).send({ 
          error: 'User not found during creation',
          details: { userId }
        });
      }

      return reply.code(500).send({ 
        error: 'Failed to create parcel',
        details: {
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  });













  
  // Mint parcel as NFT with payment (Mise à jour pour Hedera 2025)
  // Enhanced mint endpoint with comprehensive error handling and debugging
fastify.post('/mint', {
  preHandler: [fastify.authenticate],
  schema: {
    body: mintParcelSchemaJson,
  },
}, async (request, reply) => {
  logger.debug('🪙 [POST /mint] Starting parcel minting');
  
  const userId = (request.user as any).userId;
  const { parcelId, userAccountId } = request.body as z.infer<typeof mintParcelSchema>;

  logger.debug('🪙 [POST /mint] Parameters:', {
    userId,
    parcelId,
    userAccountId
  });

  try {
    // Step 1: Verify ownership and status
    logger.debug('🪙 [POST /mint] Step 1: Verifying parcel ownership...');
    const parcel = await prisma.parcel.findFirst({
      where: {
        id: parcelId,
        ownerId: userId,
        status: 'DRAFT',
      },
      include: {
        owner: true,
      },
    });

    if (!parcel) {
      logger.error('❌ [POST /mint] Parcel verification failed:', {
        parcelId,
        userId,
        reason: 'not found, not owned, or not in DRAFT status'
      });
      return reply.code(404).send({ 
        error: 'Parcel not found, not owned, or already minted',
        details: { parcelId, userId, expectedStatus: 'DRAFT' }
      });
    }

    logger.debug('🪙 [POST /mint] Parcel found:', {
      id: parcel.id,
      title: parcel.title,
      status: parcel.status,
      ownerWallet: parcel.owner.walletHedera
    });

    // Step 2: Verify user's wallet matches
    if (parcel.owner.walletHedera !== userAccountId) {
      logger.error('❌ [POST /mint] Wallet mismatch:', {
        expected: parcel.owner.walletHedera,
        provided: userAccountId
      });
      return reply.code(400).send({ 
        error: 'Wallet account mismatch',
        details: { 
          expected: parcel.owner.walletHedera, 
          provided: userAccountId 
        }
      });
    }

    logger.debug('🪙 [POST /mint] Step 2: Wallet verification passed');

    // Step 3: Validate Hedera account format
    const accountPattern = /^0\.0\.\d+$/;
    if (!accountPattern.test(userAccountId)) {
      logger.error('❌ [POST /mint] Invalid Hedera account format:', {
        provided: userAccountId,
        expectedFormat: '0.0.xxxxx'
      });
      return reply.code(400).send({ 
        error: 'Invalid Hedera account ID format',
        details: { 
          provided: userAccountId, 
          expectedFormat: '0.0.xxxxx' 
        }
      });
    }

    // Step 4: Check if hederaService is available
    if (!hederaService) {
      logger.error('❌ [POST /mint] Hedera service not available');
      return reply.code(503).send({ 
        error: 'Hedera service unavailable',
        details: 'Blockchain service is temporarily unavailable'
      });
    }

    // Step 5: Validate required environment variables
// In the mint endpoint, change:
const requiredEnvVars = ['HEDERA_OPERATOR_ID', 'HEDERA_OPERATOR_KEY'];
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    if (missingEnvVars.length > 0) {
      logger.error('❌ [POST /mint] Missing environment variables:', missingEnvVars);
      return reply.code(500).send({ 
        error: 'Server configuration error',
        details: 'Missing required blockchain configuration'
      });
    }

    // Step 6: Check if parcel data is complete for minting
    const requiredFields = ['title', 'latitude', 'longitude', 'areaM2'];
    const missingFields = requiredFields.filter(field => !parcel[field]);
    if (missingFields.length > 0) {
      logger.error('❌ [POST /mint] Incomplete parcel data:', {
        parcelId,
        missingFields
      });
      return reply.code(400).send({ 
        error: 'Incomplete parcel data for minting',
        details: { missingFields }
      });
    }

    logger.debug('🪙 [POST /mint] Step 3-6: All validations passed, starting minting process...');

    // Step 7: Process minting with enhanced error handling
    let mintResult;
    try {
      logger.debug('🪙 [POST /mint] Step 7: Calling hederaService.processParcelMinting...');
      
      // Log the exact parameters being sent to Hedera service
      const mintingParams = {
        parcelId: parcel.id,
        title: parcel.title,
        description: parcel.description || '',
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        areaM2: parcel.areaM2,
      };
      logger.debug('🪙 [POST /mint] Minting parameters:', mintingParams);

      mintResult = await hederaService.processParcelMinting(userAccountId, mintingParams);
      
      logger.debug('🪙 [POST /mint] Minting successful:', JSON.stringify(mintResult, null, 2));

    } catch (hederaError) {
      logger.error('❌ [POST /mint] Hedera minting failed:', {
        error: hederaError.message,
        code: hederaError.code,
        name: hederaError.name,
        stack: hederaError.stack
      });

      // Handle specific Hedera errors
      let errorMessage = 'Failed to mint NFT on Hedera network';
      let statusCode = 500;

      if (hederaError.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
        errorMessage = 'Insufficient account balance for minting';
        statusCode = 402;
      } else if (hederaError.message?.includes('INVALID_ACCOUNT_ID')) {
        errorMessage = 'Invalid Hedera account ID';
        statusCode = 400;
      } else if (hederaError.message?.includes('MAX_NFTS_IN_PRICE_REGIME_HAVE_BEEN_MINTED')) {
        errorMessage = 'Maximum NFTs for this token have been minted';
        statusCode = 429;
      } else if (hederaError.message?.includes('TOKEN_HAS_NO_SUPPLY_KEY')) {
        errorMessage = 'Token configuration error - missing supply key';
        statusCode = 500;
      } else if (hederaError.message?.includes('INVALID_SIGNATURE')) {
        errorMessage = 'Invalid signature for minting transaction';
        statusCode = 401;
      }

      return reply.code(statusCode).send({ 
        error: errorMessage,
        details: {
          hederaError: hederaError.message,
          code: hederaError.code,
          userAccountId,
          parcelId
        }
      });
    }

    // Step 8: Validate mint result
    if (!mintResult || !mintResult.tokenId) {
      logger.error('❌ [POST /mint] Invalid mint result:', mintResult);
      return reply.code(500).send({ 
        error: 'Invalid minting response from blockchain',
        details: { mintResult }
      });
    }

    logger.debug('🪙 [POST /mint] Step 8: Mint result validated');

    // Step 9: Update parcel with transaction info
    try {
      logger.debug('🪙 [POST /mint] Step 9: Updating parcel status in database...');
      
      const updatedParcel = await prisma.parcel.update({
        where: { id: parcelId },
        data: {
          htsTokenId: mintResult.tokenId,
          status: 'LISTED',
          updatedAt: new Date(),
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
        },
      });

      logger.debug('🪙 [POST /mint] Parcel updated successfully');

      // Step 10: Log activity
      logger.debug('🪙 [POST /mint] Step 10: Creating mint activity record...');
      
      await prisma.activity.create({
        data: {
          parcelId: parcel.id,
          type: 'MINTED',
          ref: mintResult.transactionId || null,
          metadata: { 
            tokenId: mintResult.tokenId,
            paymentTxId: mintResult.paymentTransactionId || null,
            serialNumber: mintResult.serialNumber || null,
            mintedAt: new Date().toISOString(),
            userAccountId
          },
        },
      });

      logger.debug('🪙 [POST /mint] Activity logged successfully');

      // Step 11: Publish to HCS (non-blocking)
      logger.debug('🪙 [POST /mint] Step 11: Publishing mint event to HCS...');
      
      // Don't await HCS publication to avoid blocking the response
      hederaService.publishToHCS({
        event: 'PARCEL_MINTED',
        parcelId: parcel.id,
        tokenId: mintResult.tokenId,
        transactionId: mintResult.transactionId,
        metadata: {
          owner: userAccountId,
          paymentAmount: 10, // USD
          serialNumber: mintResult.serialNumber,
          timestamp: new Date().toISOString()
        },
      }).then(() => {
        logger.debug('🪙 [POST /mint] HCS publication successful');
      }).catch(hcsError => {
        logger.warn('⚠️ [POST /mint] HCS publication failed (non-critical):', hcsError.message);
      });

      logger.info(`✅ [POST /mint] Parcel minted successfully: ${parcel.id} -> Token ${mintResult.tokenId}`);

      // Return success response
      return reply.code(200).send({
        success: true,
        parcel: updatedParcel,
        mintResult: {
          tokenId: mintResult.tokenId,
          transactionId: mintResult.transactionId,
          serialNumber: mintResult.serialNumber,
          paymentTransactionId: mintResult.paymentTransactionId
        },
        message: 'Parcel minted successfully as NFT'
      });

    } catch (dbError) {
      logger.error('❌ [POST /mint] Database update failed:', {
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack
      });

      // If DB update fails but minting succeeded, we have a problem
      // The NFT exists but our DB is inconsistent
      return reply.code(500).send({ 
        error: 'Database update failed after successful minting',
        details: {
          tokenId: mintResult.tokenId,
          transactionId: mintResult.transactionId,
          dbError: dbError.message,
          action: 'Contact support with token ID for manual resolution'
        }
      });
    }

  } catch (error) {
    // Catch-all error handler
    logger.error('❌ [POST /mint] Unexpected error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      userId,
      parcelId,
      userAccountId
    });

    // Don't expose internal errors to client
    return reply.code(500).send({ 
      error: 'An unexpected error occurred during minting',
      details: {
        timestamp: new Date().toISOString(),
        requestId: request.id || 'unknown'
      }
    });
  }
});

  // List parcel for sale
  fastify.post('/:id/list', {
    preHandler: [fastify.authenticate],
    schema: {
      body: listParcelSchemaJson,
    },
  }, async (request) => {
    logger.debug('🏷️ [POST /:id/list] Starting parcel listing');
    
    const userId = (request.user as any).userId;
    const { id: parcelId } = request.params as { id: string };
    const { priceUsd } = request.body as z.infer<typeof listParcelSchema>;

    logger.debug('🏷️ [POST /:id/list] Parameters:', {
      userId,
      parcelId,
      priceUsd
    });

    try {
      logger.debug('🏷️ [POST /:id/list] Verifying parcel ownership and mint status...');
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          ownerId: userId,
          htsTokenId: { not: null },
        },
      });

      if (!parcel) {
        logger.error('❌ [POST /:id/list] Parcel verification failed:', {
          parcelId,
          userId,
          reason: 'not found, not owned, or not minted'
        });
        throw new Error('Parcel not found or not minted');
      }

      logger.debug('🏷️ [POST /:id/list] Parcel verified:', {
        id: parcel.id,
        tokenId: parcel.htsTokenId,
        currentStatus: parcel.status
      });

      logger.debug('🏷️ [POST /:id/list] Updating parcel price and status...');
      const updatedParcel = await prisma.parcel.update({
        where: { id: parcelId },
        data: {
          priceUsd,
          status: 'LISTED',
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
        },
      });

      logger.debug('🏷️ [POST /:id/list] Parcel updated successfully');

      // Log activity
      logger.debug('🏷️ [POST /:id/list] Creating list activity...');
      await prisma.activity.create({
        data: {
          parcelId: parcel.id,
          type: 'LISTED',
          metadata: { priceUsd },
        },
      });
      logger.debug('🏷️ [POST /:id/list] Activity logged');

      // Publish to HCS (Compatible Hedera 2025)
      logger.debug('🏷️ [POST /:id/list] Publishing list event to HCS...');
      try {
        await hederaService.publishToHCS({
          event: 'PARCEL_LISTED',
          parcelId: parcel.id,
          tokenId: parcel.htsTokenId!,
          metadata: { priceUsd },
        });
        logger.debug('🏷️ [POST /:id/list] HCS publication successful');
      } catch (hcsError) {
        logger.warn('⚠️ [POST /:id/list] HCS publication failed:', hcsError);
      }

      logger.info(`✅ [POST /:id/list] Parcel listed successfully: ${parcel.id} for $${priceUsd}`);

      return { parcel: updatedParcel };
    } catch (error) {
      logger.error('❌ [POST /:id/list] Listing error:', error);
      logger.error('❌ [POST /:id/list] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      throw new Error('Failed to list parcel');
    }
  });

  // Buy parcel (Mise à jour pour Hedera 2025)
  fastify.post('/:id/buy', {
    preHandler: [fastify.authenticate],
    schema: {
      body: buyParcelSchemaJson,
    },
  }, async (request) => {
    logger.debug('💰 [POST /:id/buy] Starting parcel purchase');
    
    const userId = (request.user as any).userId;
    const { id: parcelId } = request.params as { id: string };
    const { buyerAccountId } = request.body as z.infer<typeof buyParcelSchema>;

    logger.debug('💰 [POST /:id/buy] Parameters:', {
      userId,
      parcelId,
      buyerAccountId
    });

    try {
      logger.debug('💰 [POST /:id/buy] Finding parcel for sale...');
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          status: 'LISTED',
          htsTokenId: { not: null },
          priceUsd: { not: null },
        },
        include: {
          owner: true,
        },
      });

      if (!parcel) {
        logger.error('❌ [POST /:id/buy] Parcel not available:', {
          parcelId,
          reason: 'not found, not listed, not minted, or no price set'
        });
        throw new Error('Parcel not available for purchase');
      }

      logger.debug('💰 [POST /:id/buy] Parcel found:', {
        id: parcel.id,
        tokenId: parcel.htsTokenId,
        price: parcel.priceUsd,
        currentOwnerId: parcel.ownerId,
        sellerWallet: parcel.owner.walletHedera
      });

      if (parcel.ownerId === userId) {
        logger.error('❌ [POST /:id/buy] Self-purchase attempt:', {
          parcelId,
          ownerId: parcel.ownerId,
          buyerId: userId
        });
        throw new Error('Cannot buy your own parcel');
      }

      // Verify buyer's wallet
      logger.debug('💰 [POST /:id/buy] Verifying buyer wallet...');
      const buyer = await prisma.user.findFirst({
        where: {
          id: userId,
          walletHedera: buyerAccountId,
        },
      });

      if (!buyer) {
        logger.error('❌ [POST /:id/buy] Buyer wallet mismatch:', {
          userId,
          providedWallet: buyerAccountId,
          reason: 'user not found or wallet mismatch'
        });
        throw new Error('Buyer wallet mismatch');
      }

      logger.debug('💰 [POST /:id/buy] Buyer verified:', {
        buyerId: buyer.id,
        buyerWallet: buyer.walletHedera
      });

      // Transfer ownership (Compatible Hedera 2025)
      logger.debug('💰 [POST /:id/buy] Transferring ownership...');
      const updatedParcel = await prisma.parcel.update({
        where: { id: parcelId },
        data: {
          ownerId: userId,
          status: 'SOLD',
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              walletHedera: true,
            },
          },
        },
      });

      logger.debug('💰 [POST /:id/buy] Ownership transferred successfully');

      // Log activity
      logger.debug('💰 [POST /:id/buy] Creating sale activity...');
      await prisma.activity.create({
        data: {
          parcelId: parcel.id,
          type: 'SOLD',
          metadata: { 
            buyerId: userId,
            buyerAccount: buyerAccountId,
            sellerId: parcel.ownerId,
            sellerAccount: parcel.owner.walletHedera,
            priceUsd: parcel.priceUsd,
          },
        },
      });
      logger.debug('💰 [POST /:id/buy] Activity logged');

      // Publish to HCS (Compatible Hedera 2025)
      logger.debug('💰 [POST /:id/buy] Publishing sale event to HCS...');
      try {
        await hederaService.publishToHCS({
          event: 'PARCEL_SOLD',
          parcelId: parcel.id,
          tokenId: parcel.htsTokenId!,
          metadata: {
            buyer: buyerAccountId,
            seller: parcel.owner.walletHedera,
            priceUsd: parcel.priceUsd,
          },
        });
        logger.debug('💰 [POST /:id/buy] HCS publication successful');
      } catch (hcsError) {
        logger.warn('⚠️ [POST /:id/buy] HCS publication failed:', hcsError);
      }

      logger.info(`✅ [POST /:id/buy] Parcel purchased successfully: ${parcel.id} by ${buyerAccountId} for $${parcel.priceUsd}`);

      return { parcel: updatedParcel };
    } catch (error) {
      logger.error('❌ [POST /:id/buy] Purchase error:', error);
      logger.error('❌ [POST /:id/buy] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      throw new Error('Failed to buy parcel: ' + error.message);
    }
  });

  // Get parcel details (Mise à jour pour Hedera 2025)
  // Get parcel details (avec debugging amélioré)
fastify.get('/:id', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  logger.debug('🔎 [GET /:id] Getting parcel details - START');
  
  const { id } = request.params as { id: string };
  const userId = (request.user as any)?.userId;
  
  logger.debug('🔎 [GET /:id] Request params:', { 
    parcelId: id, 
    userId,
    userAgent: request.headers['user-agent'],
    origin: request.headers.origin 
  });

  // Validation de l'ID
  if (!id || id.trim() === '') {
    logger.error('❌ [GET /:id] Invalid parcel ID provided:', { id });
    return reply.code(400).send({ 
      error: 'Invalid parcel ID',
      details: { provided: id }
    });
  }

  try {
    logger.debug('🔎 [GET /:id] Querying database for parcel...');
    
    const parcel = await prisma.parcel.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            walletHedera: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        loans: {
          include: {
            borrower: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    logger.debug('🔎 [GET /:id] Database query completed', {
      found: !!parcel,
      parcelId: parcel?.id,
      title: parcel?.title,
      status: parcel?.status,
      tokenId: parcel?.htsTokenId
    });

    if (!parcel) {
      logger.error('❌ [GET /:id] Parcel not found in database:', { id });
      return reply.code(404).send({ 
        error: 'Parcel not found',
        details: { parcelId: id }
      });
    }

    // Vérification des données essentielles
    if (!parcel.owner) {
      logger.error('❌ [GET /:id] Parcel has no owner:', { parcelId: id });
      return reply.code(500).send({ 
        error: 'Parcel data incomplete - missing owner',
        details: { parcelId: id }
      });
    }

    logger.debug('🔎 [GET /:id] Parcel validation passed');

    // Get token info if minted (avec gestion d'erreur améliorée)
    let tokenInfo = null;
    if (parcel.htsTokenId) {
      logger.debug('🔎 [GET /:id] Fetching token info from Hedera...', {
        tokenId: parcel.htsTokenId
      });
      
      try {
        tokenInfo = await hederaService.getTokenInfo(parcel.htsTokenId);
        logger.debug('🔎 [GET /:id] Token info retrieved successfully');
      } catch (tokenError) {
        logger.warn('⚠️ [GET /:id] Failed to get token info (non-critical):', {
          tokenId: parcel.htsTokenId,
          error: tokenError.message,
          stack: tokenError.stack
        });
        // Ne pas faire échouer toute la requête pour ça
        tokenInfo = { error: 'Token info unavailable' };
      }
    } else {
      logger.debug('🔎 [GET /:id] No token ID - parcel not minted');
    }

    // Construire la réponse
    const response = { 
      parcel: {
        ...parcel,
        // S'assurer que les champs requis sont présents
        activities: parcel.activities || [],
        loans: parcel.loans || []
      }, 
      tokenInfo 
    };

    logger.debug('🔎 [GET /:id] Response prepared:', {
      parcelId: response.parcel.id,
      hasTokenInfo: !!tokenInfo,
      activitiesCount: response.parcel.activities.length,
      loansCount: response.parcel.loans.length
    });

    logger.info(`✅ [GET /:id] Parcel details retrieved successfully: ${id}`);
    return response;

  } catch (error) {
    logger.error('❌ [GET /:id] Unexpected error fetching parcel:', {
      parcelId: id,
      userId,
      error: error.message,
      name: error.name,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    // Réponse d'erreur détaillée pour le debugging
    return reply.code(500).send({ 
      error: 'Failed to fetch parcel details',
      details: {
        parcelId: id,
        timestamp: new Date().toISOString(),
        errorType: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
});
fastify.post('/test-create', async (request, reply) => {
  try {
    const testParcel = await prisma.parcel.create({
      data: {
        title: "Test Parcel",
        latitude: 6.5,
        longitude: 2.6,
        areaM2: 500,
        priceUsd: 50000,
        ownerId: "test-user-id-12345" // ← Change avec un userId réel
      }
    });
    return { success: true, parcel: testParcel };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      meta: error.meta
    };
  }
});
  // Upload parcel documents
 // Upload parcel documents - Version améliorée
/*fastify.post('/:id/documents', {
  preHandler: [fastify.authenticate],
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              filename: { type: 'string' },
              originalName: { type: 'string' },
              url: { type: 'string' },
              size: { type: 'number' },
              type: { type: 'string' },
              uploadedAt: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  logger.debug('📎 [POST /:id/documents] Starting document upload');
  
  const userId = (request.user as any).userId;
  const { id: parcelId } = request.params as { id: string };

  logger.debug('📎 [POST /:id/documents] Parameters:', {
    userId,
    parcelId
  });

  try {
    // Verify ownership
    logger.debug('📎 [POST /:id/documents] Verifying parcel ownership...');
    const parcel = await prisma.parcel.findFirst({
      where: {
        id: parcelId,
        ownerId: userId,
      },
    });

    if (!parcel) {
      logger.error('❌ [POST /:id/documents] Parcel not found or not owned:', {
        parcelId,
        userId
      });
      return reply.code(404).send({ 
        success: false, 
        error: 'Parcel not found' 
      });
    }

    logger.debug('📎 [POST /:id/documents] Ownership verified');

    // Vérifier le nombre de documents existants
    const existingDocs = parcel.docUrl ? parcel.docUrl.split(',').length : 0;
    const maxDocs = 3; // Limiter à 3 documents par parcel

    if (existingDocs >= maxDocs) {
      return reply.code(400).send({
        success: false,
        error: `Maximum ${maxDocs} documents allowed per parcel`
      });
    }

    logger.debug('📎 [POST /:id/documents] Processing uploaded file...');
    const data = await request.file();
    
    if (!data) {
      logger.error('❌ [POST /:id/documents] No file uploaded');
      return reply.code(400).send({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    logger.debug('📎 [POST /:id/documents] File received:', {
      filename: data.filename,
      mimetype: data.mimetype,
      encoding: data.encoding
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(data.mimetype)) {
      logger.error('❌ [POST /:id/documents] Invalid file type:', {
        provided: data.mimetype,
        allowed: allowedTypes
      });
      return reply.code(400).send({ 
        success: false, 
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' 
      });
    }

    logger.debug('📎 [POST /:id/documents] File type validation passed');

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    logger.debug('📎 [POST /:id/documents] Converting file to buffer...');
    const buffer = await data.toBuffer();
    
    logger.debug('📎 [POST /:id/documents] File size:', {
      bytes: buffer.length,
      maxBytes: maxSize,
      valid: buffer.length <= maxSize
    });

    if (buffer.length > maxSize) {
      logger.error('❌ [POST /:id/documents] File too large:', {
        size: buffer.length,
        maxSize
      });
      return reply.code(400).send({ 
        success: false, 
        error: 'File too large. Maximum size: 10MB' 
      });
    }

    // Validation de sécurité supplémentaire pour les images
    if (data.mimetype.startsWith('image/')) {
      // Vérification basique des magic numbers
      const magicNumbers = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
      };

      const magic = magicNumbers[data.mimetype as keyof typeof magicNumbers];
      if (magic && !magic.every((byte, index) => buffer[index] === byte)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid file format'
        });
      }
    }

    // Generate unique filename
    const { nanoid } = await import('nanoid');
    const fileId = nanoid(12); // Plus court mais toujours unique
    const extension = data.filename?.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${fileId}.${extension}`;
    const relativePath = `parcels/${parcelId}/${filename}`;
    const filepath = `uploads/${relativePath}`;

    logger.debug('📎 [POST /:id/documents] Generated file info:', {
      fileId,
      extension,
      filename,
      relativePath,
      filepath
    });

    // Save file
    logger.debug('📎 [POST /:id/documents] Importing filesystem modules...');
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const uploadDir = path.join(process.cwd(), 'uploads', 'parcels', parcelId);
    logger.debug('📎 [POST /:id/documents] Creating upload directory:', uploadDir);
    
    await fs.mkdir(uploadDir, { recursive: true });
    logger.debug('📎 [POST /:id/documents] Upload directory created');
    
    const fullPath = path.join(uploadDir, filename);
    logger.debug('📎 [POST /:id/documents] Writing file to:', fullPath);
    await fs.writeFile(fullPath, buffer);
    logger.debug('📎 [POST /:id/documents] File saved successfully');

    // Update parcel with document URL - URL corrigée
    const docUrl = `/api/files/uploads/${relativePath}`;
    logger.debug('📎 [POST /:id/documents] Updating parcel with document URL...', {
      docUrl,
      currentDocUrl: parcel.docUrl
    });

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        docUrl: parcel.docUrl ? `${parcel.docUrl},${docUrl}` : docUrl,
      },
    });

    logger.debug('📎 [POST /:id/documents] Parcel updated with document URL');
    logger.info(`✅ [POST /:id/documents] Document uploaded successfully for parcel ${parcelId}: ${filename}`);

    const response = { 
      success: true,
      data: {
        id: fileId,
        filename,
        originalName: data.filename || 'unknown',
        url: docUrl,
        size: buffer.length,
        type: data.mimetype,
        uploadedAt: new Date().toISOString(),
      }
    };

    logger.debug('📎 [POST /:id/documents] Returning response:', response);
    return response;
  } catch (error) {
    logger.error('❌ [POST /:id/documents] Upload document error:', error);
    logger.error('❌ [POST /:id/documents] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to upload document' 
    });
  }
});


*/

  // Get user's parcels
  fastify.get('/my/parcels', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    logger.debug('👤 [GET /my/parcels] Getting user parcels');
    
    const userId = (request.user as any).userId;
    logger.debug('👤 [GET /my/parcels] User ID:', userId);

    try {
      logger.debug('👤 [GET /my/parcels] Querying user parcels...');
      const parcels = await prisma.parcel.findMany({
        where: { ownerId: userId },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          loans: {
            where: { status: 'ACTIVE' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      logger.debug('👤 [GET /my/parcels] User parcels found:', {
        count: parcels.length,
        parcelIds: parcels.map(p => p.id),
        statuses: parcels.map(p => ({ id: p.id, status: p.status }))
      });

      // Log detailed info for each parcel
      parcels.forEach((parcel, index) => {
        logger.debug(`👤 [GET /my/parcels] Parcel ${index + 1}:`, {
          id: parcel.id,
          title: parcel.title,
          status: parcel.status,
          tokenId: parcel.htsTokenId,
          activitiesCount: parcel.activities.length,
          activeLoansCount: parcel.loans.length,
          priceUsd: parcel.priceUsd,
          areaM2: parcel.areaM2
        });
      });

      logger.info(`✅ [GET /my/parcels] Retrieved ${parcels.length} parcels for user ${userId}`);
      return { parcels };
    } catch (error) {
      logger.error('❌ [GET /my/parcels] Get user parcels error:', error);
      logger.error('❌ [GET /my/parcels] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      throw new Error('Failed to fetch user parcels');
    }
  });

  // Additional debug route for troubleshooting
  fastify.get('/debug/health', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    logger.debug('🏥 [GET /debug/health] Health check started');
    
    const userId = (request.user as any).userId;
    logger.debug('🏥 [GET /debug/health] User ID:', userId);

    try {
      // Test database connection
      logger.debug('🏥 [GET /debug/health] Testing database connection...');
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
      logger.debug('🏥 [GET /debug/health] Database test result:', dbTest);

      // Test user existence
      logger.debug('🏥 [GET /debug/health] Testing user existence...');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          walletHedera: true,
          createdAt: true
        }
      });
      logger.debug('🏥 [GET /debug/health] User found:', user);

      // Count user's parcels by status
      logger.debug('🏥 [GET /debug/health] Counting parcels by status...');
      const parcelCounts = await prisma.parcel.groupBy({
        by: ['status'],
        where: { ownerId: userId },
        _count: true,
      });
      logger.debug('🏥 [GET /debug/health] Parcel counts:', parcelCounts);

      // Test Hedera service health
      logger.debug('🏥 [GET /debug/health] Testing Hedera service...');
      let hederaHealth = null;
      try {
        // This assumes your Hedera service has a health check method
        if (hederaService.healthCheck) {
          hederaHealth = await hederaService.healthCheck();
        } else {
          hederaHealth = 'Health check method not available';
        }
        logger.debug('🏥 [GET /debug/health] Hedera health:', hederaHealth);
      } catch (hederaError) {
        logger.warn('⚠️ [GET /debug/health] Hedera health check failed:', hederaError);
        hederaHealth = { error: hederaError.message };
      }

      const healthStatus = {
        timestamp: new Date().toISOString(),
        database: 'connected',
        user: user ? 'found' : 'not found',
        userDetails: user,
        parcelCounts,
        hederaService: hederaHealth,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasHederaConfig: !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY)
        }
      };

      logger.info(' [GET /debug/health] Health check completed successfully');
      return healthStatus;
    } catch (error) {
      logger.error(' [GET /debug/health] Health check failed:', error);
      logger.error(' [GET /debug/health] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message,
        details: {
          code: error.code,
          meta: error.meta
        }
      };
    }
  });

  logger.info(' Parcel routes registered with debug logging enabled');
}