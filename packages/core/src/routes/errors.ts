import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import type { ErrorQuery } from '../types';

const errorsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get errors list
  fastify.get('/errors', async (request, reply) => {
    const query = request.query as ErrorQuery;
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const result = await storePlugins.trace.getErrors({
      service: query.service,
      startTime: query.startTime,
      endTime: query.endTime,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
    
    return { code: 0, data: result };
  });
  
  // Get error groups
  fastify.get('/errors/groups', async (request, reply) => {
    const query = request.query as ErrorQuery;
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const groups = await storePlugins.trace.getErrorGroups({
      service: query.service,
      startTime: query.startTime,
      endTime: query.endTime,
    });
    
    return { code: 0, data: groups };
  });
};

export default errorsRoutes;
