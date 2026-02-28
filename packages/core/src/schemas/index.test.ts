import { describe, it, expect } from 'vitest';
import {
  traceQuerySchema,
  serviceQuerySchema,
  errorQuerySchema,
  slowQuerySchema,
  traceIdParamsSchema,
} from './index';

describe('schemas/index', () => {
  describe('traceQuerySchema', () => {
    describe('valid inputs', () => {
      it('should accept valid ISO 8601 datetime formats', () => {
        const validInputs = [
          '2024-01-15T10:30:00Z',
          '2024-01-15T10:30:00.000Z',
          '2024-01-15T10:30:00+08:00',
          '2024-01-15T10:30:00-05:00',
          '2024-01-15',
        ];

        validInputs.forEach((startTime) => {
          const result = traceQuerySchema.safeParse({
            startTime,
            endTime: '2024-01-16T10:30:00Z',
          });
          expect(result.success, `Expected ${startTime} to be valid`).toBe(true);
        });
      });

      it('should accept valid query with all optional fields', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          service: 'my-service',
          traceId: 'abc123def456',
          spanName: 'HTTP GET /api/users',
          status: 'error',
          page: 1,
          pageSize: 50,
          minDuration: '100ms',
          maxDuration: '1s',
          httpStatusCode: '500',
          tags: 'env:prod,version:1.0.0',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.service).toBe('my-service');
          expect(result.data.status).toBe('error');
          expect(result.data.page).toBe(1);
          expect(result.data.pageSize).toBe(50);
        }
      });

      it('should use default values for optional fields', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('all');
          expect(result.data.page).toBe(1);
          expect(result.data.pageSize).toBe(20);
        }
      });

      it('should coerce string numbers for pagination', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: '5',
          pageSize: '30',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(5);
          expect(result.data.pageSize).toBe(30);
        }
      });

      it('should accept equal startTime and endTime', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-15T10:30:00Z',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('invalid time formats', () => {
      it('should reject invalid ISO datetime formats', () => {
        const invalidTimes = [
          '2024/01/15',
          '01-15-2024',
          'Jan 15, 2024',
          '2024-13-01', // invalid month
          '2024-01-32', // invalid day
          'not-a-date',
          '',
        ];

        invalidTimes.forEach((startTime) => {
          const result = traceQuerySchema.safeParse({
            startTime,
            endTime: '2024-01-16T10:30:00Z',
          });
          expect(result.success, `Expected "${startTime}" to be invalid`).toBe(false);
        });
      });

      it('should reject startTime after endTime', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-16T10:30:00Z',
          endTime: '2024-01-15T10:30:00Z',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(
            (issue) => issue.message === 'startTime must be before or equal to endTime'
          )).toBe(true);
        }
      });
    });

    describe('traceId validation', () => {
      it('should accept valid hexadecimal traceIds', () => {
        const validTraceIds = [
          '0123456789abcdef',
          'ABCDEF0123456789',
          'a1b2c3d4e5f6',
          'abc-123-def-456', // hyphens are allowed
          'deadbeef',
        ];

        validTraceIds.forEach((traceId) => {
          const result = traceQuerySchema.safeParse({
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-16T10:30:00Z',
            traceId,
          });
          expect(result.success, `Expected traceId "${traceId}" to be valid`).toBe(true);
        });
      });

      it('should reject invalid traceId formats', () => {
        const invalidTraceIds = [
          'trace-with-special!', // special chars
          'spaces in id',
          'ghijkl', // non-hex chars (g is not hex)
        ];

        invalidTraceIds.forEach((traceId) => {
          const result = traceQuerySchema.safeParse({
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-16T10:30:00Z',
            traceId,
          });
          expect(result.success, `Expected traceId "${traceId}" to be invalid`).toBe(false);
        });
      });

      it('should reject empty traceId', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          traceId: '',
        });

        expect(result.success).toBe(false);
      });

      it('should reject traceId longer than 128 characters', () => {
        const longTraceId = 'a'.repeat(129);
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          traceId: longTraceId,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('serviceName validation', () => {
      it('should accept valid service names', () => {
        const validNames = [
          'my-service',
          'my_service',
          'service123',
          'a',
          'api.gateway.v1',
        ];

        validNames.forEach((service) => {
          const result = traceQuerySchema.safeParse({
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-16T10:30:00Z',
            service,
          });
          expect(result.success, `Expected service "${service}" to be valid`).toBe(true);
        });
      });

      it('should reject empty service name', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          service: '',
        });

        expect(result.success).toBe(false);
      });

      it('should reject service name longer than 256 characters', () => {
        const longName = 'a'.repeat(257);
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          service: longName,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('pagination boundaries', () => {
      it('should accept page at minimum boundary (1)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: 1,
        });

        expect(result.success).toBe(true);
      });

      it('should accept page at maximum boundary (10000)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: 10000,
        });

        expect(result.success).toBe(true);
      });

      it('should reject page below minimum (0)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: 0,
        });

        expect(result.success).toBe(false);
      });

      it('should reject page above maximum (10001)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: 10001,
        });

        expect(result.success).toBe(false);
      });

      it('should accept pageSize at minimum boundary (1)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          pageSize: 1,
        });

        expect(result.success).toBe(true);
      });

      it('should accept pageSize at maximum boundary (100)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          pageSize: 100,
        });

        expect(result.success).toBe(true);
      });

      it('should reject pageSize below minimum (0)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          pageSize: 0,
        });

        expect(result.success).toBe(false);
      });

      it('should reject pageSize above maximum (101)', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          pageSize: 101,
        });

        expect(result.success).toBe(false);
      });

      it('should reject non-integer page', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          page: 1.5,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('status enum', () => {
      it('should accept valid status values', () => {
        const validStatuses = ['all', 'error', 'ok'];

        validStatuses.forEach((status) => {
          const result = traceQuerySchema.safeParse({
            startTime: '2024-01-15T10:30:00Z',
            endTime: '2024-01-16T10:30:00Z',
            status,
          });
          expect(result.success, `Expected status "${status}" to be valid`).toBe(true);
        });
      });

      it('should reject invalid status values', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
          endTime: '2024-01-16T10:30:00Z',
          status: 'invalid',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('missing required fields', () => {
      it('should reject when startTime is missing', () => {
        const result = traceQuerySchema.safeParse({
          endTime: '2024-01-16T10:30:00Z',
        });

        expect(result.success).toBe(false);
      });

      it('should reject when endTime is missing', () => {
        const result = traceQuerySchema.safeParse({
          startTime: '2024-01-15T10:30:00Z',
        });

        expect(result.success).toBe(false);
      });
    });
  });

  describe('serviceQuerySchema', () => {
    it('should accept valid time range', () => {
      const result = serviceQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid time range', () => {
      const result = serviceQuerySchema.safeParse({
        startTime: '2024-01-16T10:30:00Z',
        endTime: '2024-01-15T10:30:00Z',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format', () => {
      const result = serviceQuerySchema.safeParse({
        startTime: 'invalid-date',
        endTime: '2024-01-16T10:30:00Z',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('errorQuerySchema', () => {
    it('should accept valid query with service', () => {
      const result = errorQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        service: 'my-service',
        page: 1,
        pageSize: 20,
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid query without service', () => {
      const result = errorQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it('should use default pagination values', () => {
      const result = errorQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });
  });

  describe('slowQuerySchema', () => {
    it('should accept valid query with default limit', () => {
      const result = slowQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should accept custom limit within bounds', () => {
      const result = slowQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        limit: 500,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(500);
      }
    });

    it('should reject limit below minimum', () => {
      const result = slowQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        limit: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject limit above maximum', () => {
      const result = slowQuerySchema.safeParse({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        limit: 1001,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('traceIdParamsSchema', () => {
    it('should accept valid traceId', () => {
      const result = traceIdParamsSchema.safeParse({
        traceId: 'abc123def456789',
      });

      expect(result.success).toBe(true);
    });

    it('should accept traceId with hyphens', () => {
      const result = traceIdParamsSchema.safeParse({
        traceId: 'abc-123-def-456',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty traceId', () => {
      const result = traceIdParamsSchema.safeParse({
        traceId: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject traceId with special characters', () => {
      const result = traceIdParamsSchema.safeParse({
        traceId: 'abc@123!',
      });

      expect(result.success).toBe(false);
    });

    it('should reject traceId longer than 128 characters', () => {
      const result = traceIdParamsSchema.safeParse({
        traceId: 'a'.repeat(129),
      });

      expect(result.success).toBe(false);
    });
  });
});
