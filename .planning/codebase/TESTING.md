# Testing Patterns

**Analysis Date:** 2024-12-28

## Test Framework

**Runner:**
- Vitest v3.0.0
- Config files: `packages/*/vitest.config.ts`
- Global test functions enabled

**Assertion Library:**
- Native Vitest assertions (`expect`, `describe`, `it`)
- No additional assertion library detected

**Run Commands:**
```bash
pnpm test              # Run all tests
pnpm --filter @lucia/core test  # Run specific package tests
pnpm --filter @lucia/frontend test  # Run frontend tests
```

## Test File Organization

**Location:**
- Co-located with source: `src/**/*.test.ts`
- Test files maintain same directory structure as source

**Naming:**
- `.test.ts` suffix: `plugin-loader.test.ts`
- No `.spec.ts` files detected

**Structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('plugin-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPlugins', () => {
    it('should return empty plugins when no config', async () => {
      // test implementation
    });
  });
});
```

## Test Structure

**Suite Organization:**
- Top-level `describe` matches file/function name
- Nested `describe` for logical groupings
- Test names use "should" convention

**Setup/Teardown:**
- `beforeEach` for clearing mocks
- `afterEach` when needed (e.g., plugin cleanup)
- No global setup detected

**Patterns:**
- Async/await for async operations
- Mock setup in `beforeEach`
- Clear assertions with `.toBe()`, `.toEqual()`, etc.

## Mocking

**Framework:**
- Vi mocking utilities (`vi.fn()`, `vi.mock()`)
- Test-specific mocks with `doMock()`

**Patterns:**
```typescript
// Static mock
vi.mock('@clickhouse/client', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Dynamic mock
vi.doMock('@lucia/plugin-store-trace-clickhouse', () => ({
  default: {
    name: 'clickhouse',
    init: mockInit,
  },
}));
```

**What to Mock:**
- External dependencies (ClickHouse client)
- Dynamic imports
- Time-sensitive operations

**What NOT to Mock:**
- Pure utility functions
- TypeScript interfaces/types
- Simple data transformations

## Fixtures and Factories

**Test Data:**
- Defined inline in test files
- No separate fixture files detected
- Complex test data in `packages/frontend/src/api/index.test.ts`

**Example:**
```typescript
const mockSpans: Span[] = [
  {
    timestamp: '2024-01-01T00:00:00.000Z',
    traceId: 'trace-1',
    // ... complete span data
  }
];
```

**Location:**
- Test data defined at top of test files
- Shared constants for related tests

## Coverage

**Requirements:**
- Target coverage: Not explicitly defined
- Minimum coverage: Not enforced
- Coverage provider: V8

**View Coverage:**
```bash
# Not explicitly configured in vitest.config.ts
# V8 coverage runs with tests
```

**Coverage Configuration:**
- Include: `['src/**/*.ts']`
- Exclude: `['src/**/*.test.ts', 'src/app.ts']`
- Reporter: ['text', 'json', 'html']

## Test Types

**Unit Tests:**
- Scope: Individual functions and components
- Location: `packages/core/src/store/plugin-loader.test.ts`
- Coverage: Plugin loading logic

**Integration Tests:**
- Scope: API endpoints, database operations
- Coverage: ClickHouse plugin integration
- Mock external dependencies

**E2E Tests:**
- Status: Not implemented
- Framework: Not configured

## Common Patterns

**Async Testing:**
```typescript
it('should load trace plugin', async () => {
  const plugins = await loadPlugins(config);
  expect(plugins.trace).toBeDefined();
});
```

**Error Testing:**
```typescript
it('should handle plugin init failure gracefully', async () => {
  await expect(loadPlugins(config)).rejects.toThrow();
});
```

**Mock Setup:**
```typescript
beforeEach(async () => {
  vi.clearAllMocks();
});
```

**Paginated Response Testing:**
```typescript
const result = await plugin.getTraces({...});
expect(result.list).toHaveLength(1);
expect(result.total).toBe(100);
expect(result.page).toBe(1);
```

## Testing Challenges

**Mocking Complexity:**
- ClickHouse client mock requires nested structure
- JSON response mocking needed for multiple queries
- Time-based queries need careful mock setup

**Test Isolation:**
- Good isolation with `vi.clearAllMocks()`
- Plugin initialization state needs careful management
- No shared state between tests

**Edge Cases Covered:**
- Empty results
- Error conditions
- Null/undefined inputs
- Multiple root spans
- Orphan spans in tree building

## Areas for Improvement

**Coverage:**
- No test configuration files (vitest.config.ts varies by package)
- Inconsistent coverage reporting setup
- E2E tests missing
- API integration tests missing real HTTP calls

**Mocking:**
- Complex nested mocks for database responses
- Time-dependent tests could benefit from time mocking
- No fixture management system