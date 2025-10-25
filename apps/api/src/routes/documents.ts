import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

export async function documentRoutes(fastify: FastifyInstance) {
  // Apply authentication to all routes in this plugin
  fastify.addHook('preHandler', authMiddleware);

  // Upload document pour un colis
  fastify.post('/parcels/:parcelId/documents', async (request, reply) => {
    try {
      const { parcelId } = request.params as { parcelId: string };
      
      // At this point, authMiddleware has already verified the user
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const { userId } = request.user;

      // Vérifier que le colis existe et appartient à l'utilisateur
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          ownerId: userId,
        },
      });

      if (!parcel) {
        return reply.code(404).send({
          success: false,
          error: 'Parcel not found or access denied',
        });
      }

      // Récupérer le fichier uploadé
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Valider le type de fichier
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
      ];

      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF',
        });
      }

      // Valider la taille (10MB max)
      const fileBuffer = await data.toBuffer();
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (fileBuffer.length > maxSize) {
        return reply.code(400).send({
          success: false,
          error: 'File too large. Maximum size: 10MB',
        });
      }

      // Créer le dossier uploads s'il n'existe pas
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const ext = path.extname(data.filename);
      const filename = `${parcelId}-${timestamp}-${randomString}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      // Sauvegarder le fichier
      await fs.writeFile(filePath, fileBuffer);

      // Créer l'enregistrement en base de données
      const document = await prisma.document.create({
        data: {
          filename: filename,
          originalName: data.filename,
          type: data.mimetype,
          size: fileBuffer.length,
          url: `/api/files/uploads/documents/${filename}`,
          parcelId: parcelId,
        },
      });

      logger.info(`Document uploaded: ${filename} for parcel ${parcelId}`);

      return reply.code(201).send({
        success: true,
        data: {
          id: document.id,
          filename: document.filename,
          originalName: document.originalName,
          type: document.type,
          size: document.size,
          url: document.url,
        },
      });

    } catch (error) {
      logger.error('Document upload error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Récupérer les documents d'un colis
  fastify.get('/parcels/:parcelId/documents', async (request, reply) => {
    try {
      const { parcelId } = request.params as { parcelId: string };
      
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const { userId } = request.user;

      // Vérifier l'accès
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          ownerId: userId,
        },
      });

      if (!parcel) {
        return reply.code(404).send({
          success: false,
          error: 'Parcel not found or access denied',
        });
      }

      // Récupérer les documents
      const documents = await prisma.document.findMany({
        where: { parcelId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: documents,
      });

    } catch (error) {
      logger.error('Get documents error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get documents',
      });
    }
  });

  // Supprimer un document
  fastify.delete('/parcels/:parcelId/documents/:documentId', async (request, reply) => {
    try {
      const { parcelId, documentId } = request.params as { 
        parcelId: string; 
        documentId: string; 
      };
      
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const { userId } = request.user;

      // Vérifier l'accès
      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          ownerId: userId,
        },
      });

      if (!parcel) {
        return reply.code(404).send({
          success: false,
          error: 'Parcel not found or access denied',
        });
      }

      // Récupérer le document
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          parcelId: parcelId,
        },
      });

      if (!document) {
        return reply.code(404).send({
          success: false,
          error: 'Document not found',
        });
      }

      // Supprimer le fichier physique
      const filePath = path.join(
        process.cwd(), 
        'uploads', 
        'documents', 
        document.filename
      );

      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete file: ${filePath}`, error);
      }

      // Supprimer l'enregistrement
      await prisma.document.delete({
        where: { id: documentId },
      });

      logger.info(`Document deleted: ${document.filename}`);

      return reply.send({
        success: true,
        message: 'Document deleted successfully',
      });

    } catch (error) {
      logger.error('Delete document error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete document',
      });
    }
  });
}