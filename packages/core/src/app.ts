import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { loadConfig } from './config/loader';
import { loadPlugins } from './store/plugin-loader';
import type { StorePlugins } from './store/interface';
import { errorHandler } from './middleware/errorHandler';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register global error handler
fastify.setErrorHandler(errorHandler);

let storePlugins: StorePlugins = {};

async function main() {
  const config = await loadConfig();
  
  // Load store plugins
  try {
    storePlugins = await loadPlugins(config.store);
  } catch (err) {
    fastify.log.error(err, 'Failed to load plugins');
    process.exit(1);
  }
  
  // Register CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Register API routes
  await fastify.register(import('./routes/traces'), { prefix: '/api' });
  await fastify.register(import('./routes/services'), { prefix: '/api' });
  await fastify.register(import('./routes/errors'), { prefix: '/api' });
  await fastify.register(import('./routes/slow'), { prefix: '/api' });
  await fastify.register(import('./routes/settings'), { prefix: '/api' });
  await fastify.register(import('./routes/metadata'), { prefix: '/api' });
  
  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }));
  
  // Serve frontend static files (in production)
  if (process.env.NODE_ENV === 'production') {
    await fastify.register(staticPlugin, {
      root: new URL('../frontend/dist', import.meta.url).pathname,
      prefix: '/',
    });
  }
  
  // Start server
  await fastify.listen({ port: config.server.port, host: config.server.host });
  console.log(`Lucia server running at http://${config.server.host}:${config.server.port}`);
}

main().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});

export { fastify, storePlugins };
