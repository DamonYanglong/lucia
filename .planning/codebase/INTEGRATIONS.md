# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Database:**
- ClickHouse - Primary storage for OpenTelemetry traces
  - SDK/Client: @clickhouse/client
  - Connection: HTTP interface (port 8123 default)
  - Auth: Username/password credentials

**Internal APIs:**
- Fastify REST API - Backend services
  - Endpoints: /api/traces, /api/services, /api/errors, /api/slow
  - CORS enabled for frontend access
  - Health check: /health

## Data Storage

**Databases:**
- ClickHouse
  - Connection: CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_DATABASE, CLICKHOUSE_USERNAME, CLICKHOUSE_PASSWORD
  - Client: Direct ClickHouse client with parameterized queries
  - Tables: open_telemetry_traces (main), open_telemetry_traces_trace_id_ts (auxiliary)

**File Storage:**
- Local filesystem only (static files)

**Caching:**
- None detected in current implementation

## Authentication & Identity

**Auth Provider:**
- None detected (public API access)
- No authentication middleware configured

## Monitoring & Observability

**Error Tracking:**
- None detected (Pino logging configured but no external error tracking)

**Logs:**
- Pino logger with pino-pretty transport
- Log levels: debug, info, warn, error
- Console output with colored formatting

## CI/CD & Deployment

**Hosting:**
- Self-hosted (Fastify server)
- Frontend served statically by Fastify in production

**CI Pipeline:**
- Not detected (no GitHub Actions, Travis, etc.)

## Environment Configuration

**Required env vars:**
- CLICKHOUSE_HOST - ClickHouse server host
- CLICKHOUSE_PORT - ClickHouse server port (default: 9000)
- CLICKHOUSE_DATABASE - ClickHouse database name
- CLICKHOUSE_USERNAME - ClickHouse username
- CLICKHOUSE_PASSWORD - ClickHouse password
- LUCIA_PORT - Server port (default: 3000)
- LUCIA_HOST - Server host (default: 0.0.0.0)

**Secrets location:**
- config.yaml (contains credentials)
- Environment variables (recommended)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Plugin Architecture

**Store Plugins:**
- Plugin-based architecture for trace storage
- Current: ClickHouse trace store plugin
- Support for metric and log plugins (configured but not implemented)

---

*Integration audit: 2026-02-28*