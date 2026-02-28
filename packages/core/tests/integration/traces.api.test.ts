/**
 * Traces API Integration Tests
 *
 * Tests the /api/traces and /api/traces/:traceId endpoints with a real ClickHouse database.
 *
 * Prerequisites:
 * - ClickHouse must be running with the otel database
 * - The open_telemetry_traces and open_telemetry_traces_trace_id_ts tables must exist with test data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestConfig,
  checkDatabaseOrSkip,
  getTestTimeRange,
  type TestClickHouseConfig
} from '../integration.setup';
import { createTestApp } from '../helpers/test-app';
import { ClickHouseTracePlugin } from '@lucia/plugin-store-trace-clickhouse';
import type { StorePlugins } from '../../src/store/interface';
import type { FastifyInstance } from 'fastify';

// Test configuration
const config: TestClickHouseConfig = getTestConfig();
let shouldSkip = false;

describe('Traces API Integration Tests', () => {
  let app: FastifyInstance;
  let storePlugins: StorePlugins = {};
  let tracePlugin: ClickHouseTracePlugin;

  beforeAll(async () => {
    // Check if database is available
    shouldSkip = !(await checkDatabaseOrSkip(config));

    if (shouldSkip) {
      return;
    }

    // Initialize ClickHouse plugin
    tracePlugin = new ClickHouseTracePlugin();
    await tracePlugin.init({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
    });

    storePlugins.trace = tracePlugin;

    // Create Fastify app using the test helper
    app = createTestApp(storePlugins);
  });

  afterAll(async () => {
    if (tracePlugin) {
      await tracePlugin.close();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/traces', () => {
    it('should return 200 and traces list', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        code: 0,
      });

      const data = response.json().data;
      expect(data).toHaveProperty('list');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
      expect(Array.isArray(data.list)).toBe(true);
    });

    it('should return traces with valid structure', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      const { data } = response.json();

      if (data.list.length > 0) {
        const trace = data.list[0];
        expect(trace).toHaveProperty('traceId');
        expect(trace).toHaveProperty('serviceName');
        expect(trace).toHaveProperty('spanName');
        expect(trace).toHaveProperty('duration');
        expect(trace).toHaveProperty('statusCode');
        expect(trace).toHaveProperty('timestamp');
      }
    });

    it('should support pagination', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime, page: '1', pageSize: '5' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json().data;

      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(5);
      expect(data.list.length).toBeLessThanOrEqual(5);
    });

    it('should filter by service name', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      // First get all traces to find a service name
      const allResponse = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime, pageSize: '1' },
      });

      if (allResponse.json().data.list.length === 0) {
        return; // No data to test with
      }

      const serviceName = allResponse.json().data.list[0].serviceName;

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime, service: serviceName },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json().data;

      data.list.forEach((trace: { serviceName: string }) => {
        expect(trace.serviceName).toBe(serviceName);
      });
    });

    it('should return 400 for missing time range', async () => {
      if (shouldSkip) {
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        code: 'INVALID_QUERY',
      });
    });
  });

  describe('GET /api/traces/:traceId', () => {
    it('should return 404 for non-existent trace', async () => {
      if (shouldSkip) {
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/traces/nonexistenttrace123456789',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        success: false,
        code: 'TRACE_NOT_FOUND',
        error: 'Trace not found',
      });
    });

    it('should return trace details for valid trace ID', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      // First get a list of traces to find a valid trace ID
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime, pageSize: '1' },
      });

      const traces = listResponse.json().data.list;

      if (traces.length === 0) {
        return; // No data to test with
      }

      const traceId = traces[0].traceId;

      const response = await app.inject({
        method: 'GET',
        url: `/api/traces/${traceId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        code: 0,
      });

      const trace = response.json().data;
      expect(trace.traceId).toBe(traceId);
      expect(trace).toHaveProperty('spans');
      expect(trace).toHaveProperty('spanCount');
      expect(trace).toHaveProperty('duration');
      expect(trace).toHaveProperty('statusCode');
      expect(Array.isArray(trace.spans)).toBe(true);
    });

    it('should return trace with valid span structure', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      // Get a trace ID
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/traces',
        query: { startTime, endTime, pageSize: '1' },
      });

      const traces = listResponse.json().data.list;

      if (traces.length === 0) {
        return;
      }

      const traceId = traces[0].traceId;

      const response = await app.inject({
        method: 'GET',
        url: `/api/traces/${traceId}`,
      });

      if (response.statusCode !== 200) {
        return;
      }

      const trace = response.json().data;

      if (trace.spans.length > 0) {
        const span = trace.spans[0];
        expect(span).toHaveProperty('traceId');
        expect(span).toHaveProperty('spanId');
        expect(span).toHaveProperty('spanName');
        expect(span).toHaveProperty('serviceName');
        expect(span).toHaveProperty('duration');
        expect(span).toHaveProperty('statusCode');
        expect(span).toHaveProperty('timestamp');
      }
    });
  });
});
