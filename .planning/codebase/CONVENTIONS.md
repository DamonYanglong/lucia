# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- PascalCase for interfaces and type definitions
- camelCase for functions and variables
- kebab-case for route files (e.g., traces.ts)
- snake_case for database-related constants

**Functions:**
- Descriptive names that explain the purpose
- Async functions end with meaningful context (e.g., getTraces, loadPlugins)
- Getter functions prefixed with "get" (e.g., getTraces, getTraceById)

**Variables:**
- camelCase for all variables
- Meaningful names: `storePlugins` not `sp`
- Boolean variables prefixed with "is", "has", or "can" when appropriate

**Types:**
- Interface names prefixed with "I" (e.g., ITraceStorePlugin)
- Type definitions use PascalCase
- Generic parameters use T, U, V when appropriate

## Code Style

**Formatting:**
- Uses TypeScript strict mode
- 2-space indentation
- No trailing commas
- Semicolons required

**TypeScript Configuration:**
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Declaration maps included
- Source maps included

**Linting:**
- No explicit ESLint configuration detected
- TypeScript compiler enforces strict rules
- No unused variables or parameters allowed

## Import Organization

**Order:**
1. Node.js imports (if any)
2. External library imports
3. Relative imports
4. Type imports grouped at bottom

**Path Aliases:**
- Not configured in tsconfig.base.json
- Uses relative imports throughout

**Import Style:**
- Named imports preferred over namespace imports
- Type imports use `import type`
- Dynamic imports used for plugin loading

```typescript
// Example: Traces route
import type { FastifyPluginAsync } from 'fastify';
import { storePlugins } from '../app';
import type { TraceQuery } from '../types';

const tracesRoutes: FastifyPluginAsync = async (fastify) => {
  // Route implementation
};
```

## Error Handling

**API Error Pattern:**
```typescript
// Check for plugin availability
if (!storePlugins.trace) {
  return reply.code(503).send({ code: 503, message: 'Trace store not configured' });
}

// Check for resource existence
if (!trace) {
  return reply.code(404).send({ code: 404, message: 'Trace not found' });
}
```

**Success Response Format:**
```typescript
return { code: 0, data: result };
```

**Plugin Initialization:**
```typescript
try {
  await storePlugins.trace.getTraces(query);
} catch (error) {
  // Plugin failures bubble up
  throw new Error('Failed to retrieve traces');
}
```

## Comments

**When to Comment:**
- Complex logic requires explanation
- Plugin architecture needs context
- Type interfaces benefit from documentation
- Configuration and setup sections

**Type Comments:**
```typescript
// Trace 存储插件接口
export interface ITraceStorePlugin {
  name: string;
  version: string;
  type: 'trace';

  init(config: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;

  getServices(query: ServiceQuery): Promise<Service[]>;
  getTraces(query: TraceQuery): Promise<PaginatedResult<TraceListItem>>;
  // ... other methods
}
```

## Function Design

**Size:**
- Functions kept small and focused
- Single responsibility principle followed
- 30-100 lines typical for most functions

**Parameters:**
- Objects used for multiple parameters
- Default values provided in the function body
- Type-safe query objects used consistently

**Return Values:**
- Consistent return types (e.g., PaginatedResult<T>)
- null/undefined only for not found cases
- Error throwing for exceptional cases

## Module Design

**Exports:**
- Default exports for main entry points
- Named exports for utilities and interfaces
- Barrel files not used

**Plugin Architecture:**
```typescript
// Plugin interfaces defined separately
export interface StorePlugins {
  trace?: ITraceStorePlugin;
  metric?: IMetricStorePlugin;
  log?: ILogStorePlugin;
}

// Plugin loader handles dynamic imports
export async function loadPlugins(config: PluginConfig): Promise<StorePlugins>
```

## Vue Component Patterns

**Script Setup:**
```vue
<script setup lang="ts">
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFilterStore = defineStore('filter', () => {
  // Implementation
});
</script>
```

**Template:**
- Element Plus components used consistently
- Vue 3 Composition API
- Reactive state with ref/computed
- No template complexity

## Store Patterns

**Pinia Stores:**
- Named stores with descriptive names
- Reactive state with ref()
- Computed properties for derived state
- Actions as functions returning object

```typescript
export const useFilterStore = defineStore('filter', () => {
  const service = ref('');
  const timeRange = ref('24h');

  const startTime = computed(() => {
    // Complex computed logic
  });

  function setService(s: string) {
    service.value = s;
  }

  return {
    service,
    timeRange,
    startTime,
    setService,
  };
});
```

## API Patterns

**Route Structure:**
```typescript
const tracesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/traces', async (request, reply) => {
    const query = request.query as TraceQuery;
    const result = await storePlugins.trace.getTraces(query);
    return { code: 0, data: result };
  });
};
```

**Query Objects:**
- Consistent query interface across endpoints
- Default values provided in store
- Type-safe parameters

## Testing Patterns

**Test Structure:**
- Vitest testing framework
- describe/it pattern with global setup
- Mocking via vi.mock
- beforeEach for test isolation

---

*Convention analysis: 2026-02-28*