import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import { traceQuerySchema, traceIdParamsSchema } from '../schemas';
import { createError, createSuccess, ApiError, ErrorCodes } from '../middleware/errorHandler';

const tracesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get traces list
  fastify.get('/traces', async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = traceQuerySchema.safeParse(request.query);

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

      const result = await storePlugins.trace.getTraces({
        service: query.service,
        traceId: query.traceId,
        spanName: query.spanName,
        status: query.status,
        startTime: query.startTime,
        endTime: query.endTime,
        page: query.page,
        pageSize: query.pageSize,
        minDuration: query.minDuration,
        maxDuration: query.maxDuration,
        httpStatusCode: query.httpStatusCode,
        tags: query.tags,
      });

      return createSuccess(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to get traces');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve traces');
    }
  });

  // Get trace by ID
  fastify.get('/traces/:traceId', async (request, reply) => {
    try {
      // Validate path parameters
      const parseResult = traceIdParamsSchema.safeParse(request.params);

      if (!parseResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_PARAMS,
          'Invalid trace ID',
          parseResult.error.issues
        ));
      }

      const { traceId } = parseResult.data;

      if (!storePlugins.trace) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Trace store not configured'
        ));
      }

      const trace = await storePlugins.trace.getTraceById(traceId);

      if (!trace) {
        return reply.code(404).send(createError(
          ErrorCodes.TRACE_NOT_FOUND,
          'Trace not found'
        ));
      }

      return createSuccess(trace);
    } catch (error) {
      request.log.error({ error }, 'Failed to get trace by ID');
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve trace');
    }
  });
};

export default tracesRoutes;
