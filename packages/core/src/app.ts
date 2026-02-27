import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { loadConfig } from './config/loader';
import { loadPlugins } from './store/plugin-loader';
import type { StorePlugins } from './store/interface';

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

let storePlugins: StorePlugins = {};

async function main() {
  const config = await loadConfig();
  
  // Load store plugins
  storePlugins = await loadPlugins(config.store);
  
  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });
  
  // Register API routes
  await fastify.register(import('./routes/traces'), { prefix: '/api' });
  await fastify.register(import('./routes/services'), { prefix: '/api' });
  await fastify.register(import('./routes/errors'), { prefix: '/api' });
  await fastify.register(import('./routes/slow'), { prefix: '/api' });
  
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
