import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

export async function setupDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
      });
    }

    // Log errors and warnings
    prisma.$on('error', (e) => {
      logger.error('Prisma error:', e);
    });

    prisma.$on('warn', (e) => {
      logger.warn('Prisma warning:', e);
    });

  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}