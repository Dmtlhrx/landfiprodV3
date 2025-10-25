import { FastifyInstance } from 'fastify';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function userRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          walletHedera: true,
          role: true,
          did: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return { user };
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw new Error('Failed to fetch user profile');
    }
  });

  // Link Hedera wallet
  fastify.post('/wallet/link', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;
    const { accountId } = request.body as { accountId: string };

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { walletHedera: accountId },
        select: {
          id: true,
          email: true,
          displayName: true,
          walletHedera: true,
          role: true,
          did: true,
          createdAt: true,
        },
      });

      logger.info(`Wallet linked: ${accountId} to user ${userId}`);

      return { user };
    } catch (error) {
      logger.error('Link wallet error:', error);
      throw new Error('Failed to link wallet');
    }
  });

  // Get activity feed
  fastify.get('/activity', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = (request.user as any).userId;

    try {
      const activities = await prisma.activity.findMany({
        where: {
          parcel: {
            ownerId: userId,
          },
        },
        include: {
          parcel: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return { activities };
    } catch (error) {
      logger.error('Get activities error:', error);
      throw new Error('Failed to fetch activities');
    }
  });
}