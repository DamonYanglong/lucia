import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ZodError, z } from 'zod';
import {
  createError,
  createSuccess,
  ApiError,
  ErrorCodes,
  errorHandler,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './errorHandler';

describe('middleware/errorHandler', () => {
  describe('ErrorCodes', () => {
    it('should have validation error codes', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.INVALID_PARAMS).toBe('INVALID_PARAMS');
      expect(ErrorCodes.INVALID_QUERY).toBe('INVALID_QUERY');
      expect(ErrorCodes.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should have not found error codes', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.TRACE_NOT_FOUND).toBe('TRACE_NOT_FOUND');
    });

    it('should have server error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });

  describe('createError', () => {
    it('should create error response with required fields', () => {
      const response = createError(ErrorCodes.VALIDATION_ERROR, 'Invalid input');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid input');
      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.details).toBeUndefined();
    });

    it('should create error response with details', () => {
      const details = [{ path: 'name', message: 'Required' }];
      const response = createError(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'Missing required field',
        details
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('Missing required field');
      expect(response.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD);
      expect(response.details).toEqual(details);
    });

    it('should create error response with object details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const response = createError(ErrorCodes.INVALID_QUERY, 'Query error', details);

      expect(response.details).toEqual(details);
    });

    it('should handle all error code types', () => {
      const codes = Object.values(ErrorCodes);

      codes.forEach((code) => {
        const response = createError(code, `Error for ${code}`);
        expect(response.code).toBe(code);
        expect(response.success).toBe(false);
      });
    });
  });

  describe('createSuccess', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'test' };
      const response = createSuccess(data);

      expect(response.success).toBe(true);
      expect(response.code).toBe(0);
      expect(response.data).toEqual(data);
    });

    it('should create success response with null data', () => {
      const response = createSuccess(null);

      expect(response.success).toBe(true);
      expect(response.code).toBe(0);
      expect(response.data).toBeNull();
    });

    it('should create success response with array data', () => {
      const data = [1, 2, 3];
      const response = createSuccess(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([1, 2, 3]);
    });

    it('should create success response with empty object', () => {
      const response = createSuccess({});

      expect(response.success).toBe(true);
      expect(response.data).toEqual({});
    });
  });

  describe('ApiError', () => {
    it('should create ApiError with code and message', () => {
      const error = new ApiError(ErrorCodes.NOT_FOUND, 'Resource not found');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should create ApiError with details', () => {
      const details = { resourceId: '123' };
      const error = new ApiError(
        ErrorCodes.TRACE_NOT_FOUND,
        'Trace not found',
        details
      );

      expect(error.details).toEqual(details);
    });

    it('should convert to response using toResponse()', () => {
      const error = new ApiError(
        ErrorCodes.INVALID_PARAMS,
        'Invalid parameter',
        { field: 'id' }
      );

      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid parameter');
      expect(response.code).toBe(ErrorCodes.INVALID_PARAMS);
      expect(response.details).toEqual({ field: 'id' });
    });

    it('should be throwable', () => {
      expect(() => {
        throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Something went wrong');
      }).toThrow(ApiError);
    });

    it('should be catchable as Error', () => {
      try {
        throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Database connection failed');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as ApiError).code).toBe(ErrorCodes.DATABASE_ERROR);
      }
    });
  });

  describe('errorHandler', () => {
    const mockRequest = {
      id: 'request-123',
      log: {
        error: vi.fn(),
      },
    } as unknown as Parameters<typeof errorHandler>[1];

    const mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof errorHandler>[2];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle ZodError', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ name: '', age: -1 });
      } catch (error) {
        zodError = error as ZodError;
      }

      expect(zodError).toBeDefined();
      await errorHandler(zodError!, mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalled();

      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.success).toBe(false);
      expect(sendArg.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(sendArg.details).toBeDefined();
      expect(Array.isArray(sendArg.details)).toBe(true);
    });

    it('should handle error with code property', async () => {
      const error = new Error('Service unavailable');
      (error as Error & { code: string }).code = ErrorCodes.SERVICE_UNAVAILABLE;

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(503);
      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    });

    it('should handle error with NOT_FOUND code', async () => {
      const error = new Error('Resource not found');
      (error as Error & { code: string }).code = ErrorCodes.NOT_FOUND;

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(404);
    });

    it('should handle error with VALIDATION_ERROR code', async () => {
      const error = new Error('Validation failed');
      (error as Error & { code: string }).code = ErrorCodes.VALIDATION_ERROR;

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should handle Fastify validation error', async () => {
      const error = new Error('Validation error') as Error & { validation: unknown };
      error.validation = [{ keyword: 'required', message: 'missing field' }];

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(400);
      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(sendArg.details).toEqual(error.validation);
    });

    it('should handle generic error in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database connection string');
      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(500);
      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.error).toBe('Internal server error');
      expect(sendArg.code).toBe(ErrorCodes.INTERNAL_ERROR);

      process.env.NODE_ENV = originalEnv;
    });

    it('should show error message in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');
      await errorHandler(error, mockRequest, mockReply);

      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.error).toBe('Detailed error message');

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error with request ID', async () => {
      const error = new Error('Test error');
      await errorHandler(error, mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        { error, requestId: 'request-123' },
        'Request error'
      );
    });
  });

  describe('Response Type Safety', () => {
    it('ApiErrorResponse should have correct structure', () => {
      const response: ApiErrorResponse = {
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR',
      };

      expect(response.success).toBe(false);
      expect(typeof response.error).toBe('string');
      expect(typeof response.code).toBe('string');
    });

    it('ApiSuccessResponse should have correct structure', () => {
      const response: ApiSuccessResponse<{ id: number }> = {
        success: true,
        code: 0,
        data: { id: 1 },
      };

      expect(response.success).toBe(true);
      expect(response.code).toBe(0);
      expect(response.data).toBeDefined();
    });
  });

  describe('Zod Error Formatting', () => {
    it('should format single validation error', async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ email: 'invalid-email' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const mockRequest = {
        id: 'test',
        log: { error: vi.fn() },
      } as unknown as Parameters<typeof errorHandler>[1];

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Parameters<typeof errorHandler>[2];

      await errorHandler(zodError!, mockRequest, mockReply);

      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      expect(sendArg.error).toContain('email');
      expect(sendArg.details).toBeDefined();
      const details = sendArg.details as Array<{ path: string; message: string }>;
      expect(details[0].path).toBe('email');
    });

    it('should format multiple validation errors', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0).max(150),
        email: z.string().email(),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ name: '', age: -5, email: 'not-an-email' });
      } catch (error) {
        zodError = error as ZodError;
      }

      const mockRequest = {
        id: 'test',
        log: { error: vi.fn() },
      } as unknown as Parameters<typeof errorHandler>[1];

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Parameters<typeof errorHandler>[2];

      await errorHandler(zodError!, mockRequest, mockReply);

      const sendArg = (mockReply.send as Mock).mock.calls[0][0] as ApiErrorResponse;
      const details = sendArg.details as Array<{ path: string; message: string }>;
      expect(details.length).toBeGreaterThan(0);
    });
  });
});
