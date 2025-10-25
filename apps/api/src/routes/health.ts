import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Root health check
  fastify.get('/', async () => {
    return {
      status: 'ok',
      service: 'LandFi API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health or /api/health',
        api: '/api/*',
        docs: 'https://github.com/Dmtlhrx/lanfi'
      }
    };
  });

  // Health endpoint (root level)
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'LandFi API',
      database: 'connected',
      hedera: 'connected',
      timestamp: new Date().toISOString(),
    };
  });
}