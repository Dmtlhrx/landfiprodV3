import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import path from 'path';

export async function setupPlugins(fastify: FastifyInstance) {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 10000,
    timeWindow: '1 minute',
  
    errorResponseBuilder: (_req, _context) => {
      // Ici tu peux mettre la réponse que tu veux
      return {
        statusCode: 200, // au lieu de 429
        message: ""      // vide
      };
    }
  });
  


  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // JWT verification decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // File upload support
  await fastify.register(multipart, {
    limits: {
      fileSize: 10000 * 1024 * 1024, // 10MB
      files: 3, // Max 3 files
    },
  });

  // Static file serving
  await fastify.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/api/files/',
  });

  
}