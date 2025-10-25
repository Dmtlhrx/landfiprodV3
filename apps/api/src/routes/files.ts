import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

export async function fileRoutes(fastify: FastifyInstance) {
  // Serve uploaded files - Route corrigée pour correspondre à l'URL générée
  fastify.get('/files/uploads/*', async (request, reply) => {
    try {
      const filePath = (request.params as any)['*'];
      const fullPath = path.join(process.cwd(), 'uploads', filePath);
      
      // Sécurité : empêcher la traversée de répertoires
      const normalizedPath = path.normalize(fullPath);
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!normalizedPath.startsWith(uploadsDir)) {
        logger.warn('Tentative d\'accès non autorisé:', normalizedPath);
        return reply.code(403).send({ error: 'Accès interdit' });
      }
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        logger.debug('Fichier non trouvé:', fullPath);
        return reply.code(404).send({ error: 'File not found' });
      }

      // Get file stats
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return reply.code(404).send({ error: 'File not found' });
      }

      // Set appropriate content type
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      // Headers de sécurité et performance
      reply.headers({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': ext === '.pdf' ? 'inline' : 'attachment',
        'Last-Modified': stats.mtime.toUTCString(),
        'ETag': `"${stats.size}-${stats.mtime.getTime()}"`,
      });

      // Vérifier If-None-Match pour ETag
      const ifNoneMatch = request.headers['if-none-match'];
      const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
      if (ifNoneMatch === etag) {
        return reply.code(304).send();
      }
      
      // Stream file pour de meilleures performances
      const fileStream = await fs.readFile(fullPath);
      
      return reply.send(fileStream);
        
    } catch (error) {
      logger.error('File serve error:', error);
      return reply.code(500).send({ error: 'Failed to serve file' });
    }
  });

  // Route pour les anciens liens (rétrocompatibilité)
  fastify.get('/uploads/*', async (request, reply) => {
    const filePath = (request.params as any)['*'];
    return reply.redirect(301, `/api/files/uploads/${filePath}`);
  });
}