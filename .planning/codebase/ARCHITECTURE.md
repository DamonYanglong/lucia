# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Monorepo with plugin-based microservices architecture

**Key Characteristics:**
- Workspace-based monorepo (pnpm)
- Plugin-based storage system for trace data
- Fastify backend with Vue 3 frontend
- ClickHouse as primary data store
- OpenTelemetry trace data format

## Layers

**Core Backend Layer:**
- Purpose: Main application server and API endpoints
- Location: `packages/core/src/`
- Contains: Fastify server, routes, configuration, plugin system
- Depends on: Store plugins, Fastify framework
- Used by: Frontend via HTTP API

**Storage Plugin Layer:**
- Purpose: Abstract data storage implementation
- Location: `packages/plugins/store-trace-clickhouse/src/`
- Contains: ClickHouse trace store plugin
- Depends on: ClickHouse client, core types
- Used by: Core backend for data operations

**Frontend Layer:**
- Purpose: UI for viewing traces, errors, and metrics
- Location: `packages/frontend/src/`
- Contains: Vue components, views, stores, API client
- Depends on: Vue ecosystem, Element Plus, Axios
- Used by: End users via browser

**Type System Layer:**
- Purpose: Shared TypeScript definitions
- Location: `packages/core/src/types/`
- Contains: Trace, Service, Error, SlowCall type definitions
- Depends on: TypeScript compiler
- Used by: All packages (types exported)

## Data Flow

**Trace Data Ingestion:**
1. OpenTelemetry traces stored in ClickHouse
2. ClickHouse plugin provides storage abstraction
3. Core server loads plugin at startup
4. Routes expose data via REST API endpoints

**User Query Flow:**

1. Frontend makes API request with query parameters
2. Backend route calls appropriate store method
3. Store plugin executes ClickHouse query
4. Results returned to frontend with pagination

**State Management:**
- Frontend: Pinia for filter state and UI state
- Backend: Fastify request-scoped state
- Storage: Plugin instances with connection pooling

## Key Abstractions

**StorePlugin Interface:**
- Purpose: Abstract different storage backends
- Examples: `packages/core/src/store/interface.ts`
- Pattern: Plugin architecture with type registration

**PaginatedResult:**
- Purpose: Standardized paginated response format
- Examples: `packages/core/src/types/index.ts` (lines 118-123)
- Pattern: Generic type with pagination metadata

**Trace Query Types:**
- Purpose: Standardized query parameters
- Examples: TraceQuery, ServiceQuery, ErrorQuery, SlowQuery
- Pattern: Strongly-typed query objects with validation

## Entry Points

**Backend Server:**
- Location: `packages/core/src/app.ts`
- Triggers: `pnpm dev` command
- Responsibilities: Fastify server setup, plugin loading, route registration

**Frontend Dev Server:**
- Location: `packages/frontend/src/main.js` (generated)
- Triggers: `pnpm dev:frontend` command
- Responsibilities: Vue development server with hot reload

**Plugin System:**
- Location: `packages/core/src/store/plugin-loader.ts`
- Triggers: Application startup
- Responsibilities: Dynamic plugin discovery and loading

## Error Handling

**Strategy:** Centralized error handling with Fastify error handlers

**Patterns:**
- Try/catch in route handlers
- Fastify error registration for global error handling
- Plugin-specific error logging
- Graceful degradation when plugins fail

## Cross-Cutting Concerns

**Logging:** Pino logger with pretty printing in dev
**Validation:** TypeScript types + runtime validation in queries
**Authentication:** Not implemented (Open for future)
**CORS:** Enabled for all origins

---

*Architecture analysis: 2026-02-28*