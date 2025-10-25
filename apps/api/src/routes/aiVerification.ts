// routes/aiVerification.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../config/database.js';
import { aiVerificationService } from '../services/aiVerification.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

// Helper pour déterminer le niveau de risque (identique à documentRoutes)
function calculateRiskLevel(confidenceScore: number, manipulationDetected: boolean): {
  riskLevel: string;
  riskScore: number;
  verificationStatus: string;
} {
  let riskScore = 100 - confidenceScore;
  
  if (manipulationDetected) {
    riskScore = Math.max(riskScore, 70);
  }
  
  let riskLevel = 'UNKNOWN';
  let verificationStatus = 'VERIFIED';
  
  if (riskScore <= 20) {
    riskLevel = 'VERY_LOW';
  } else if (riskScore <= 40) {
    riskLevel = 'LOW';
  } else if (riskScore <= 60) {
    riskLevel = 'MEDIUM';
  } else if (riskScore <= 80) {
    riskLevel = 'HIGH';
    verificationStatus = 'SUSPICIOUS';
  } else {
    riskLevel = 'CRITICAL';
    verificationStatus = 'SUSPICIOUS';
  }
  
  return { riskLevel, riskScore, verificationStatus };
}

export async function aiVerificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  /**
   * Vérifier un document avec l'IA
   * POST /api/ai/verify-document
   */
  fastify.post('/verify-document', async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const userId = request.user.userId;

      // Récupérer le fichier uploadé
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      const fileBuffer = await data.toBuffer();
      const filename = data.filename;
      const mimeType = data.mimetype;

      // Récupérer le documentId si fourni - FIX: Vérifier le type correct
      let documentId: string | undefined;
      if (data.fields && 'documentId' in data.fields) {
        const field = data.fields.documentId;
        if (!Array.isArray(field) && 'value' in field) {
          documentId = field.value as string;
        }
      }

      logger.info(`🤖 AI verification requested by user ${userId} for: ${filename}`);

      // Lancer la vérification IA
      const verificationResult = await aiVerificationService.verifyDocument(
        fileBuffer,
        filename,
        mimeType
      );

      const { riskLevel, riskScore, verificationStatus } = calculateRiskLevel(
        verificationResult.confidenceScore,
        verificationResult.manipulationDetected
      );

      // Enregistrer dans les logs AI (similaire à documentRoutes)
      const aiLog = await prisma.aIVerificationLog.create({
        data: {
          documentId: documentId || null,
          userId: userId,
          isAuthentic: verificationResult.isAuthentic,
          confidenceScore: verificationResult.confidenceScore,
          manipulationDetected: verificationResult.manipulationDetected,
          findings: verificationResult.findings as any,
          risks: verificationResult.risks as any,
          extractedData: verificationResult.extractedData as any,
          technicalDetails: verificationResult.technicalDetails as any,
          filename: filename,
          fileSize: fileBuffer.length,
          mimeType: mimeType,
        },
      });

      // Mettre à jour le document si documentId fourni
      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            aiVerification: verificationResult as any,
            verifiedAt: new Date(),
            isAuthentic: verificationResult.isAuthentic,
            confidenceScore: verificationResult.confidenceScore,
            manipulationDetected: verificationResult.manipulationDetected,
            verificationStatus: verificationStatus as any,
            riskLevel: riskLevel as any,
            riskScore: riskScore,
            findings: verificationResult.findings as any,
            extractedEntities: verificationResult.extractedEntities as any,
          },
        });

        logger.info(`✅ AI verification saved for document ${documentId}: ${verificationStatus} (${riskScore}% risk)`);
      }

      return reply.send({
        success: true,
        data: {
          verificationId: aiLog.id,
          ...verificationResult,
          verificationStatus,
          riskLevel,
          riskScore,
        },
      });

    } catch (error) {
      logger.error('AI verification route error:', error);
      return reply.code(500).send({
        success: false,
        error: 'AI verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Récupérer l'historique des vérifications IA
   * GET /api/ai/verifications
   */
  fastify.get('/verifications', async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const userId = request.user.userId;

      const verifications = await prisma.aIVerificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          documentId: true,
          isAuthentic: true,
          confidenceScore: true,
          manipulationDetected: true,
          findings: true,
          filename: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      });

      return reply.send({
        success: true,
        data: verifications,
      });

    } catch (error) {
      logger.error('Get verifications error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch verifications',
      });
    }
  });

  /**
   * Détails d'une vérification spécifique
   * GET /api/ai/verifications/:verificationId
   */
  fastify.get('/verifications/:verificationId', async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const userId = request.user.userId;
      const { verificationId } = request.params as { verificationId: string };

      const verification = await prisma.aIVerificationLog.findFirst({
        where: {
          id: verificationId,
          userId: userId,
        },
      });

      if (!verification) {
        return reply.code(404).send({
          success: false,
          error: 'Verification not found',
        });
      }

      return reply.send({
        success: true,
        data: verification,
      });

    } catch (error) {
      logger.error('Get verification details error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get verification details',
      });
    }
  });

  /**
   * Stats globales des vérifications IA
   * GET /api/ai/stats
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const userId = request.user.userId;

      // Stats personnelles de l'utilisateur
      const userVerifications = await prisma.aIVerificationLog.findMany({
        where: { userId },
        select: {
          isAuthentic: true,
          confidenceScore: true,
          manipulationDetected: true,
        },
      });

      const totalVerifications = userVerifications.length;
      const authenticCount = userVerifications.filter(v => v.isAuthentic === true).length;
      const manipulatedCount = userVerifications.filter(v => v.manipulationDetected === true).length;

      const avgConfidence = totalVerifications > 0
        ? userVerifications.reduce((sum, v) => sum + v.confidenceScore, 0) / totalVerifications
        : 0;

      // Stats globales (admin seulement)
      let globalStats = null;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (user?.role === 'ADMIN') {
        const allVerifications = await prisma.aIVerificationLog.findMany({
          select: {
            isAuthentic: true,
            manipulationDetected: true,
          },
        });

        globalStats = {
          totalVerifications: allVerifications.length,
          authenticDocuments: allVerifications.filter(v => v.isAuthentic === true).length,
          manipulatedDocuments: allVerifications.filter(v => v.manipulationDetected === true).length,
        };
      }

      return reply.send({
        success: true,
        data: {
          userStats: {
            totalVerifications,
            authenticDocuments: authenticCount,
            manipulatedDocuments: manipulatedCount,
            suspiciousDocuments: totalVerifications - authenticCount,
            averageConfidence: Math.round(avgConfidence),
            authenticationRate: totalVerifications > 0 
              ? Math.round((authenticCount / totalVerifications) * 100) 
              : 0,
          },
          globalStats,
        },
      });

    } catch (error) {
      logger.error('Get AI stats error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch AI stats',
      });
    }
  });

  /**
   * Ré-analyser un document existant
   * POST /api/ai/re-verify/:documentId
   */
  fastify.post('/re-verify/:documentId', async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }

      const userId = request.user.userId;
      const { documentId } = request.params as { documentId: string };

      // Récupérer le document
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { parcel: true },
      });

      if (!document) {
        return reply.code(404).send({
          success: false,
          error: 'Document not found',
        });
      }

      // Vérifier les permissions
      if (document.parcel.ownerId !== userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'ADMIN') {
          return reply.code(403).send({
            success: false,
            error: 'Unauthorized',
          });
        }
      }

      // Marquer comme en cours de re-vérification
      await prisma.document.update({
        where: { id: documentId },
        data: {
          verificationStatus: 'PROCESSING',
        },
      });

      logger.info(`🔄 Re-verification scheduled for document ${documentId}`);

      return reply.send({
        success: true,
        message: 'Re-verification scheduled. The document will be re-analyzed shortly.',
        documentId: documentId,
        status: 'PROCESSING',
      });

    } catch (error) {
      logger.error('Re-verify error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to re-verify document',
      });
    }
  });
}
// Enregistrer les routes dans l'application principale
// Dans votre server.ts ou app.ts:
// import { aiVerificationRoutes } from './routes/aiVerification.js';
// app.register(aiVerificationRoutes, { prefix: '/api/ai' });