import { defineConfig } from 'vitest/config';

/**
 * Integration Test Configuration
 *
 * Run integration tests with: pnpm test:integration
 *
 * Environment Variables:
 * - TEST_CLICKHOUSE_HOST: ClickHouse host (default: localhost)
 * - TEST_CLICKHOUSE_PORT: ClickHouse port (default: 8123)
 * - TEST_CLICKHOUSE_DATABASE: Database name (default: otel)
 * - TEST_CLICKHOUSE_USER: Username (default: default)
 * - TEST_CLICKHOUSE_PASSWORD: Password (default: empty)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000, // 30 seconds for database operations
    hookTimeout: 30000,
    // Run tests sequentially to avoid connection issues
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
