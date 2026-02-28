# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.0.0 - All packages
- JavaScript - No significant plain JS usage detected

**Secondary:**
- Vue.js 3.5.0 - Frontend framework (compiled to JS)

## Runtime

**Environment:**
- Node.js 24.14.0+ - Runtime environment

**Package Manager:**
- pnpm - Workspace package management
- Lockfile: pnpm-lock.yaml (present in workspace root)

## Frameworks

**Core:**
- Fastify 5.0.0 - Backend web framework
- Vue 3.5.0 - Frontend UI framework
- Vue Router 4.5.0 - Frontend routing
- Element Plus 2.9.0 - UI component library
- Pinia 3.0.0 - Frontend state management

**Testing:**
- Vitest 3.0.0 - Unit testing framework
- jsdom 26.0.0 - DOM testing (frontend)

**Build/Dev:**
- Vite 5.0.0 - Frontend build tool
- tsx 4.0.0 - TS runtime for development
- vue-tsc 2.0.0 - Vue type checking

## Key Dependencies

**Critical:**
- @lucia/plugin-store-trace-clickhouse 0.1.0 - ClickHouse integration plugin
- @clickhouse/client 1.0.0 - ClickHouse database client
- axios 1.7.0 - HTTP client for frontend

**Infrastructure:**
- @fastify/cors 10.0.0 - CORS middleware
- @fastify/static 8.0.0 - Static file serving
- yaml 2.0.0 - YAML parsing
- pino 9.0.0 - Logging framework

## Configuration

**Environment:**
- Config loaded from config.yaml (primary)
- Environment variable overrides supported (LUCIA_*)
- ClickHouse connection via CLICKHOUSE_* env vars

**Build:**
- TypeScript configuration in each package
- Vite configuration with path aliases (@)
- ESLint with workspace-wide rules

## Platform Requirements

**Development:**
- Node.js >= 24.14.0
- pnpm package manager

**Production:**
- Node.js runtime
- ClickHouse database instance
- Frontend static file server (handled by Fastify)

---

*Stack analysis: 2026-02-28*