import 'dotenv/config';
import Fastify from 'fastify';
import { setupDatabase } from './config/database.js';
import { setupPlugins } from './config/plugins.js';
import { setupRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';
import { validateEnv } from './utils/env.js';

async function start() {
  logger.info('🚀 Starting server initialization...');

  try {
    // Étape 1: Vérification des variables d'environnement
    logger.info('🔹 Validating environment variables...');
    validateEnv();

    // Étape 2: Création de l'instance Fastify
    const fastify = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  ignore: 'pid,hostname',
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
        formatters: {
          level: (label) => ({ level: label }),
        },
      },
    });

    // Étape 3: Connexion à la base de données
    logger.info('🔹 Connecting to database...');
    await setupDatabase();
    logger.info('✅ Database connected successfully');

    // Étape 4: Initialisation des plugins
    logger.info('🔹 Setting up plugins...');
    await setupPlugins(fastify);
    logger.info('✅ Plugins initialized');

    // Étape 5: Enregistrement des routes
    logger.info('🔹 Setting up routes...');
    await setupRoutes(fastify);
    logger.info('✅ Routes registered');

    // Étape 6: Route de test (health check)
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Étape 7: Démarrage du serveur
    const PORT = Number(process.env.PORT) || 3001;
    const HOST = process.env.HOST || '127.0.0.1';

    logger.info(`🔹 Attempting to start server on http://${HOST}:${PORT}...`);
    await fastify.listen({ port: PORT, host: HOST });

    logger.info(`✅ Server running at http://${HOST}:${PORT}`);
  } catch (err: any) {
    // Affiche maintenant le message complet et la stack pour identifier l'erreur
    logger.error('❌ Server failed to start:');
    logger.error(err?.message || err);
    logger.error(err?.stack || '');
    process.exit(1);
  }
}

start();
