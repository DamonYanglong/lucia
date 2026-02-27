import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import type { SlowQuery } from '../types';

const slowRoutes: FastifyPluginAsync = async (fastify) => {
  // Get slow calls
  fastify.get('/slow', async (request, reply) => {
    const query = request.query as SlowQuery;
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const slowCalls = await storePlugins.trace.getSlowCalls({
      service: query.service,
      startTime: query.startTime,
      endTime: query.endTime,
      limit: query.limit || 100,
    });
    
    return { code: 0, data: slowCalls };
  });
};

export default slowRoutes;
