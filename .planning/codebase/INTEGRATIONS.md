# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**ClickHouse:**
- Service: Time-series database for trace storage
  - SDK/Client: `@clickhouse/client` ^1.0.0
  - Tables: `open_telemetry_traces`, `open_telemetry_traces_trace_id_ts`
  - Connection: HTTPS with basic auth
  - Query pattern: SQL with parameterized queries
  - Used for: Trace storage, metrics, error tracking

**OpenTelemetry:**
- Service: Observability protocol standard
  - Integration: ClickHouse plugin ingests OpenTelemetry traces
  - Data format: Spans with attributes, timestamps, service names
  - Used for: Trace data ingestion

## Data Storage

**Primary Database:**
- ClickHouse - Time-series database
  - Connection: Environment variables
    - `CLICKHOUSE_HOST` (default: localhost)
    - `CLICKHOUSE_PORT` (default: 9000)
    - `CLICKHOUSE_DATABASE` (default: default)
    - `CLICKHOUSE_USERNAME` (default: default)
    - `CLICKHOUSE_PASSWORD` (default: '')
  - Tables:
    - `open_telemetry_traces` - Main trace data
    - `open_telemetry_traces_trace_id_ts` - Trace ID time index

**File Storage:**
- Local filesystem only
  - Static assets: `packages/frontend/dist` (served by Fastify in production)

**Caching:**
- None detected

## Authentication & Identity

**Current:** None detected
- API endpoints are unauthenticated
- CORS configured for all origins (`origin: true`)

**Potential future integrations:**
- JWT authentication for API endpoints
- Rate limiting middleware

## Monitoring & Observability

**Logging:**
- pino ^9.0.0 - Structured logging
  - Transport: pino-pretty for development
  - Levels: Configurable via `LOG_LEVEL` env var

**Metrics:**
- ClickHouse provides built-in metrics (count, averages, error rates)

**Error Tracking:**
- ClickHouse stores error traces
  - Query by `StatusCode = 'Error'`
  - Error grouping by message and service

## CI/CD & Deployment

**Hosting:**
- Not configured in codebase
- Fastify static file serving in production

**CI Pipeline:**
- Not detected in current codebase
- Package scripts include build and test commands

## Environment Configuration

**Required env vars:**
- `LUCIA_PORT` - Server port
- `LUCIA_HOST` - Server host
- `CLICKHOUSE_HOST` - ClickHouse server
- `CLICKHOUSE_PORT` - ClickHouse port
- `CLICKHOUSE_DATABASE` - ClickHouse database name
- `CLICKHOUSE_USERNAME` - ClickHouse username
- `CLICKHOUSE_PASSWORD` - ClickHouse password

**Optional env vars:**
- `LUCIA_CONFIG` - Custom config file path
- `LOG_LEVEL` - Logging level (default: info)

## Webhooks & Callbacks

**Incoming:** None detected
**Outgoing:** None detected

---

*Integration audit: 2026-02-28*
```