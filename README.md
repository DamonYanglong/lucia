# 🍬 Lucia

Lightweight APM for developers.

## Features

- **Service List** - View all services with request stats
- **Trace Query** - Filter traces by service/time/TraceID/error
- **Trace Detail** - Span tree + waterfall view
- **Error Tracking** - Error list with aggregation
- **Slow Call Analysis** - Top N slow calls

## Quick Start

### Prerequisites

- Node.js 24+
- ClickHouse 23+
- OTel Collector (configured to export to ClickHouse)

### Development

```bash
# Install dependencies
pnpm install

# Start backend
pnpm dev

# Start frontend (in another terminal)
pnpm dev:frontend
```

### Docker

```bash
cd docker
docker-compose up -d
```

## Configuration

Create `config.yaml`:

```yaml
server:
  port: 3000
  host: 0.0.0.0

store:
  trace:
    plugin: clickhouse
    config:
      host: localhost
      port: 9000
      database: default
      username: default
      password: ""
```

## License

MIT
