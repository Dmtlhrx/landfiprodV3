import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hederaService } from '../services/hedera.js';
import { logger } from '../utils/logger.js';

const submitVerificationSchema = z.object({
  parcelId: z.string(),
  verificationType: z.enum(['NOTARY', 'STATE', 'COMMUNITY']),
  documents: z.array(z.string()),
  notaryInfo: z.object({
    name: z.string().optional(),
    license: z.string().optional(),
    contact: z.string().optional(),
  }).optional(),
  stateOffice: z.object({
    department: z.string().optional(),
    referenceNumber: z.string().optional(),
    officerName: z.string().optional(),
  }).optional(),
  communityWitnesses: z.array(z.object({
    name: z.string(),
    contact: z.string(),
    relationship: z.string(),
  })).optional(),
});

const voteSchema = z.object({
  verificationId: z.string(),
  vote: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
});

interface ActivityMetadata {
  verificationType?: string;
  documents?: string[];
  confidence?: number;
  status?: string;
  [key: string]: any;
}

export async function verificationRoutes(fastify: FastifyInstance) {
  // Get user's verification requests
  fastify.get('/requests', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;

    try {
      const parcels = await prisma.parcel.findMany({
        where: { 
          ownerId: userId,
          verificationType: 'UNVERIFIED',
        },
        include: {
          activities: {
            where: { type: 'VERIFICATION_SUBMITTED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const requests = parcels
        .filter(p => p.activities.length > 0)
        .map(parcel => {
          const metadata = parcel.activities[0]?.metadata as ActivityMetadata | null;
          return {
            id: `ver_${parcel.id}`,
            parcelId: parcel.id,
            parcel,
            type: metadata?.verificationType || 'COMMUNITY',
            status: metadata?.status || 'PENDING',
            submittedAt: parcel.activities[0]?.createdAt,
            documents: metadata?.documents || [],
            confidence: metadata?.confidence,
          };
        });

      return { requests };
    } catch (error) {
      logger.error('Get verification requests error:', error);
      throw new Error('Failed to fetch verification requests');
    }
  });

  // Get all pending verifications for community voting
  fastify.get('/pending', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    try {
      const parcels = await prisma.parcel.findMany({
        where: { 
          verificationType: 'UNVERIFIED',
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
              reputationScore: true,
            },
          },
          activities: {
            where: { 
              type: 'VERIFICATION_SUBMITTED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const pendingRequests = parcels
        .filter(p => p.activities.length > 0)
        .map(parcel => {
          const metadata = parcel.activities[0]?.metadata as ActivityMetadata | null;
          const status = metadata?.status || 'PENDING';
          
          // Only show PENDING requests for voting
          if (status !== 'PENDING') return null;

          return {
            id: `ver_${parcel.id}`,
            parcelId: parcel.id,
            parcel,
            owner: parcel.owner,
            type: metadata?.verificationType || 'COMMUNITY',
            status,
            submittedAt: parcel.activities[0]?.createdAt,
            documents: metadata?.documents || [],
            confidence: metadata?.confidence,
            votes: metadata?.votes || { approve: 0, reject: 0 },
          };
        })
        .filter(Boolean);

      return { requests: pendingRequests };
    } catch (error) {
      logger.error('Get pending verifications error:', error);
      throw new Error('Failed to fetch pending verifications');
    }
  });

  // Submit verification request (NO AUTO-APPROVAL)
  fastify.post('/submit', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    
    const validationResult = submitVerificationSchema.safeParse(request.body);
    
    if (!validationResult.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const data = validationResult.data;

    try {
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: data.parcelId,
          ownerId: userId,
          verificationType: 'UNVERIFIED',
        },
      });

      if (!parcel) {
        throw new Error('Parcel not found or already verified');
      }

      // Calculate confidence score
      let confidence = 50;
      
      if (data.verificationType === 'STATE') {
        confidence = 95;
      } else if (data.verificationType === 'NOTARY') {
        confidence = 85;
      } else if (data.verificationType === 'COMMUNITY') {
        confidence = 65;
      }

      confidence += Math.min(data.documents.length * 5, 20);

      const verificationDetails = {
        type: data.verificationType,
        confidence: Math.min(confidence, 100),
        riskAssessment: confidence >= 80 ? 'LOW' : confidence >= 60 ? 'MEDIUM' : 'HIGH',
        submittedAt: new Date().toISOString(),
        documents: data.documents,
        status: 'PENDING',
        votes: { approve: 0, reject: 0 },
        additionalInfo: {
          notaryInfo: data.notaryInfo,
          stateOffice: data.stateOffice,
          communityWitnesses: data.communityWitnesses,
        },
      };

      // Update parcel with verification details (but NOT verified yet)
      await prisma.parcel.update({
        where: { id: data.parcelId },
        data: {
          verificationDetails,
          riskAssessment: verificationDetails.riskAssessment as any,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          parcelId: data.parcelId,
          type: 'VERIFICATION_SUBMITTED',
          metadata: {
            verificationType: data.verificationType,
            confidence,
            status: 'PENDING',
            documents: data.documents,
            votes: { approve: 0, reject: 0 },
          },
        },
      });

      // Publish to HCS
      await hederaService.publishToHCS({
        event: 'VERIFICATION_SUBMITTED',
        parcelId: data.parcelId,
        tokenId: parcel.htsTokenId!,
        metadata: {
          verificationType: data.verificationType,
          confidence,
          status: 'PENDING',
        },
      });

      logger.info(`Verification submitted for review: ${data.parcelId}`);

      return { 
        request: {
          id: `ver_${data.parcelId}`,
          status: 'PENDING',
          confidence,
          message: 'Verification request submitted. Awaiting admin/community approval.',
        },
      };
    } catch (error) {
      logger.error('Submit verification error:', error);
      throw new Error('Failed to submit verification: ' + error.message);
    }
  });

  // Community vote on verification
  fastify.post('/vote', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    
    const validationResult = voteSchema.safeParse(request.body);
    
    if (!validationResult.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const { verificationId, vote, comment } = validationResult.data;
    const parcelId = verificationId.replace('ver_', '');

    try {
      const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
        include: {
          activities: {
            where: { type: 'VERIFICATION_SUBMITTED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!parcel || parcel.activities.length === 0) {
        throw new Error('Verification request not found');
      }

      // Cannot vote on own parcel
      if (parcel.ownerId === userId) {
        throw new Error('Cannot vote on your own verification request');
      }

      const metadata = parcel.activities[0].metadata as ActivityMetadata;
      const votes = metadata.votes || { approve: 0, reject: 0 };

      // Update vote count
      if (vote === 'APPROVE') {
        votes.approve = (votes.approve || 0) + 1;
      } else {
        votes.reject = (votes.reject || 0) + 1;
      }

      // Update activity metadata
      await prisma.activity.update({
        where: { id: parcel.activities[0].id },
        data: {
          metadata: {
            ...metadata,
            votes,
          },
        },
      });

      // Log vote activity
      await prisma.activity.create({
        data: {
          parcelId: parcel.id,
          type: 'VERIFICATION_VOTE',
          metadata: {
            voterId: userId,
            vote,
            comment,
            timestamp: new Date().toISOString(),
          },
        },
      });

      logger.info(`Vote recorded for verification ${verificationId}: ${vote}`);

      return { 
        success: true,
        votes,
        message: 'Vote recorded successfully',
      };
    } catch (error) {
      logger.error('Vote error:', error);
      throw new Error('Failed to record vote: ' + error.message);
    }
  });

  // Admin approve/reject verification
  fastify.post('/admin/review', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).userId;
    
    // Check if user is admin - use role field instead of isAdmin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Unauthorized. Admin access required.' });
    }

    const { verificationId, action, reason } = request.body as any;
    const parcelId = verificationId.replace('ver_', '');

    try {
      const parcel = await prisma.parcel.findUnique({
        where: { id: parcelId },
      });

      if (!parcel) {
        throw new Error('Parcel not found');
      }

      if (action === 'APPROVE') {
        // Approve verification
        await prisma.parcel.update({
          where: { id: parcelId },
          data: {
            verificationType: 'VERIFIED',
          },
        });

        // Update owner reputation
        await prisma.user.update({
          where: { id: parcel.ownerId },
          data: {
            reputationScore: { increment: 20 },
            verifiedTransactions: { increment: 1 },
          },
        });

        // Log approval
        await prisma.activity.create({
          data: {
            parcelId,
            type: 'VERIFICATION_APPROVED',
            metadata: {
              adminId: userId,
              reason,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Publish to HCS
        await hederaService.publishToHCS({
          event: 'PARCEL_VERIFIED',
          parcelId,
          tokenId: parcel.htsTokenId!,
          metadata: {
            approvedBy: 'ADMIN',
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        // Reject verification
        await prisma.activity.create({
          data: {
            parcelId,
            type: 'VERIFICATION_REJECTED',
            metadata: {
              adminId: userId,
              reason,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }

      logger.info(`Verification ${action.toLowerCase()} by admin for parcel ${parcelId}`);

      return { 
        success: true,
        message: `Verification ${action.toLowerCase()} successfully`,
      };
    } catch (error) {
      logger.error('Admin review error:', error);
      throw new Error('Failed to review verification: ' + error.message);
    }
  });
}