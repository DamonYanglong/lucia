import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import { errorQuerySchema } from '../schemas';
import { createError, createSuccess, ApiError, ErrorCodes } from '../middleware/errorHandler';

const errorsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get errors list
  fastify.get('/errors', async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = errorQuerySchema.safeParse(request.query);

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

      const result = await storePlugins.trace.getErrors({
        service: query.service,
        startTime: query.startTime,
        endTime: query.endTime,
        page: query.page,
        pageSize: query.pageSize,
      });

      return createSuccess(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to get errors');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve errors');
    }
  });

  // Get error groups
  fastify.get('/errors/groups', async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = errorQuerySchema.safeParse(request.query);

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

      const groups = await storePlugins.trace.getErrorGroups({
        service: query.service,
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return createSuccess(groups);
    } catch (error) {
      request.log.error({ error }, 'Failed to get error groups');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve error groups');
    }
  });
};

export default errorsRoutes;
