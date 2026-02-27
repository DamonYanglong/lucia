import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import type { ServiceQuery } from '../types';

const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get services list
  fastify.get('/services', async (request, reply) => {
    const query = request.query as ServiceQuery;
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const services = await storePlugins.trace.getServices({
      startTime: query.startTime,
      endTime: query.endTime,
    });
    
    return { code: 0, data: services };
  });
};

export default servicesRoutes;
