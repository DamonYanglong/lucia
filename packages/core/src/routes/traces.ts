import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import type { TraceQuery } from '../types';

const tracesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get traces list
  fastify.get('/traces', async (request, reply) => {
    const query = request.query as TraceQuery;
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const result = await storePlugins.trace.getTraces({
      service: query.service,
      traceId: query.traceId,
      status: query.status || 'all',
      startTime: query.startTime,
      endTime: query.endTime,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
    
    return { code: 0, data: result };
  });
  
  // Get trace by ID
  fastify.get('/traces/:traceId', async (request, reply) => {
    const { traceId } = request.params as { traceId: string };
    
    if (!storePlugins.trace) {
      return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
    }
    
    const trace = await storePlugins.trace.getTraceById(traceId);
    
    if (!trace) {
      return reply.code(404).send({ code: 404, message: 'Trace not found' });
    }
    
    return { code: 0, data: trace };
  });
};

export default tracesRoutes;
