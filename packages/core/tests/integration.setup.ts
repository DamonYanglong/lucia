/**
 * Integration Test Configuration
 *
 * This file provides configuration for integration tests that connect to a real ClickHouse database.
 *
 * Environment Variables:
 * - TEST_CLICKHOUSE_HOST: ClickHouse host (default: localhost)
 * - TEST_CLICKHOUSE_PORT: ClickHouse port (default: 8123)
 * - TEST_CLICKHOUSE_DATABASE: Database name (default: otel)
 * - TEST_CLICKHOUSE_USER: Username (default: default)
 * - TEST_CLICKHOUSE_PASSWORD: Password (default: empty)
 *
 * Running Tests:
 * 1. Ensure ClickHouse is running with test data
 * 2. Run: pnpm test:integration
 * 3. Or with custom config: TEST_CLICKHOUSE_HOST=192.168.1.100 pnpm test:integration
 */

import { createClient } from '@clickhouse/client';

export interface TestClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Get ClickHouse configuration from environment variables
 */
export function getTestConfig(): TestClickHouseConfig {
  return {
    host: process.env.TEST_CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.TEST_CLICKHOUSE_PORT || '8123', 10),
    database: process.env.TEST_CLICKHOUSE_DATABASE || 'otel',
    username: process.env.TEST_CLICKHOUSE_USER || 'default',
    password: process.env.TEST_CLICKHOUSE_PASSWORD || '',
  };
}

/**
 * Check if ClickHouse database is available and has required tables
 * Tests should be skipped if the database is not available
 */
export async function isDatabaseAvailable(config: TestClickHouseConfig): Promise<boolean> {
  try {
    const client = createClient({
      host: `http://${config.host}:${config.port}`,
      database: config.database,
      username: config.username,
      password: config.password,
    });

    // Test connection
    await client.ping();

    // Check if required tables exist
    const result = await client.query({
      query: "EXISTS TABLE open_telemetry_traces",
    });
    const data = await result.json() as { data?: Array<{ result: number }> };
    const tableExists = data.data?.[0]?.result === 1;

    await client.close();
    return tableExists;
  } catch {
    return false;
  }
}

/**
 * Create a ClickHouse client for testing
 */
export function createTestClient(config: TestClickHouseConfig) {
  return createClient({
    host: `http://${config.host}:${config.port}`,
    database: config.database,
    username: config.username,
    password: config.password,
  });
}

/**
 * Generate time range for queries (last 24 hours by default)
 */
export function getTestTimeRange(hoursAgo: number = 24): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

  return {
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  };
}

/**
 * Skip test suite if database is not available
 * Use in beforeAll hook
 */
export async function checkDatabaseOrSkip(config: TestClickHouseConfig): Promise<boolean> {
  const available = await isDatabaseAvailable(config);
  if (!available) {
    console.log(`Skipping tests: ClickHouse not available or tables missing at ${config.host}:${config.port}/${config.database}`);
  }
  return available;
}
