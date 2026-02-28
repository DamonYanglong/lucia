/**
 * Test App Factory
 *
 * Creates a Fastify app instance for integration testing with properly configured routes.
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { StorePlugins } from '../../src/store/interface';
import type { ApiSuccessResponse, ApiErrorResponse } from '../../src/middleware/errorHandler';

/**
 * Create a test Fastify app with all routes configured
 */
export function createTestApp(storePlugins: StorePlugins): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  // Services routes
  app.get('/api/services', async (request, reply) => {
    const query = request.query as Record<string, string>;

    if (!storePlugins.trace) {
      return reply.code(503).send({
        success: false,
        error: 'Trace store not configured',
        code: 'SERVICE_UNAVAILABLE',
      } as ApiErrorResponse);
    }

    if (!query.startTime || !query.endTime) {
      return reply.code(400).send({
        success: false,
        error: 'startTime and endTime are required',
        code: 'INVALID_QUERY',
      } as ApiErrorResponse);
    }

    try {
      const services = await storePlugins.trace.getServices({
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return {
        success: true,
        code: 0,
        data: services,
      } as ApiSuccessResponse<typeof services>;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        code: 'DATABASE_ERROR',
      } as ApiErrorResponse);
    }
  });

  // Traces list route
  app.get('/api/traces', async (request, reply) => {
    const query = request.query as Record<string, string>;

    if (!storePlugins.trace) {
      return reply.code(503).send({
        success: false,
        error: 'Trace store not configured',
        code: 'SERVICE_UNAVAILABLE',
      } as ApiErrorResponse);
    }

    if (!query.startTime || !query.endTime) {
      return reply.code(400).send({
        success: false,
        error: 'startTime and endTime are required',
        code: 'INVALID_QUERY',
      } as ApiErrorResponse);
    }

    try {
      const result = await storePlugins.trace.getTraces({
        service: query.service,
        traceId: query.traceId,
        spanName: query.spanName,
        status: query.status || 'all',
        startTime: query.startTime,
        endTime: query.endTime,
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
        minDuration: query.minDuration,
        maxDuration: query.maxDuration,
        httpStatusCode: query.httpStatusCode,
        tags: query.tags,
      });

      return {
        success: true,
        code: 0,
        data: result,
      } as ApiSuccessResponse<typeof result>;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        code: 'DATABASE_ERROR',
      } as ApiErrorResponse);
    }
  });

  // Trace by ID route
  app.get('/api/traces/:traceId', async (request, reply) => {
    const params = request.params as { traceId: string };

    if (!storePlugins.trace) {
      return reply.code(503).send({
        success: false,
        error: 'Trace store not configured',
        code: 'SERVICE_UNAVAILABLE',
      } as ApiErrorResponse);
    }

    try {
      const trace = await storePlugins.trace.getTraceById(params.traceId);

      if (!trace) {
        return reply.code(404).send({
          success: false,
          error: 'Trace not found',
          code: 'TRACE_NOT_FOUND',
        } as ApiErrorResponse);
      }

      return {
        success: true,
        code: 0,
        data: trace,
      } as ApiSuccessResponse<typeof trace>;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        code: 'DATABASE_ERROR',
      } as ApiErrorResponse);
    }
  });

  // Errors list route
  app.get('/api/errors', async (request, reply) => {
    const query = request.query as Record<string, string>;

    if (!storePlugins.trace) {
      return reply.code(503).send({
        success: false,
        error: 'Trace store not configured',
        code: 'SERVICE_UNAVAILABLE',
      } as ApiErrorResponse);
    }

    if (!query.startTime || !query.endTime) {
      return reply.code(400).send({
        success: false,
        error: 'startTime and endTime are required',
        code: 'INVALID_QUERY',
      } as ApiErrorResponse);
    }

    try {
      const result = await storePlugins.trace.getErrors({
        service: query.service,
        startTime: query.startTime,
        endTime: query.endTime,
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
      });

      return {
        success: true,
        code: 0,
        data: result,
      } as ApiSuccessResponse<typeof result>;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        code: 'DATABASE_ERROR',
      } as ApiErrorResponse);
    }
  });

  // Error groups route
  app.get('/api/errors/groups', async (request, reply) => {
    const query = request.query as Record<string, string>;

    if (!storePlugins.trace) {
      return reply.code(503).send({
        success: false,
        error: 'Trace store not configured',
        code: 'SERVICE_UNAVAILABLE',
      } as ApiErrorResponse);
    }

    if (!query.startTime || !query.endTime) {
      return reply.code(400).send({
        success: false,
        error: 'startTime and endTime are required',
        code: 'INVALID_QUERY',
      } as ApiErrorResponse);
    }

    try {
      const groups = await storePlugins.trace.getErrorGroups({
        service: query.service,
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return {
        success: true,
        code: 0,
        data: groups,
      } as ApiSuccessResponse<typeof groups>;
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        code: 'DATABASE_ERROR',
      } as ApiErrorResponse);
    }
  });

  return app;
}
