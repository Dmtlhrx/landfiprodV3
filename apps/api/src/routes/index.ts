import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { parcelRoutes } from './parcels.js';
import { p2pLoanRoutes } from './p2p-loans.js';
import { expressLoanRoutes } from './express-loans.js';
import { verificationRoutes } from './verification.js';
import { chatRoutes } from './chat.js';
import { documentRoutes } from './documents.js';
import { userRoutes } from './users.js';
import { fileRoutes } from './files.js';
import { paymentRoutes } from './payments.js';
import { healthRoutes } from './health.js';
import { aiVerificationRoutes } from './aiVerification.js';

export async function setupRoutes(fastify: FastifyInstance) {
  // Health check routes (root level - no auth)
  
  // File serving (no auth required for public files)
  await fastify.register(fileRoutes);
  
  // API prefix
  await fastify.register(async function (fastify) {
    // Auth routes (no prefix)
    await fastify.register(authRoutes, { prefix: '/auth' });
    
    // Protected routes
    await fastify.register(parcelRoutes, { prefix: '/parcels' });
    await fastify.register(documentRoutes);
    await fastify.register(p2pLoanRoutes, { prefix: '/p2p-loans' });
    await fastify.register(userRoutes, { prefix: '/users' });
    await fastify.register(paymentRoutes, { prefix: '/payment' });
    await fastify.register(expressLoanRoutes, { prefix: '/express-loans' });
    await fastify.register(verificationRoutes, { prefix: '/verification' });
    await fastify.register(chatRoutes, { prefix: '/chat' });
    await fastify.register(aiVerificationRoutes, { prefix: '/ai' });

    console.log('Routes disponibles:');
    console.log('- GET  / (health check)');
    console.log('- GET  /health');
    console.log('- GET  /api/health');
    console.log('- POST /api/auth/register');
    console.log('- POST /api/auth/login');
    console.log('- GET  /api/parcels');
    console.log('- GET  /api/payment/exchange-rate');
    console.log('- GET  /api/payment/check-balance/:userAccountId');
    console.log('- POST /api/payment/create-payment');
    console.log('- POST /api/payment/verify-payment');
    console.log('- POST /api/payment/can-pay');
  }, { prefix: '/api' });
}