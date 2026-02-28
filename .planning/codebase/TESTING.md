# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest 3.0.0
- Test files use .test.ts extension
- Test runner config per package

**Assertion Library:**
- Built-in expect from vitest
- No external assertion library used

**Run Commands:**
```bash
# Core package
npm test                # vitest
npm run test:coverage  # vitest with coverage

# Frontend package
npm test                # vitest
npm run test:coverage  # vitest with coverage

# Plugin package
npm test                # vitest
```

## Test File Organization

**Location:**
- Co-located with source files
- Test files in same directory as implementation
- Example: `plugin-loader.test.ts` alongside `plugin-loader.ts`

**Naming:**
- .test.ts suffix for all test files
- Descriptive test file names
- No separate test directories

**Structure:**
```typescript
// plugin-loader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPlugins } from './plugin-loader';

describe('plugin-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPlugins', () => {
    it('should return empty plugins when no config', async () => {
      // Test implementation
    });
  });
});
```

## Test Structure

**Suite Organization:**
- Group tests by functionality
- describe blocks for logical grouping
- it blocks for specific test cases
- beforeEach for test cleanup

**Patterns:**
```typescript
describe('plugin-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPlugins', () => {
    it('should return empty plugins when no config', async () => {
      const plugins = await loadPlugins({});

      expect(plugins).toEqual({});
      expect(plugins.trace).toBeUndefined();
      expect(plugins.metric).toBeUndefined();
      expect(plugins.log).toBeUndefined();
    });
  });
});
```

## Mocking

**Framework:**
- vi.mock from vitest
- vi.fn() for function mocks
- vi.clearAllMocks() in beforeEach

**Mock Patterns:**
```typescript
// Dynamic import mocking
vi.mock('@lucia/plugin-store-trace-clickhouse', () => ({
  default: {
    name: 'clickhouse',
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

// Function mocking
const mockInit = vi.fn().mockResolvedValue(undefined);
```

**What to Mock:**
- External dependencies (clickhouse client)
- Dynamic imports
- Plugin interfaces
- Time-based operations

**What NOT to Mock:**
- Core business logic
- Type definitions
- Simple utility functions
- Vue reactive systems in frontend

## Fixtures and Factories

**Test Data:**
```typescript
// API test fixtures
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
    spanAttributes: {},
    resourceAttributes: {},
    events: [],
    links: [],
  },
];
```

**Location:**
- Defined inline in test files
- No separate test data utilities
- Minimal fixtures for each test

## Coverage

**Requirements:**
- V8 coverage provider
- Multi-format output: text, json, html
- Coverage excludes test files and entry points

**View Coverage:**
```bash
# Core package coverage
npm run test:coverage

# Coverage reports generated in:
# - text: terminal output
# - json: dist/coverage/coverage.json
# - html: dist/coverage/index.html
```

**Coverage Configuration:**
```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/app.ts'],
}
```

## Test Types

**Unit Tests:**
- Focus on individual functions and utilities
- Mock external dependencies
- Isolated test environment
- Examples:
  - `plugin-loader.test.ts`
  - `api/index.test.ts`

**Integration Tests:**
- Test API endpoints with plugin integration
- Test plugin initialization and configuration
- Limited integration tests currently present

**E2E Tests:**
- Not implemented
- Playwright not configured
- Frontend testing limited to unit tests

## Common Patterns

**Async Testing:**
```typescript
it('should load trace plugin', async () => {
  const config = {
    trace: {
      plugin: 'clickhouse',
      config: { host: 'localhost', port: 8123 },
    },
  };

  const plugins = await loadPlugins(config);

  expect(plugins.trace).toBeDefined();
  expect(plugins.trace!.name).toBe('clickhouse');
});
```

**Error Testing:**
```typescript
it('should handle plugin init failure gracefully', async () => {
  vi.doMock('@lucia/plugin-store-trace-clickhouse', () => ({
    default: {
      name: 'failing-plugin',
      init: vi.fn().mockRejectedValue(new Error('Connection failed')),
    },
  }));

  const config = { trace: { plugin: 'clickhouse', config: { host: 'invalid-host' } } };

  await expect(loadPlugins(config)).rejects.toThrow();
});
```

**Vue Component Testing:**
- Limited component testing implemented
- Components tested for logic (time filters, service filters)
- DOM interaction testing not present

**Store Testing:**
- Pinia stores tested for basic functionality
- State mutations and getters tested
- Computed properties tested

## Test Environment

**Core Package:**
- Environment: node
- Globals enabled
- No browser APIs required

**Frontend Package:**
- Environment: jsdom
- Globals enabled
- Vue 3 and Element Plus available

**Plugin Package:**
- Environment: node
- Globals enabled
- ClickHouse client mocked

## Test Isolation

**BeforeEach Pattern:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**Test Independence:**
- No shared state between tests
- Fresh mock setup for each test
- Isolated plugin loading logic

## Current Test Coverage

**Core Package:**
- Plugin loader functionality tested
- Error handling covered
- Plugin interfaces tested
- API routes not fully tested

**Frontend Package:**
- API utility functions tested (span tree building, formatting)
- Pinia stores tested for state management
- Vue components minimally tested
- API integration tests missing

**Plugin Package:**
- ClickHouse plugin interface tested
- Plugin loading covered
- Actual ClickHouse integration not tested

## Testing Gaps

**Missing Coverage:**
- API endpoint integration tests
- Frontend component user interactions
- Error boundary testing
- Authentication/authorization flows
- Performance-related tests
- Multi-plugin scenarios

**Priority Areas for Improvement:**
- E2E tests for critical user flows
- API integration with real plugin backends
- Component testing with user interactions
- Load testing for performance
- Security-focused tests

---

*Testing analysis: 2026-02-28*