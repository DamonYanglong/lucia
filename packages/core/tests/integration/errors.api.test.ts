/**
 * Errors API Integration Tests
 *
 * Tests the /api/errors and /api/errors/groups endpoints with a real ClickHouse database.
 *
 * Prerequisites:
 * - ClickHouse must be running with the otel database
 * - The open_telemetry_traces table must exist with test data including error spans
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

describe('Errors API Integration Tests', () => {
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

  describe('GET /api/errors', () => {
    it('should return 200 and errors list', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
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

    it('should return errors with valid structure', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      const { data } = response.json();

      if (data.list.length > 0) {
        const error = data.list[0];
        expect(error).toHaveProperty('traceId');
        expect(error).toHaveProperty('spanId');
        expect(error).toHaveProperty('serviceName');
        expect(error).toHaveProperty('spanName');
        expect(error).toHaveProperty('timestamp');
      }
    });

    it('should support pagination', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
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

      // First get all errors to find a service name
      const allResponse = await app.inject({
        method: 'GET',
        url: '/api/errors',
        query: { startTime, endTime, pageSize: '1' },
      });

      if (allResponse.json().data.list.length === 0) {
        return; // No data to test with
      }

      const serviceName = allResponse.json().data.list[0].serviceName;

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
        query: { startTime, endTime, service: serviceName },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json().data;

      data.list.forEach((error: { serviceName: string }) => {
        expect(error.serviceName).toBe(serviceName);
      });
    });

    it('should return 400 for missing time range', async () => {
      if (shouldSkip) {
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
        query: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        code: 'INVALID_QUERY',
      });
    });

    it('should handle empty result gracefully', async () => {
      if (shouldSkip) {
        return;
      }

      // Use a very old time range that likely has no data
      const startTime = '2000-01-01T00:00:00Z';
      const endTime = '2000-01-01T01:00:00Z';

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        code: 0,
      });
      expect(response.json().data.list).toEqual([]);
      expect(response.json().data.total).toBe(0);
    });
  });

  describe('GET /api/errors/groups', () => {
    it('should return 200 and error groups list', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors/groups',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        code: 0,
      });

      expect(Array.isArray(response.json().data)).toBe(true);
    });

    it('should return error groups with valid structure', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors/groups',
        query: { startTime, endTime },
      });

      expect(response.statusCode).toBe(200);
      const groups = response.json().data;

      if (groups.length > 0) {
        const group = groups[0];
        expect(group).toHaveProperty('message');
        expect(group).toHaveProperty('serviceName');
        expect(group).toHaveProperty('count');
        expect(group).toHaveProperty('lastOccurrence');
        expect(typeof group.count).toBe('number');
      }
    });

    it('should filter by service name', async () => {
      if (shouldSkip) {
        return;
      }

      const { startTime, endTime } = getTestTimeRange(24);

      // First get all groups to find a service name
      const allResponse = await app.inject({
        method: 'GET',
        url: '/api/errors/groups',
        query: { startTime, endTime },
      });

      const groups = allResponse.json().data;

      if (groups.length === 0) {
        return; // No data to test with
      }

      const serviceName = groups[0].serviceName;

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors/groups',
        query: { startTime, endTime, service: serviceName },
      });

      expect(response.statusCode).toBe(200);

      response.json().data.forEach((group: { serviceName: string }) => {
        expect(group.serviceName).toBe(serviceName);
      });
    });

    it('should return 400 for missing time range', async () => {
      if (shouldSkip) {
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/errors/groups',
        query: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        code: 'INVALID_QUERY',
      });
    });
  });
});
