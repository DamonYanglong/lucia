# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Monorepo with Plugin-Based Architecture

**Key Characteristics:**
- Frontend/backend separation with shared TypeScript types
- Plugin-based storage system for extensible data persistence
- Fastify HTTP server with RESTful API design
- Vue 3 frontend with Element Plus UI library
- TypeScript throughout for type safety

## Layers

**Core Backend Layer:**
- Purpose: API server, plugin management, business logic
- Location: `packages/core/src/`
- Contains: Server entry, routes, store interfaces, configuration
- Depends on: Fastify framework, ClickHouse plugin
- Used by: Frontend (via HTTP API)

**Frontend Layer:**
- Purpose: User interface, user interaction, data visualization
- Location: `packages/frontend/src/`
- Contains: Vue components, views, stores, API client
- Depends on: Vue 3, Element Plus, Pinia state management
- Used by: End users (browser)

**Plugin Layer:**
- Purpose: Data storage implementations
- Location: `packages/plugins/`
- Contains: Store plugins (ClickHouse, potential future plugins)
- Depends on: Core interfaces
- Used by: Core (for data persistence)

**Shared Layer:**
- Purpose: Type definitions and common utilities
- Location: `packages/core/src/types/`
- Contains: Shared TypeScript interfaces
- Depends on: Nothing
- Used by: Core, Frontend, Plugins

## Data Flow

**1. API Request Flow:**
```
Frontend (HTTP) → Fastify Routes → Store Plugins → Database
```

**2. Plugin Loading:**
```
Server Startup → Load Config → Load Plugins → Register Routes
```

**3. Trace Data Flow:**
```
OpenTelemetry Data → ClickHouse → Plugin Interface → API Response → Frontend Display
```

**State Management:**
- Frontend: Pinia stores (filter, trace data)
- Backend: Store plugins handle state persistence
- No global state sharing across layers

## Key Abstractions

**Store Plugin Interface:**
- Purpose: Abstract data storage behind common interface
- Examples: `packages/core/src/store/interface.ts`
- Pattern: Interface segregation for different data types (trace, metrics, logs)

**Query Objects:**
- Purpose: Encapsulate filtering and pagination parameters
- Examples: `TraceQuery`, `ServiceQuery`, `ErrorQuery`
- Pattern: Immutable objects with validation

**Paginated Result:**
- Purpose: Standardized response format for paginated data
- Examples: `PaginatedResult<T>` interface
- Pattern: Consistent across all endpoints

## Entry Points

**Backend Entry Point:**
- Location: `packages/core/src/app.ts`
- Triggers: Server startup, plugin loading, route registration
- Responsibilities: Fastify server initialization, CORS, static files

**Frontend Entry Point:**
- Location: `packages/frontend/src/main.ts`
- Triggers: Vue app creation, state setup, routing
- Responsibilities: App initialization, plugin registration, mounting

**Plugin Entry Point:**
- Location: `packages/plugins/store-trace-clickhouse/src/index.ts`
- Triggers: Plugin initialization with ClickHouse client
- Responsibilities: Database connection, query implementation

## Error Handling

**Strategy:** Centralized error handling with status codes

**Patterns:**
- API responses use standardized format: `{ code: number, message?: string, data?: any }`
- Store plugins check availability before operations
- Fastify handles HTTP errors with appropriate status codes

## Cross-Cutting Concerns

**Logging:**
- Backend: Pino logger with pretty transport
- Frontend: Console logging with Element Plus UI

**Validation:**
- Input validation via TypeScript interfaces
- Query parameters validated at route level
- Plugin configuration validated during initialization

**Authentication:**
- Not implemented yet
- CORS configured for development

---

*Architecture analysis: 2026-02-28*