/**
 * Services API Integration Tests
 *
 * Tests the /api/services endpoint with a real ClickHouse database.
 *
 * Prerequisites:
 * - ClickHouse must be running with the otel database
 * - The open_telemetry_traces table must exist with test data
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

describe('Services API Integration Tests', () => {
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

  it('should return 200 and services list', async () => {
    if (shouldSkip) {
      return;
    }

    const { startTime, endTime } = getTestTimeRange(24);

    const response = await app.inject({
      method: 'GET',
      url: '/api/services',
      query: { startTime, endTime },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      code: 0,
    });

    const data = response.json().data;
    expect(Array.isArray(data)).toBe(true);

    // If there's data, verify the structure
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('requestCount');
      expect(data[0]).toHaveProperty('errorCount');
      expect(data[0]).toHaveProperty('avgDuration');
    }
  });

  it('should return services with valid data types', async () => {
    if (shouldSkip) {
      return;
    }

    const { startTime, endTime } = getTestTimeRange(24);

    const response = await app.inject({
      method: 'GET',
      url: '/api/services',
      query: { startTime, endTime },
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();

    data.forEach((service: { name: string; requestCount: number; errorCount: number; avgDuration: number }) => {
      expect(typeof service.name).toBe('string');
      expect(typeof service.requestCount).toBe('number');
      expect(typeof service.errorCount).toBe('number');
      // avgDuration can be number or string depending on ClickHouse response
      expect(['number', 'string'].includes(typeof service.avgDuration)).toBe(true);
    });
  });

  it('should handle empty time range gracefully', async () => {
    if (shouldSkip) {
      return;
    }

    // Use a very old time range that likely has no data
    const startTime = '2000-01-01T00:00:00Z';
    const endTime = '2000-01-01T01:00:00Z';

    const response = await app.inject({
      method: 'GET',
      url: '/api/services',
      query: { startTime, endTime },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      code: 0,
      data: [],
    });
  });
});
