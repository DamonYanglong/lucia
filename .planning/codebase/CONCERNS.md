# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

### Weak Type Safety
**Issue:** Heavy use of `any` type throughout the codebase reduces type safety
- Files: `packages/core/src/store/plugin-loader.ts`, `packages/plugins/store-trace-clickhouse/src/index.ts`
- Impact: Type checking bypassed, potential runtime errors
- Fix approach: Define specific interfaces for ClickHouse query responses, replace `any` with proper types

### Inconsistent Error Handling
**Issue:** Limited try-catch blocks, no comprehensive error handling
- Files: `packages/core/src/routes/traces.ts`, `packages/plugins/store-trace-clickhouse/src/index.ts`
- Impact: Database connection failures not handled gracefully
- Fix approach: Add proper error handling for all database operations, implement circuit breakers for ClickHouse

### Console Logging in Production
**Issue:** `console.log` statement in app startup
- Files: `packages/core/src/app.ts` line 57
- Impact: Dev-specific code in production
- Fix approach: Replace with proper logger or conditional logging

## Security Considerations

### Hardcoded Configuration
**Issue:** Default ClickHouse credentials in config loader
- Files: `packages/core/src/config/loader.ts` lines 74-78
- Risk: Potential security exposure if defaults are used in production
- Current mitigation: Environment variable override available
- Recommendations: Enforce secure defaults, require configuration in production

### No Input Validation
**Issue:** Route parameters not validated before processing
- Files: `packages/core/src/routes/traces.ts`
- Risk: SQL injection potential through query parameters
- Recommendations: Add input validation using Zod or similar

### CORS Configuration
**Issue:** CORS allows all origins (`origin: true`)
- Files: `packages/core/src/app.ts` line 35
- Risk: Cross-origin attacks
- Recommendations: Configure specific allowed origins in production

## Performance Bottlenecks

### Large Trace Processing
**Issue:** Frontend limits trace display to 500 spans
- Files: `packages/frontend/src/views/TraceDetail.vue` line 18
- Problem: Performance degrades with large traces
- Cause: No virtual scrolling, DOM manipulation
- Improvement path: Implement virtual scrolling for span list

### SQL Query Optimization
**Issue:** Multiple queries for trace data (count + data)
- Files: `packages/plugins/store-trace-clickhouse/src/index.ts`
- Problem: Database round trips for pagination
- Cause: ClickHouse doesn't support LIMIT with total count
- Improvement path: Use ClickHouse `LIMIT` with `SETTINGS` for better performance

### No Connection Pooling
**Issue:** ClickHouse client created per request
- Files: `packages/plugins/store-trace-clickhouse/src/index.ts` line 37
- Problem: Connection overhead
- Cause: Single instance reused but no pooling configuration
- Improvement path: Configure connection pool settings

## Fragile Areas

### Hardcoded Table Names
**Issue: Database table names hardcoded throughout
- Files: `packages/plugins/store-trace-clickhouse/src/index.ts`
- Why fragile: Schema changes require code updates
- Safe modification: Extract to constants or configuration
- Test coverage: Missing integration tests for schema changes

### Plugin Loading
**Issue: Plugin loading relies on dynamic imports with fallback logic
- Files: `packages/core/src/store/plugin-loader.ts`
- Why fragile: External plugin naming convention not enforced
- Safe modification: Add plugin validation before initialization
- Test coverage: Limited test scenarios for external plugins

### Date Time Handling
**Issue: Multiple date format conversions
- Files: `packages/plugins/store-trace-clickhouse/src/index.ts`, `packages/frontend/src/stores/filter.ts`
- Why fragile: ClickHouse format vs ISO format mixing
- Safe modification: Centralize date conversion utilities
- Test coverage: Missing time zone edge case tests

## Scaling Limits

### Single ClickHouse Instance
**Issue: No database sharding or replication
- Current capacity: Limited by single ClickHouse node
- Limit: Storage and query performance bottleneck
- Scaling path: Implement ClickHouse cluster support

### No Caching Layer
**Issue: No caching for frequent queries
- Current capacity: Direct database queries for all requests
- Limit: Database connection limits, query performance
- Scaling path: Add Redis caching for popular queries

## Dependencies at Risk

### ClickHouse Client
**Risk:** `@clickhouse/client` is new library
- Impact: Breaking changes possible
- Migration plan: Monitor for updates, implement test suite

### Vue 3 Composition API
**Risk:** New framework patterns
- Impact: Migration complexity
- Migration plan: Follow Vue 3 best practices, avoid deprecated patterns

## Missing Critical Features

### Authentication/Authorization
**Problem:** No security layer for API access
- Blocks: Production deployment with sensitive data
- Priority: High

### Rate Limiting
**Problem:** No protection against abuse
- Blocks: Public deployment
- Priority: Medium

### Monitoring/Metrics
**Problem:** No self-monitoring
- Blocks: Performance troubleshooting
- Priority: Medium

## Test Coverage Gaps

### Integration Tests Missing
**What's not tested:** API endpoints with database
- Files: `packages/core/src/routes/*`
- Risk: Breaking changes undetected
- Priority: High

### Error Scenarios
**What's not tested:** Database connection failures, timeouts
- Files: `packages/plugins/store-trace-clickhouse/src/index.ts`
- Risk: Runtime errors in production
- Priority: High

### Frontend Error Handling
**What's not tested:** API failure scenarios
- Files: `packages/frontend/src/views/*`
- Risk: Poor user experience on failures
- Priority: Medium

---

*Concerns audit: 2026-02-28*