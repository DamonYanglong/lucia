import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import {
  serviceNameParamsSchema,
  metadataQuerySchema,
  serviceMetadataBodySchema,
} from '../schemas';
import { createError, createSuccess, ApiError, ErrorCodes } from '../middleware/errorHandler';
import type { ServiceMetadata } from '../types';

const metadataRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all metadata (with optional query filters)
  fastify.get('/metadata', async (request, reply) => {
    try {
      if (!storePlugins.metadata) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Metadata store not configured'
        ));
      }

      const parseResult = metadataQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_QUERY,
          'Invalid query parameters',
          parseResult.error.issues
        ));
      }

      const query = parseResult.data;
      const metadata = await storePlugins.metadata.list(query);

      return reply.send(createSuccess(metadata));
    } catch (error) {
      request.log.error({ error }, 'Failed to get metadata');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve metadata');
    }
  });

  // Get metadata for a specific service
  fastify.get('/metadata/:serviceName', async (request, reply) => {
    try {
      if (!storePlugins.metadata) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Metadata store not configured'
        ));
      }

      const parseResult = serviceNameParamsSchema.safeParse(request.params);

      if (!parseResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_PARAMS,
          'Invalid service name',
          parseResult.error.issues
        ));
      }

      const { serviceName } = parseResult.data;
      const metadata = await storePlugins.metadata.get(serviceName);

      if (!metadata) {
        return reply.code(404).send(createError(
          ErrorCodes.NOT_FOUND,
          `Metadata not found for service: ${serviceName}`
        ));
      }

      return reply.send(createSuccess(metadata));
    } catch (error) {
      request.log.error({ error }, 'Failed to get metadata');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve metadata');
    }
  });

  // Upsert metadata for a service
  fastify.put('/metadata/:serviceName', async (request, reply) => {
    try {
      if (!storePlugins.metadata) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Metadata store not configured'
        ));
      }

      const paramsResult = serviceNameParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_PARAMS,
          'Invalid service name',
          paramsResult.error.issues
        ));
      }

      const bodyResult = serviceMetadataBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid metadata body',
          bodyResult.error.issues
        ));
      }

      const { serviceName } = paramsResult.data;
      const body = bodyResult.data;

      // Check if metadata already exists to preserve createdAt
      const existing = await storePlugins.metadata.get(serviceName);

      const metadata: ServiceMetadata = {
        serviceName,
        ...body,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'manual',
      };

      const result = await storePlugins.metadata.upsert(metadata);

      return reply.code(existing ? 200 : 201).send(createSuccess(result));
    } catch (error) {
      request.log.error({ error }, 'Failed to upsert metadata');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to save metadata');
    }
  });

  // Delete metadata for a service
  fastify.delete('/metadata/:serviceName', async (request, reply) => {
    try {
      if (!storePlugins.metadata) {
        return reply.code(503).send(createError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          'Metadata store not configured'
        ));
      }

      const parseResult = serviceNameParamsSchema.safeParse(request.params);

      if (!parseResult.success) {
        return reply.code(400).send(createError(
          ErrorCodes.INVALID_PARAMS,
          'Invalid service name',
          parseResult.error.issues
        ));
      }

      const { serviceName } = parseResult.data;

      // Check if metadata exists
      const exists = await storePlugins.metadata.exists(serviceName);
      if (!exists) {
        return reply.code(404).send(createError(
          ErrorCodes.NOT_FOUND,
          `Metadata not found for service: ${serviceName}`
        ));
      }

      await storePlugins.metadata.delete(serviceName);

      return reply.code(204).send();
    } catch (error) {
      request.log.error({ error }, 'Failed to delete metadata');
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to delete metadata');
    }
  });
};

export default metadataRoutes;
