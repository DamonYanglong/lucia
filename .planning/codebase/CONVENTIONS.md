# Coding Conventions

**Analysis Date:** 2024-12-28

## Naming Patterns

**Files:**
- PascalCase for TypeScript interface files: `packages/core/src/types/index.ts`
- kebab-case for regular TypeScript files: `packages/core/src/config/loader.ts`
- snake_case for test files: `packages/core/src/store/plugin-loader.test.ts`
- Vue files use PascalCase: `packages/frontend/src/App.vue`

**Functions:**
- camelCase for all functions: `loadConfig()`, `getTraces()`, `buildSpanTree()`
- Async functions use descriptive names: `loadPlugins()`, `formatDuration()`
- Factory/prefixed for utilities: `envOrDefault()`, `envNumber()`

**Variables:**
- camelCase: `const fastify = Fastify({...})`
- const/let/var based on mutability
- Destructuring pattern: `const { trace, metric } = config`

**Types/Interfaces:**
- PascalCase for interfaces: `export interface Config`
- Interface names end with actual type: `interface Span`, `interface PaginatedResult<T>`
- Generic parameters use single letter: `T`, `K`, `V`

## Code Style

**Formatting:**
- TypeScript formatter: Standard with `tsconfig.base.json`
- No additional Prettier config detected (using default settings)
- Line length: Follows typical editor settings
- Indentation: Spaces (no tabs)

**Linting:**
- ESLint v9 detected in root package.json
- No custom ESLint config found using legacy formats (.eslintrc*)
- Standard ESLint rules likely in effect
- Script: `pnpm lint packages`

## Import Organization

**Order:**
1. Standard library imports: `import { readFile } from 'fs/promises'`
2. External imports: `import Fastify from 'fastify'`
3. Internal/relative imports: `import { loadConfig } from './config/loader'`

**Path Aliases:**
- No custom path aliases detected
- Relative imports are used: `./config/loader`, `../frontend/dist`

**Grouping:**
- Imports are grouped by origin
- No empty lines between groups
- Multi-line imports organized consistently

## Error Handling

**Patterns:**
```typescript
try {
  const config = await loadConfig();
} catch (err) {
  fastify.log.error(err, 'Failed to load plugins');
  process.exit(1);
}
```

- Try-catch blocks with descriptive error messages
- Error includes context: 'Failed to load plugins'
- Critical errors call `process.exit(1)`
- Use of logging framework (pino)

**Error Messages:**
- User-friendly messages in user-facing code
- Technical details in logs
- Consistent error format across API responses

## Comments

**When to Comment:**
- Complex logic in config loading
- Plugin architecture explanation
- Tree building algorithms in `buildSpanTree()`
- Performance-critical operations

**JSDoc/TSDoc:**
- Not extensively used in current codebase
- Type definitions are self-documenting
- Some TODO comments present

## Function Design

**Size:**
- Functions typically <50 lines
- Large functions like `loadConfig()` broken into smaller helpers (`envOrDefault`, `envNumber`)
- Single responsibility principle applied

**Parameters:**
- Limited parameters (3-5 typical)
- Object pattern for complex parameters
- Optional parameters with defaults

**Return Values:**
- Consistent return types
- Union types for nullable results
- No void unless explicitly needed

## Module Design

**Exports:**
- Barrel exports for public interfaces: `export * from './loader'`
- Named exports preferred over default exports
- Type exports alongside value exports

**Barrel Files:**
- `packages/core/src/config/index.ts` re-exports from loader
- `packages/frontend/src/api/index.ts` contains types, API functions, and utilities

## File Organization

**Structure:**
- Split by feature/domain: config, store, routes
- Test files co-located with source files: `src/**/*.test.ts`
- No monolithic files; focused modules
- Plugin architecture allows extensibility

**Vue Files:**
- `<script setup>` syntax
- Component-specific styles in `<style>`
- No external CSS imports
- Consistent class naming (kebab-case for utility classes)