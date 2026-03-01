import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Create a mutable mock store
const mockMetadataStore = {
  get: vi.fn(),
  list: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  _enabled: false,
  _override: null as unknown,
};

// Mock storePlugins before importing routes
vi.mock('../app', () => ({
  storePlugins: {
    get metadata() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (mockMetadataStore._override !== null) {
        return mockMetadataStore._override;
      }
      return mockMetadataStore._enabled ? mockMetadataStore : null;
    },
    set metadata(value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      mockMetadataStore._override = value;
    },
  },
}));

// Import after mocking
import metadataRoutes from './metadata';
import { storePlugins } from '../app';
import { ErrorCodes } from '../middleware/errorHandler';

describe('routes/metadata', () => {
  let mockFastify: FastifyInstance;
  let routes: Map<string, { handler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> }>;

  beforeEach(() => {
    routes = new Map();

    mockFastify = {
      get: vi.fn((path: string, handler: () => Promise<unknown>) => {
        routes.set(`GET ${path}`, { handler });
      }),
      put: vi.fn((path: string, handler: () => Promise<unknown>) => {
        routes.set(`PUT ${path}`, { handler });
      }),
      delete: vi.fn((path: string, handler: () => Promise<unknown>) => {
        routes.set(`DELETE ${path}`, { handler });
      }),
    } as unknown as FastifyInstance;

    // Reset mock store state
    mockMetadataStore._enabled = false;
    mockMetadataStore._override = null;
    mockMetadataStore.get.mockReset();
    mockMetadataStore.list.mockReset();
    mockMetadataStore.upsert.mockReset();
    mockMetadataStore.delete.mockReset();
    mockMetadataStore.exists.mockReset();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('route registration', () => {
    it('should register GET /metadata route', async () => {
      await metadataRoutes(mockFastify, {});

      expect(mockFastify.get).toHaveBeenCalledWith('/metadata', expect.any(Function));
    });

    it('should register GET /metadata/:serviceName route', async () => {
      await metadataRoutes(mockFastify, {});

      expect(mockFastify.get).toHaveBeenCalledWith('/metadata/:serviceName', expect.any(Function));
    });

    it('should register PUT /metadata/:serviceName route', async () => {
      await metadataRoutes(mockFastify, {});

      expect(mockFastify.put).toHaveBeenCalledWith('/metadata/:serviceName', expect.any(Function));
    });

    it('should register DELETE /metadata/:serviceName route', async () => {
      await metadataRoutes(mockFastify, {});

      expect(mockFastify.delete).toHaveBeenCalledWith('/metadata/:serviceName', expect.any(Function));
    });
  });

  describe('GET /metadata', () => {
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
      await metadataRoutes(mockFastify, {});
    });

    it('should return 503 when metadata store not configured', async () => {
      const route = routes.get('GET /metadata');
      if (!route) throw new Error('Route not found');

      (storePlugins as unknown as { metadata: unknown }).metadata = null;

      const mockRequest = createMockRequest({});
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(503);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        error: 'Metadata store not configured',
      });
    });

    it('should return 200 with data for valid query', async () => {
      const route = routes.get('GET /metadata');
      if (!route) throw new Error('Route not found');

      const mockMetadataList = [
        {
          serviceName: 'service-a',
          displayName: 'Service A',
          environment: 'prod',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'manual' as const,
        },
      ];

      mockMetadataStore.list.mockResolvedValue(mockMetadataList);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({});
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._body).toMatchObject({
        success: true,
        code: 0,
        data: mockMetadataList,
      });
    });

    it('should pass query parameters to store', async () => {
      const route = routes.get('GET /metadata');
      if (!route) throw new Error('Route not found');

      mockMetadataStore.list.mockResolvedValue([]);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        environment: 'prod',
        owner: 'team-a',
        status: 'active',
        search: 'payment',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockMetadataStore.list).toHaveBeenCalledWith({
        environment: 'prod',
        owner: 'team-a',
        status: 'active',
        search: 'payment',
      });
    });
  });

  describe('GET /metadata/:serviceName', () => {
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
      await metadataRoutes(mockFastify, {});
    });

    it('should return 400 for invalid serviceName format', async () => {
      const route = routes.get('GET /metadata/:serviceName');
      if (!route) throw new Error('Route not found');
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        serviceName: '',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(400);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_PARAMS,
      });
    });

    it('should return 503 when metadata store not configured', async () => {
      const route = routes.get('GET /metadata/:serviceName');
      if (!route) throw new Error('Route not found');
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      (storePlugins as unknown as { metadata: unknown }).metadata = null;

      const mockRequest = createMockRequest({
        serviceName: 'my-service',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(503);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.SERVICE_UNAVAILABLE,
      });
    });

    it('should return 404 when metadata not found', async () => {
      const route = routes.get('GET /metadata/:serviceName');
      if (!route) throw new Error('Route not found');
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      mockMetadataStore.get.mockResolvedValue(null);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        serviceName: 'unknown-service',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(404);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.NOT_FOUND,
      });
    });

    it('should return 200 with metadata when found', async () => {
      const route = routes.get('GET /metadata/:serviceName');
      if (!route) throw new Error('Route not found');
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockMetadata = {
        serviceName: 'my-service',
        displayName: 'My Service',
        environment: 'prod' as const,
        owner: 'team-a',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'manual' as const,
      };

      mockMetadataStore.get.mockResolvedValue(mockMetadata);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        serviceName: 'my-service',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._body).toMatchObject({
        success: true,
        code: 0,
        data: mockMetadata,
      });
    });
  });

  describe('PUT /metadata/:serviceName', () => {
    const createMockRequest = (params: Record<string, unknown>, body: Record<string, unknown>) =>
      ({
        params,
        body,
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
      await metadataRoutes(mockFastify, {});
    });

    it('should return 201 for new metadata', async () => {
      const route = routes.get('PUT /metadata/:serviceName');
      if (!route) throw new Error('Route not found');

      const newMetadata = {
        serviceName: 'new-service',
        displayName: 'New Service',
        environment: 'dev' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'manual' as const,
      };

      mockMetadataStore.get.mockResolvedValue(null);
      mockMetadataStore.upsert.mockResolvedValue(newMetadata);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest(
        { serviceName: 'new-service' },
        { displayName: 'New Service', environment: 'dev' }
      );
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(201);
      expect(mockReply._body).toMatchObject({
        success: true,
        data: newMetadata,
      });
    });

    it('should return 200 for existing metadata update', async () => {
      const route = routes.get('PUT /metadata/:serviceName');
      if (!route) throw new Error('Route not found');

      const existingMetadata = {
        serviceName: 'existing-service',
        displayName: 'Old Name',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'manual' as const,
      };

      const updatedMetadata = {
        ...existingMetadata,
        displayName: 'New Name',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockMetadataStore.get.mockResolvedValue(existingMetadata);
      mockMetadataStore.upsert.mockResolvedValue(updatedMetadata);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest(
        { serviceName: 'existing-service' },
        { displayName: 'New Name' }
      );
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(200);
      expect(mockReply._body).toMatchObject({
        success: true,
        data: updatedMetadata,
      });
    });
  });

  describe('DELETE /metadata/:serviceName', () => {
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
      await metadataRoutes(mockFastify, {});
    });

    it('should return 404 when metadata not found', async () => {
      const route = routes.get('DELETE /metadata/:serviceName');
      if (!route) throw new Error('Route not found');

      mockMetadataStore.exists.mockResolvedValue(false);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        serviceName: 'unknown-service',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(404);
      expect(mockReply._body).toMatchObject({
        success: false,
        code: ErrorCodes.NOT_FOUND,
      });
    });

    it('should return 204 when metadata deleted successfully', async () => {
      const route = routes.get('DELETE /metadata/:serviceName');
      if (!route) throw new Error('Route not found');

      mockMetadataStore.exists.mockResolvedValue(true);
      mockMetadataStore.delete.mockResolvedValue(undefined);
      (storePlugins as unknown as { metadata: typeof mockMetadataStore }).metadata = mockMetadataStore;

      const mockRequest = createMockRequest({
        serviceName: 'my-service',
      });
      const mockReply = createMockReply();

      await route.handler(mockRequest, mockReply);

      expect(mockReply._code).toBe(204);
      expect(mockMetadataStore.delete).toHaveBeenCalledWith('my-service');
    });
  });
});
