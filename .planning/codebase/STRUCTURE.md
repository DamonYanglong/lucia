# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
lucia/
├── packages/
│   ├── core/                    # Backend server package
│   │   ├── src/
│   │   │   ├── app.ts          # Main application entry
│   │   │   ├── config/         # Configuration management
│   │   │   ├── routes/         # API route definitions
│   │   │   ├── store/          # Plugin system
│   │   │   └── types/          # TypeScript type definitions
│   │   └── dist/               # Compiled output
│   ├── frontend/                # Vue.js frontend package
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── views/          # Page-level components
│   │   │   ├── stores/         # Pinia state management
│   │   │   ├── router/         # Vue Router configuration
│   │   │   └── api/            # API client utilities
│   │   └── dist/               # Built static files
│   └── plugins/                # Storage plugin packages
│       └── store-trace-clickhouse/
│           ├── src/            # ClickHouse plugin implementation
│           └── dist/           # Compiled output
├── package.json               # Root workspace configuration
└── .planning/codebase/        # Architecture documentation
```

## Directory Purposes

**packages/core/**
- Purpose: Backend server and API endpoints
- Contains: Fastify server, route handlers, configuration loading, plugin system
- Key files: `app.ts` (entry), `routes/traces.ts`, `store/interface.ts`

**packages/frontend/**
- Purpose: Web UI for viewing observability data
- Contains: Vue components, views, state management, routing
- Key files: `router/index.ts`, `stores/filter.ts`, `views/Traces.vue`

**packages/plugins/**
- Purpose: Extensible storage backends
- Contains: ClickHouse trace store plugin
- Key files: `store-trace-clickhouse/src/index.ts`

**packages/core/src/types/**
- Purpose: Shared TypeScript definitions across packages
- Contains: All type definitions for traces, services, errors, queries
- Key files: `index.ts` (main types file)

**packages/core/src/routes/**
- Purpose: API endpoint definitions
- Contains: RESTful route handlers for different data views
- Key files: `traces.ts`, `services.ts`, `errors.ts`, `slow.ts`

## Key File Locations

**Entry Points:**
- `packages/core/src/app.ts`: Backend server entry point
- `packages/frontend/src/main.js`: Frontend entry (generated)

**Configuration:**
- `packages/core/src/config/loader.ts`: Configuration loading logic
- `config.yaml`: YAML configuration file (not in repo)

**Core Logic:**
- `packages/core/src/store/interface.ts`: Plugin system interfaces
- `packages/core/src/store/plugin-loader.ts`: Plugin discovery
- `packages/plugins/store-trace-clickhouse/src/index.ts`: ClickHouse implementation

**Testing:**
- `packages/core/test/`: Unit tests (not present yet)
- `packages/frontend/test/`: Frontend tests (not present yet)

## Naming Conventions

**Files:**
- PascalCase for components: `Services.vue`, `Traces.vue`
- kebab-case for views: `TraceDetail.vue`
- camelCase for TypeScript files: `filter.ts`, `plugin-loader.ts`
- index.ts for entry points

**Directories:**
- kebab-case for feature directories: `trace-detail`, `slow-calls`
- plural form for collections: `routes`, `stores`, `views`

## Where to Add New Code

**New API Endpoint:**
- Primary code: `packages/core/src/routes/[name].ts`
- Tests: `packages/core/test/routes/[name].test.ts`

**New Frontend View:**
- Implementation: `packages/frontend/src/views/[Name].vue`
- Route: Update `packages/frontend/src/router/index.ts`
- Tests: `packages/frontend/test/views/[Name].vue.test.ts`

**New Storage Plugin:**
- Implementation: `packages/plugins/store-[name]/src/index.ts`
- Interface: Extend `packages/core/src/store/interface.ts`
- Types: Add to `packages/core/src/types/index.ts`

**New Configuration:**
- Schema: Update `packages/core/src/config/loader.ts`
- Default: Update defaultConfig object

## Special Directories

**dist/ directories:**
- Purpose: Compiled output for each package
- Generated: Yes (via build scripts)
- Committed: Yes (for deployment)

**node_modules/ directories:**
- Purpose: Package dependencies
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-28*