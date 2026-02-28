# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
/Users/damon/IdeaProjects/lucia/
├── docker/                    # Docker configuration files
├── packages/                  # Monorepo packages
│   ├── core/                 # Backend server and core logic
│   │   ├── dist/             # Compiled TypeScript output
│   │   ├── src/
│   │   │   ├── app.ts        # Main server entry point
│   │   │   ├── config/       # Configuration handling
│   │   │   ├── plugins/      # Core plugins (non-storage)
│   │   │   ├── routes/       # API route definitions
│   │   │   ├── store/        # Store plugin interfaces and loader
│   │   │   └── types/        # Shared TypeScript types
│   │   └── package.json      # Core package dependencies
│   ├── frontend/             # Vue.js frontend application
│   │   ├── dist/             # Built frontend assets
│   │   ├── src/
│   │   │   ├── api/          # API client utilities
│   │   │   ├── assets/       # Static assets (images, fonts)
│   │   │   ├── components/   # Reusable Vue components
│   │   │   ├── router/       # Vue Router configuration
│   │   │   ├── stores/       # Pinia state management stores
│   │   │   ├── views/        # Page components
│   │   │   └── App.vue       # Root component
│   │   ├── index.html        # HTML entry point
│   │   └── package.json      # Frontend package dependencies
│   └── plugins/              # Plugin packages
│       └── store-trace-clickhouse/
│           ├── dist/         # Compiled plugin output
│           ├── src/
│           │   └── index.ts  # ClickHouse plugin implementation
│           └── package.json  # Plugin dependencies
├── .planning/                # Planning documents
│   └── codebase/             # Architecture and structure analysis
├── .git/                     # Git version control
├── node_modules/             # Root dependencies (not used in monorepo)
├── package.json              # Root package.json with workspace config
└── tsconfig.json             # Root TypeScript configuration
```

## Directory Purposes

**packages/core/:**
- Purpose: Backend server implementation and core business logic
- Contains: Fastify server, API routes, store interfaces, configuration
- Key files: `src/app.ts`, `src/routes/`, `src/store/interface.ts`

**packages/frontend/:**
- Purpose: Vue.js web application for trace visualization
- Contains: UI components, views, API client, state management
- Key files: `src/App.vue`, `src/views/`, `src/api/index.ts`

**packages/plugins/store-trace-clickhouse/:**
- Purpose: ClickHouse database implementation for trace storage
- Contains: ClickHouse client and query implementations
- Key files: `src/index.ts`

**packages/core/src/config/:**
- Purpose: Configuration loading and management
- Contains: YAML config parsing, validation
- Key files: `loader.ts`

**packages/core/src/routes/:**
- Purpose: API endpoint definitions
- Contains: RESTful route handlers
- Key files: `traces.ts`, `services.ts`, `errors.ts`, `slow.ts`

**packages/frontend/src/views/:**
- Purpose: Page-level components
- Contains: Feature-specific views
- Key files: `Traces.vue`, `Services.vue`, `Errors.vue`, `SlowCalls.vue`

## Key File Locations

**Entry Points:**
- `packages/core/src/app.ts`: Backend server main file
- `packages/frontend/src/main.ts`: Frontend application entry
- `packages/plugins/store-trace-clickhouse/src/index.ts`: ClickHouse plugin

**Configuration:**
- `packages/core/src/config/loader.ts`: Configuration loading logic

**Core Logic:**
- `packages/core/src/store/interface.ts`: Store plugin interfaces
- `packages/core/src/types/index.ts`: Shared TypeScript types

**Testing:**
- `packages/core/src/store/plugin-loader.test.ts`: Plugin loader tests
- `packages/frontend/src/api/index.test.ts`: API client tests

## Naming Conventions

**Files:**
- `camelCase` for files: `traces.ts`, `slow-calls.ts`
- `index.ts` for entry points and barrel exports
- `*.test.ts` for test files

**Directories:**
- kebab-case for directories: `store-trace-clickhouse`
- plural names: `routes`, `views`, `components`, `stores`

**Components:**
- PascalCase for Vue components: `TraceDetail.vue`, `ServicesView.vue`
- `View` suffix for page components, `Detail` for detail components

**API/Store:**
- `snake_case` for database columns
- PascalCase for TypeScript interfaces and types
- camelCase for functions and variables

## Where to Add New Code

**New Backend Feature:**
- Primary code: `packages/core/src/routes/`
- Tests: `packages/core/src/**/*.test.ts`
- Types: `packages/core/src/types/index.ts`

**New Frontend Feature:**
- View: `packages/frontend/src/views/[FeatureName].vue`
- Component: `packages/frontend/src/components/[FeatureName].vue`
- Store: `packages/frontend/src/stores/[feature-name].ts`

**New Storage Plugin:**
- Implementation: `packages/plugins/store-trace-[technology]/src/index.ts`
- Interface: `packages/core/src/store/interface.ts`

**New Configuration Option:**
- Loading: `packages/core/src/config/loader.ts`
- Type: `packages/core/src/types/index.ts`

## Special Directories

**node_modules/:
- Purpose: Package dependencies
- Generated: Yes
- Committed: No (ignored by .gitignore)

**dist/:
- Purpose: Compiled JavaScript output
- Generated: Yes
- Committed: No (added to .gitignore)

**.planning/:
- Purpose: Planning and documentation
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-02-28*