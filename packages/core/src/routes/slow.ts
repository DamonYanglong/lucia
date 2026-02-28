import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import { slowQuerySchema } from '../schemas';
import { createError, createSuccess, ApiError, ErrorCodes } from '../middleware/errorHandler';

const slowRoutes: FastifyPluginAsync = async (fastify) => {
  // Get slow calls
  fastify.get('/slow', async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = slowQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_QUERY,
          'Invalid query parameters',
          parseResult.error.issues
        ));
      }

      const query = parseResult.data;

      if (!storePlugins.trace) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Trace store not configured'
        ));
      }

      const slowCalls = await storePlugins.trace.getSlowCalls({
        service: query.service,
        startTime: query.startTime,
        endTime: query.endTime,
        limit: query.limit,
      });

      return createSuccess(slowCalls);
    } catch (error) {
      request.log.error({ error }, 'Failed to get slow calls');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve slow calls');
    }
  });
};

export default slowRoutes;
