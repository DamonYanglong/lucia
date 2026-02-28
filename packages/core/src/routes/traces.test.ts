import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Create a mutable mock store
const mockTraceStore = {
  getTraces: vi.fn(),
  getTraceById: vi.fn(),
  _enabled: false,
  _override: null as unknown,
};

// Mock storePlugins before importing routes
vi.mock('../app', () => ({
  storePlugins: {
    get trace() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (mockTraceStore._override !== null) {
        return mockTraceStore._override;
      }
      return mockTraceStore._enabled ? mockTraceStore : null;
    },
    set trace(value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      mockTraceStore._override = value;
    },
  },
}));

// Import after mocking
import tracesRoutes from './traces';
import { storePlugins } from '../app';
import { ErrorCodes } from '../middleware/errorHandler';

describe('routes/traces', () => {
  let mockFastify: FastifyInstance;
  let routes: Map<string, { handler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> }>;

  beforeEach(() => {
    routes = new Map();

    mockFastify = {
      get: vi.fn((path: string, handler: () => Promise<unknown>) => {
        routes.set(path, { handler });
      }),
    } as unknown as FastifyInstance;

    // Reset mock store state
    mockTraceStore._enabled = false;
    mockTraceStore._override = null;
    mockTraceStore.getTraces.mockReset();
    mockTraceStore.getTraceById.mockReset();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('route registration', () => {
    it('should register GET /traces route', async () => {
      await tracesRoutes(mockFastify, {});

      expect(mockFastify.get).toHaveBeenCalledWith('/traces', expect.any(Function));
    });

    it('should register GET /traces/:traceId route', async () => {
      await tracesRoutes(mockFastify, {});

      expect(mockFastify.get).toHaveBeenCalledWith('/traces/:traceId', expect.any(Function));
    });
  });

  describe('GET /traces', () => {
    const createMockRequest = (query: Record<string, unknown>) =>
      ({
        query,
        log: { error: vi.fn() },
      }) as unknown as FastifyRequest;

    const createMockReply = () => {
      const reply = {
        _code: 200,
        _body: null as unknown,
        code: vi.fn(function (this: typeof reply, statusCode: number) {
          this._code = statusCode;
          return this;
        }),
        send: vi.fn(function (this: typeof reply, body: unknown) {
          this._body = body;
          return this;
        }),
      };
      return reply as unknown as FastifyReply & { _code: number; _body: unknown };
    };

    beforeEach(async () => {
      await tracesRoutes(mockFastify, {});
    });

    it('should return 400 for invalid query parameters', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        startTime: 'invalid-date',
        endTime: '2024-01-16T10:30:00Z',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_QUERY,
      });
    });

    it('should return 400 for missing required parameters', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({});
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_QUERY,
      });
    });

    it('should return 400 for startTime after endTime', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        startTime: '2024-01-16T10:30:00Z',
        endTime: '2024-01-15T10:30:00Z',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_QUERY,
      });
    });

    it('should return 400 for invalid page parameter', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        page: -1,
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
    });

    it('should return 400 for invalid pageSize parameter', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        pageSize: 200,
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
    });

    it('should return 503 when trace store not configured', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { trace: unknown }).trace = null;

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(503);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        error: 'Trace store not configured',
      });
    });

    it('should return 200 with data for valid query', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockTraceData = {
        traces: [{ traceId: 'abc123', name: 'test-span' }],
        total: 1,
      };

      (storePlugins as unknown as { trace: { getTraces: () => Promise<typeof mockTraceData> } }).trace = {
        getTraces: vi.fn().mockResolvedValue(mockTraceData),
      };

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });
      const mockReply = createMockReply();

      const result = await route.handler(mockRequest, mockReply);

      expect(result).toMatchObject({
        success: true,
        code: 0,
        data: mockTraceData,
      });
    });

    it('should pass all query parameters to store', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      const mockGetTraces = vi.fn().mockResolvedValue({ traces: [], total: 0 });
      (storePlugins as unknown as { trace: { getTraces: typeof mockGetTraces } }).trace = {
        getTraces: mockGetTraces,
      };

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        service: 'my-service',
        traceId: 'abc123',
        spanName: 'HTTP GET',
        status: 'error',
        page: 2,
        pageSize: 50,
        minDuration: '100ms',
        maxDuration: '1s',
        httpStatusCode: '500',
        tags: 'env:prod',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockGetTraces).toHaveBeenCalledWith({
        service: 'my-service',
        traceId: 'abc123',
        spanName: 'HTTP GET',
        status: 'error',
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
        page: 2,
        pageSize: 50,
        minDuration: '100ms',
        maxDuration: '1s',
        httpStatusCode: '500',
        tags: 'env:prod',
      });
    });

    it('should handle database errors', async () => {
      const route = routes.get('/traces');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { trace: { getTraces: () => Promise<never> } }).trace = {
        getTraces: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      const mockRequest = createMockRequest({
        startTime: '2024-01-15T10:30:00Z',
        endTime: '2024-01-16T10:30:00Z',
      });
      const mockReply = createMockReply();

      await expect(route.handler(mockRequest, mockReply)).rejects.toThrow();
      expect(mockRequest.log.error).toHaveBeenCalled();
    });
  });

  describe('GET /traces/:traceId', () => {
    const createMockRequest = (params: Record<string, unknown>) =>
      ({
        params,
        log: { error: vi.fn() },
      }) as unknown as FastifyRequest;

    const createMockReply = () => {
      const reply = {
        _code: 200,
        _body: null as unknown,
        code: vi.fn(function (this: typeof reply, statusCode: number) {
          this._code = statusCode;
          return this;
        }),
        send: vi.fn(function (this: typeof reply, body: unknown) {
          this._body = body;
          return this;
        }),
      };
      return reply as unknown as FastifyReply & { _code: number; _body: unknown };
    };

    beforeEach(async () => {
      await tracesRoutes(mockFastify, {});
    });

    it('should return 400 for invalid traceId format', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        traceId: '',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_PARAMS,
      });
    });

    it('should return 400 for traceId with special characters', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      const mockRequest = createMockRequest({
        traceId: 'invalid@trace!id',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_PARAMS,
      });
    });

    it('should return 503 when trace store not configured', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { trace: unknown }).trace = null;

      const mockRequest = createMockRequest({
        traceId: 'abc123def456',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(503);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.SERVICE_UNAVAILABLE,
      });
    });

    it('should return 404 when trace not found', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { trace: { getTraceById: () => Promise<null> } }).trace = {
        getTraceById: vi.fn().mockResolvedValue(null),
      };

      const mockRequest = createMockRequest({
        traceId: 'abc123def456',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(404);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.TRACE_NOT_FOUND,
        error: 'Trace not found',
      });
    });

    it('should return 200 with trace data when found', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      const mockTraceData = {
        traceId: 'abc123def456',
        name: 'test-trace',
        spans: [],
      };

      (storePlugins as unknown as { trace: { getTraceById: () => Promise<typeof mockTraceData> } }).trace = {
        getTraceById: vi.fn().mockResolvedValue(mockTraceData),
      };

      const mockRequest = createMockRequest({
        traceId: 'abc123def456',
      });
      const mockReply = createMockReply();

      const result = await route.handler(mockRequest, mockReply);

      expect(result).toMatchObject({
        success: true,
        code: 0,
        data: mockTraceData,
      });
    });

    it('should pass traceId to store correctly', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      const mockGetTraceById = vi.fn().mockResolvedValue({ traceId: 'a1b2c3d4e5f67890' });
      (storePlugins as unknown as { trace: { getTraceById: typeof mockGetTraceById } }).trace = {
        getTraceById: mockGetTraceById,
      };

      const mockRequest = createMockRequest({
        traceId: 'a1b2c3d4e5f67890',
      });
      const mockReply = createMockReply();

      const result = await route.handler(mockRequest, mockReply);

      // Verify the store was called with the correct traceId
      expect(mockGetTraceById).toHaveBeenCalledWith('a1b2c3d4e5f67890');
      expect(result).toMatchObject({
        success: true,
        data: { traceId: 'a1b2c3d4e5f67890' },
      });
    });

    it('should handle database errors', async () => {
      const route = routes.get('/traces/:traceId');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { trace: { getTraceById: () => Promise<never> } }).trace = {
        getTraceById: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const mockRequest = createMockRequest({
        traceId: 'abc123def456',
      });
      const mockReply = createMockReply();

      await expect(route.handler(mockRequest, mockReply)).rejects.toThrow();
      expect(mockRequest.log.error).toHaveBeenCalled();
    });
  });
});
