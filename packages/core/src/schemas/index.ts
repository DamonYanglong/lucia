import { z } from 'zod';

// ISO 8601 datetime regex pattern
const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

// Custom refinement for ISO datetime validation
const isoDateTime = z.string().refine(
  (val) => isoDateTimeRegex.test(val),
  { message: 'Invalid ISO 8601 datetime format' }
);

// Status enum
const statusEnum = z.enum(['all', 'error', 'ok']).default('all');

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Trace ID schema
const traceIdSchema = z.string().min(1).max(128).regex(/^[a-fA-F0-9\-]+$/, {
  message: 'TraceId must be a hexadecimal string'
});

// Service name schema
const serviceNameSchema = z.string().min(1).max(256);

// Span name schema
const spanNameSchema = z.string().min(1).max(256);

// Duration schema (string like "100ms", "1s", or numeric nanoseconds)
const durationSchema = z.string().max(32).optional();

// HTTP status code schema
const httpStatusCodeSchema = z.string().max(8).optional();

// Tags schema (comma-separated key:value pairs)
const tagsSchema = z.string().max(1024).optional();

// Base time range fields (without refinement for extension)
const timeRangeFields = {
  startTime: isoDateTime,
  endTime: isoDateTime,
};

// Time range validation function
const validateTimeRange = (data: { startTime: string; endTime: string }) =>
  new Date(data.startTime) <= new Date(data.endTime);

// Trace query schema
export const traceQuerySchema = z.object({
  ...timeRangeFields,
  service: serviceNameSchema.optional(),
  traceId: traceIdSchema.optional(),
  spanName: spanNameSchema.optional(),
  status: statusEnum,
  page: paginationSchema.shape.page,
  pageSize: paginationSchema.shape.pageSize,
  minDuration: durationSchema,
  maxDuration: durationSchema,
  httpStatusCode: httpStatusCodeSchema,
  tags: tagsSchema,
}).refine(validateTimeRange, {
  message: 'startTime must be before or equal to endTime',
});

// Service query schema
export const serviceQuerySchema = z.object(timeRangeFields).refine(validateTimeRange, {
  message: 'startTime must be before or equal to endTime',
});

// Error query schema
export const errorQuerySchema = z.object({
  ...timeRangeFields,
  service: serviceNameSchema.optional(),
  page: paginationSchema.shape.page,
  pageSize: paginationSchema.shape.pageSize,
}).refine(validateTimeRange, {
  message: 'startTime must be before or equal to endTime',
});

// Slow query schema
export const slowQuerySchema = z.object({
  ...timeRangeFields,
  service: serviceNameSchema.optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
}).refine(validateTimeRange, {
  message: 'startTime must be before or equal to endTime',
});

// Trace ID params schema
export const traceIdParamsSchema = z.object({
  traceId: traceIdSchema,
});

// Type exports for inferred types
export type TraceQuerySchema = z.infer<typeof traceQuerySchema>;
export type ServiceQuerySchema = z.infer<typeof serviceQuerySchema>;
export type ErrorQuerySchema = z.infer<typeof errorQuerySchema>;
export type SlowQuerySchema = z.infer<typeof slowQuerySchema>;
export type TraceIdParamsSchema = z.infer<typeof traceIdParamsSchema>;

// ============ Metadata Schemas ============

// Environment enum
const environmentEnum = z.enum(['dev', 'staging', 'prod', 'other']).optional();

// Status enum
const metadataStatusEnum = z.enum(['active', 'deprecated', 'maintenance']).optional();

// Source enum
const sourceEnum = z.enum(['auto', 'manual']).optional();

// Service name param schema
export const serviceNameParamsSchema = z.object({
  serviceName: serviceNameSchema,
});

// Metadata query schema
export const metadataQuerySchema = z.object({
  environment: z.string().max(64).optional(),
  owner: z.string().max(256).optional(),
  status: z.string().max(32).optional(),
  search: z.string().max(256).optional(),
});

// Service metadata body schema (for upsert)
export const serviceMetadataBodySchema = z.object({
  displayName: z.string().max(256).optional(),
  description: z.string().max(2000).optional(),
  environment: environmentEnum,
  owner: z.string().max(256).optional(),
  team: z.string().max(256).optional(),
  ips: z.array(z.string().max(64)).max(100).optional(),
  repository: z.string().url().max(512).optional(),
  tags: z.record(z.string().max(256)).optional(),
  status: metadataStatusEnum,
}).strict();

// Batch import schema
export const batchMetadataSchema = z.object({
  items: z.array(serviceMetadataBodySchema.extend({
    serviceName: serviceNameSchema,
  })).max(100),
}).strict();

// Type exports for metadata schemas
export type MetadataQuerySchema = z.infer<typeof metadataQuerySchema>;
export type ServiceNameParamsSchema = z.infer<typeof serviceNameParamsSchema>;
export type ServiceMetadataBodySchema = z.infer<typeof serviceMetadataBodySchema>;
export type BatchMetadataSchema = z.infer<typeof batchMetadataSchema>;
