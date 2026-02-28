import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  code: 0;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error codes for standardized error responses
 */
export const ErrorCodes = {
  // Validation errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
  INVALID_QUERY: 'INVALID_QUERY',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  TRACE_NOT_FOUND: 'TRACE_NOT_FOUND',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

/**
 * Map error codes to HTTP status codes
 */
function getHttpStatusCode(code: string): number {
  switch (code) {
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INVALID_PARAMS:
    case ErrorCodes.INVALID_QUERY:
    case ErrorCodes.MISSING_REQUIRED_FIELD:
      return 400;
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.TRACE_NOT_FOUND:
      return 404;
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return 503;
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
function formatZodError(error: ZodError): { message: string; details: unknown } {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  const firstIssue = issues[0];
  const message = firstIssue
    ? `Validation error: ${firstIssue.path ? `${firstIssue.path} - ` : ''}${firstIssue.message}`
    : 'Validation error';

  return { message, details: issues };
}

/**
 * Global error handler for Fastify
 */
export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error
  request.log.error({ error, requestId: request.id }, 'Request error');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const { message, details } = formatZodError(error);
    const response: ApiErrorResponse = {
      success: false,
      error: message,
      code: ErrorCodes.VALIDATION_ERROR,
      details,
    };
    await reply.code(400).send(response);
    return;
  }

  // Handle Fastify errors with validation
  if ('validation' in error && error.validation) {
    const response: ApiErrorResponse = {
      success: false,
      error: error.message || 'Validation error',
      code: ErrorCodes.VALIDATION_ERROR,
      details: error.validation,
    };
    await reply.code(400).send(response);
    return;
  }

  // Handle known error codes in the error object
  if ('code' in error && typeof error.code === 'string') {
    const statusCode = getHttpStatusCode(error.code);
    const response: ApiErrorResponse = {
      success: false,
      error: error.message || 'An error occurred',
      code: error.code,
    };
    await reply.code(statusCode).send(response);
    return;
  }

  // Handle generic errors
  const response: ApiErrorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error',
    code: ErrorCodes.INTERNAL_ERROR,
  };

  await reply.code(500).send(response);
}

/**
 * Create a standardized error response
 */
export function createError(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code,
    details,
  };
}

/**
 * Create a standardized success response
 */
export function createSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    code: 0,
    data,
  };
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): ApiErrorResponse {
    return createError(this.code, this.message, this.details);
  }
}
