import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClickHouseTracePlugin } from './index.js';
import type { Span } from '@lucia/core';

// Mock ClickHouse client
const mockClient = {
  query: vi.fn(),
  close: vi.fn(),
};

vi.mock('@clickhouse/client', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Test fixture data
const mockSpans: Span[] = [
  {
    timestamp: '2024-01-01T00:00:00.000Z',
    traceId: 'trace-1',
    spanId: 'span-1',
    parentSpanId: null,
    spanName: 'HTTP GET /api/users',
    spanKind: 'SERVER',
    serviceName: 'user-service',
    duration: 100000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: { 'http.method': 'GET', 'http.url': '/api/users' },
    resourceAttributes: { 'service.name': 'user-service' },
    events: [],
    links: [],
  },
  {
    timestamp: '2024-01-01T00:00:00.100Z',
    traceId: 'trace-1',
    spanId: 'span-2',
    parentSpanId: 'span-1',
    spanName: 'DB Query',
    spanKind: 'CLIENT',
    serviceName: 'user-service',
    duration: 50000000,
    statusCode: 'Ok',
    statusMessage: '',
    spanAttributes: { 'db.system': 'postgresql' },
    resourceAttributes: {},
    events: [],
    links: [],
  },
  {
    timestamp: '2024-01-01T00:00:00.150Z',
    traceId: 'trace-2',
    spanId: 'span-3',
    parentSpanId: null,
    spanName: 'HTTP POST /api/orders',
    spanKind: 'SERVER',
    serviceName: 'order-service',
    duration: 200000000,
    statusCode: 'Error',
    statusMessage: 'Connection refused',
    spanAttributes: { 'http.method': 'POST' },
    resourceAttributes: {},
    events: [{ timestamp: '2024-01-01T00:00:00.160Z', name: 'exception', attributes: {} }],
    links: [],
  },
];

describe('ClickHouseTracePlugin', () => {
  let plugin: ClickHouseTracePlugin;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    plugin = new ClickHouseTracePlugin();
    
    await plugin.init({
      host: 'localhost',
      port: 8123,
      database: 'otel',
      username: 'default',
      password: '',
    });
  });

  afterEach(async () => {
    await plugin.close();
  });

  describe('getServices', () => {
    it('should return list of services with stats', async () => {
      // getServices returns result.json() directly (not .data)
      mockClient.query.mockResolvedValueOnce({
        json: async () => [
          { name: 'user-service', requestCount: 100, errorCount: 5, avgDuration: 150000000 },
          { name: 'order-service', requestCount: 50, errorCount: 10, avgDuration: 200000000 },
        ],
      });

      const services = await plugin.getServices({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('user-service');
      expect(services[0].requestCount).toBe(100);
      expect(services[1].name).toBe('order-service');
    });

    it('should return empty array when no services', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => [],
      });

      const services = await plugin.getServices({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(services).toEqual([]);
    });
  });

  describe('getTraces', () => {
    it('should return paginated trace list', async () => {
      // Mock count query
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ total: 100 }] }),
      });

      // Mock data query
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            traceId: 'trace-1',
            serviceName: 'user-service',
            spanName: 'HTTP GET /api/users',
            duration: 100000000,
            statusCode: 'Ok',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ]}),
      });

      const result = await plugin.getTraces({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        page: 1,
        pageSize: 20,
      });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by service', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ total: 50 }] }),
      });

      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      await plugin.getTraces({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        service: 'user-service',
      });

      // Verify the query was called
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should filter by status=error', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ total: 5 }] }),
      });

      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      await plugin.getTraces({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        status: 'error',
      });

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('getTraceById', () => {
    it('should return trace with spans', async () => {
      // Mock time range query
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T00:00:00.150Z' }] }),
      });

      // Mock spans query - need to return with ClickHouse column names
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            Timestamp: '2024-01-01T00:00:00.000Z',
            TraceId: 'trace-1',
            SpanId: 'span-1',
            ParentSpanId: null,
            SpanName: 'HTTP GET /api/users',
            SpanKind: 'SERVER',
            ServiceName: 'user-service',
            Duration: 100000000,
            StatusCode: 'Ok',
            StatusMessage: '',
            SpanAttributes: {},
            ResourceAttributes: {},
            Events: [],
            Links: [],
          },
          {
            Timestamp: '2024-01-01T00:00:00.100Z',
            TraceId: 'trace-1',
            SpanId: 'span-2',
            ParentSpanId: 'span-1',
            SpanName: 'DB Query',
            SpanKind: 'CLIENT',
            ServiceName: 'user-service',
            Duration: 50000000,
            StatusCode: 'Ok',
            StatusMessage: '',
            SpanAttributes: {},
            ResourceAttributes: {},
            Events: [],
            Links: [],
          },
        ]}),
      });

      const trace = await plugin.getTraceById('trace-1');

      expect(trace).not.toBeNull();
      expect(trace!.traceId).toBe('trace-1');
      expect(trace!.spans).toHaveLength(2);
      expect(trace!.spanCount).toBe(2);
    });

    it('should return null for non-existent trace', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      const trace = await plugin.getTraceById('non-existent');

      expect(trace).toBeNull();
    });

    it('should detect error status in trace', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T00:00:00.200Z' }] }),
      });

      // Use the error span (mockSpans[2]) with ClickHouse column names
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            Timestamp: '2024-01-01T00:00:00.150Z',
            TraceId: 'trace-2',
            SpanId: 'span-3',
            ParentSpanId: null,
            SpanName: 'HTTP POST /api/orders',
            SpanKind: 'SERVER',
            ServiceName: 'order-service',
            Duration: 200000000,
            StatusCode: 'Error',
            StatusMessage: 'Connection refused',
            SpanAttributes: {},
            ResourceAttributes: {},
            Events: [],
            Links: [],
          },
        ]}),
      });

      const trace = await plugin.getTraceById('trace-2');

      expect(trace!.statusCode).toBe('Error');
    });
  });

  describe('getErrors', () => {
    it('should return paginated error list', async () => {
      // First call: data query
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            timestamp: '2024-01-01T00:00:00.150Z',
            traceId: 'trace-2',
            spanId: 'span-3',
            serviceName: 'order-service',
            spanName: 'HTTP POST /api/orders',
            statusMessage: 'Connection refused',
          },
        ]}),
      });

      // Second call: count query
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [{ total: 10 }] }),
      });

      const result = await plugin.getErrors({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  describe('getErrorGroups', () => {
    it('should group errors by message', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            message: 'Connection refused',
            count: 15,
            lastOccurrence: '2024-01-01T12:00:00Z',
            serviceName: 'order-service',
          },
          {
            message: 'Timeout exceeded',
            count: 8,
            lastOccurrence: '2024-01-01T11:00:00Z',
            serviceName: 'payment-service',
          },
        ]}),
      });

      const groups = await plugin.getErrorGroups({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });

      expect(groups).toHaveLength(2);
      expect(groups[0].message).toBe('Connection refused');
      expect(groups[0].count).toBe(15);
    });
  });

  describe('getSlowCalls', () => {
    it('should return top N slow calls', async () => {
      mockClient.query.mockResolvedValueOnce({
        json: async () => ({ data: [
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            traceId: 'trace-slow-1',
            spanId: 'span-slow-1',
            serviceName: 'report-service',
            spanName: 'Generate Report',
            duration: 5000000000, // 5 seconds
          },
          {
            timestamp: '2024-01-01T00:01:00.000Z',
            traceId: 'trace-slow-2',
            spanId: 'span-slow-2',
            serviceName: 'report-service',
            spanName: 'Export Data',
            duration: 3000000000, // 3 seconds
          },
        ]}),
      });

      const slowCalls = await plugin.getSlowCalls({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        limit: 10,
      });

      expect(slowCalls).toHaveLength(2);
      expect(slowCalls[0].duration).toBe(5000000000);
    });
  });

  describe('init and close', () => {
    it('should initialize with config', async () => {
      const newPlugin = new ClickHouseTracePlugin();
      
      await expect(newPlugin.init({
        host: 'localhost',
        port: 8123,
        database: 'otel',
        username: 'default',
        password: '',
      })).resolves.not.toThrow();
      
      await newPlugin.close();
    });

    it('should close client gracefully', async () => {
      const newPlugin = new ClickHouseTracePlugin();
      
      await newPlugin.init({
        host: 'localhost',
        port: 8123,
        database: 'otel',
        username: 'default',
        password: '',
      });
      
      await newPlugin.close();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
