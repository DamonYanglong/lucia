# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript ^5.0.0 - All packages use TypeScript
  - `packages/core/src` - Backend server and plugins
  - `packages/frontend/src` - Vue.js frontend application
  - `packages/plugins/store-trace-clickhouse/src` - ClickHouse integration plugin

## Runtime

**Environment:**
- Node.js ^24.14.0 - Minimum required version
- ES modules - All packages use `"type": "module"`

**Package Manager:**
- pnpm - Workspace-based monorepo management
- Lockfile: pnpm-lock.yaml present

## Frameworks

**Backend (Core):**
- Fastify ^5.0.0 - Web framework for REST API
  - Entry point: `packages/core/src/app.ts`
  - Routes: `/api/traces`, `/api/services`, `/api/errors`, `/api/slow`
  - Built-in CORS support with `@fastify/cors`

**Frontend:**
- Vue ^3.5.0 - Progressive JavaScript framework
  - Entry point: `packages/frontend/src/main.ts`
  - Router: Vue Router ^4.5.0
  - State: Pinia ^3.0.0
  - UI: Element Plus ^2.9.0 with icons

**Build/Dev:**
- Vite ^5.0.0 - Frontend build tool
  - Config: `packages/frontend/vite.config.ts`
  - Hot module replacement in development
- tsx ^4.0.0 - TypeScript execution environment for development

## Key Dependencies

**Critical:**
- @clickhouse/client ^1.0.0 - ClickHouse database client for trace storage
- fastify ^5.0.0 - Web server framework
- pino ^9.0.0 - Logging framework with pretty transport

**Infrastructure:**
- yaml ^2.0.0 - YAML configuration parsing
- axios ^1.7.0 - HTTP client for frontend API calls

## Configuration

**Environment:**
- Config loaded from YAML files (`config.yaml`)
  - Fallback paths: `config.yaml`, `../../config.yaml`, `../config.yaml`
  - Environment variable overrides supported
- Key env vars:
  - `LUCIA_PORT` - Server port (default: 3000)
  - `LUCIA_HOST` - Server host (default: 0.0.0.0)
  - `CLICKHOUSE_*` - Database connection parameters

**Build:**
- TypeScript configuration in each package
  - `packages/core/tsconfig.json`
  - `packages/frontend/tsconfig.json`
  - `packages/plugins/store-trace-clickhouse/tsconfig.json`

## Platform Requirements

**Development:**
- Node.js ^24.14.0
- pnpm package manager

**Production:**
- Node.js ^24.14.0
- ClickHouse database for trace storage
- Optional: Static file serving for frontend

---

*Stack analysis: 2026-02-28*
```