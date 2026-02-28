import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import { serviceQuerySchema } from '../schemas';
import { createError, createSuccess, ApiError, ErrorCodes } from '../middleware/errorHandler';

const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get services list
  fastify.get('/services', async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = serviceQuerySchema.safeParse(request.query);

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

      const services = await storePlugins.trace.getServices({
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return createSuccess(services);
    } catch (error) {
      request.log.error({ error }, 'Failed to get services');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve services');
    }
  });
};

export default servicesRoutes;
