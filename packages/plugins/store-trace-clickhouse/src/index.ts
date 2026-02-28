import { createClient } from '@clickhouse/client';
import type { ITraceStorePlugin } from '@lucia/core';
import type {
  Service,
  TraceListItem,
  Trace,
  Span,
  ErrorItem,
  ErrorGroup,
  SlowCall,
  ServiceQuery,
  TraceQuery,
  ErrorQuery,
  SlowQuery,
  PaginatedResult
} from '@lucia/core';

interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Custom error class for ClickHouse operations
 */
export class ClickHouseError extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`ClickHouse error during ${operation}: ${message}`);
    this.name = 'ClickHouseError';
  }
}

export class ClickHouseTracePlugin implements ITraceStorePlugin {
  name = 'clickhouse';
  version = '0.1.0';
  type = 'trace' as const;

  private client: ReturnType<typeof createClient> | null = null;
  private config: ClickHouseConfig | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as ClickHouseConfig;

    if (!this.config.host || !this.config.port || !this.config.database) {
      throw new ClickHouseError('init', 'Missing required configuration: host, port, or database');
    }

    try {
      this.client = createClient({
        host: `http://${this.config.host}:${this.config.port}`,
        database: this.config.database,
        username: this.config.username || 'default',
        password: this.config.password || '',
      });

      // Test connection
      await this.client.ping();
    } catch (error) {
      throw new ClickHouseError('init', 'Failed to connect to ClickHouse', error);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Log but don't throw on close
        console.error('Error closing ClickHouse client:', error);
      }
      this.client = null;
    }
  }

  /**
   * Ensure client is initialized
   */
  private ensureClient(): NonNullable<typeof this.client> {
    if (!this.client) {
      throw new ClickHouseError('query', 'ClickHouse client not initialized');
    }
    return this.client;
  }

  /**
   * Convert ClickHouse DateTime to ISO 8601 UTC format
   * ClickHouse returns: '2026-02-28 03:24:00'
   * We need: '2026-02-28T03:24:00Z'
   */
  private toISO8601(timestamp: string): string {
    if (!timestamp) return timestamp;
    // If already in ISO format with timezone, return as-is
    if (timestamp.includes('T') && (timestamp.endsWith('Z') || /[+-][0-9]{2}:[0-9]{2}$/.test(timestamp))) {
      return timestamp;
    }
    // Convert '2026-02-28 03:24:00' to '2026-02-28T03:24:00Z'
    return timestamp.replace(' ', 'T') + 'Z';
  }

  async getServices(query: ServiceQuery): Promise<Service[]> {
    const client = this.ensureClient();

    const sql = `
      SELECT
        ServiceName as name,
        count() as requestCount,
        countIf(StatusCode = 'Error') as errorCount,
        avg(Duration) as avgDuration
      FROM open_telemetry_traces
      WHERE Timestamp >= parseDateTime64BestEffort({startTime:String}) AND Timestamp <= parseDateTime64BestEffort({endTime:String})
      GROUP BY ServiceName
      ORDER BY requestCount DESC
    `;

    try {
      const result = await client.query({
        query: sql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
        },
      });

      const data = await result.json() as { data?: Service[] };
      return data.data || [];
    } catch (error) {
      throw new ClickHouseError('getServices', 'Failed to query services', error);
    }
  }

  async getTraces(query: TraceQuery): Promise<PaginatedResult<TraceListItem>> {
    const client = this.ensureClient();
    const conditions = ['Timestamp >= parseDateTime64BestEffort({startTime:String})', 'Timestamp <= parseDateTime64BestEffort({endTime:String})'];

    if (query.service) {
      conditions.push('ServiceName = {service:String}');
    }
    if (query.traceId) {
      conditions.push('TraceId = {traceId:String}');
    }
    if (query.status === 'error') {
      conditions.push("StatusCode = 'Error'");
    } else if (query.status === 'ok') {
      conditions.push("StatusCode = 'Ok'");
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    try {
      const countSql = `SELECT count(DISTINCT TraceId) as total FROM open_telemetry_traces WHERE ${conditions.join(' AND ')}`;
      const countResult = await client.query({
        query: countSql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
          traceId: query.traceId,
        },
      });
      const countData = await countResult.json() as { data?: Array<{ total: number }> };
      const total = countData.data?.[0]?.total || 0;

      const sql = `
        SELECT
          TraceId as traceId,
          ServiceName as serviceName,
          SpanName as spanName,
          Duration as duration,
          StatusCode as statusCode,
          Timestamp as timestamp
        FROM open_telemetry_traces
        WHERE ${conditions.join(' AND ')}
        ORDER BY Timestamp DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const result = await client.query({
        query: sql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
          traceId: query.traceId,
        },
      });

      const data = await result.json() as { data?: Array<TraceListItem & { timestamp: string }> };

      // Convert timestamps to ISO 8601
      const list = (data.data || []).map((item) => ({
        ...item,
        timestamp: this.toISO8601(item.timestamp),
      }));

      return {
        list,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      throw new ClickHouseError('getTraces', 'Failed to query traces', error);
    }
  }

  async getTraceById(traceId: string): Promise<Trace | null> {
    const client = this.ensureClient();

    try {
      // Use auxiliary table for efficient trace lookup
      const timeRangeSql = `
        SELECT min(Start) as start, max(End) as end
        FROM open_telemetry_traces_trace_id_ts
        WHERE TraceId = {traceId:String}
      `;

      const timeResult = await client.query({
        query: timeRangeSql,
        query_params: { traceId },
      });
      const timeData = await timeResult.json() as { data?: Array<{ start?: string; end?: string }> };

      if (!timeData.data?.[0]?.start) {
        return null;
      }

      const { start, end } = timeData.data[0];

      const sql = `
        SELECT *
        FROM open_telemetry_traces
        WHERE TraceId = {traceId:String}
          AND Timestamp >= parseDateTime64BestEffort({start:String})
          AND Timestamp <= parseDateTime64BestEffort({end:String})
        ORDER BY Timestamp
      `;

      const result = await client.query({
        query: sql,
        query_params: { traceId, start, end },
      });

      const data = await result.json() as {
        data?: Array<{
          Timestamp: string;
          TraceId: string;
          SpanId: string;
          ParentSpanId: string | null;
          SpanName: string;
          SpanKind: string;
          ServiceName: string;
          Duration: number;
          StatusCode: string;
          StatusMessage: string;
          SpanAttributes: Record<string, string>;
          ResourceAttributes: Record<string, string>;
          Events: Span['events'];
          Links: Span['links'];
        }>
      };

      const spans: Span[] = (data.data || []).map((row) => ({
        timestamp: this.toISO8601(row.Timestamp),
        traceId: row.TraceId,
        spanId: row.SpanId,
        parentSpanId: row.ParentSpanId || null,
        spanName: row.SpanName,
        spanKind: row.SpanKind,
        serviceName: row.ServiceName,
        duration: row.Duration,
        statusCode: row.StatusCode,
        statusMessage: row.StatusMessage,
        spanAttributes: row.SpanAttributes || {},
        resourceAttributes: row.ResourceAttributes || {},
        events: row.Events || [],
        links: row.Links || [],
      }));

      if (spans.length === 0) {
        return null;
      }

      const rootSpan = spans.find(s => !s.parentSpanId) || spans[0];
      const maxDuration = Math.max(...spans.map(s => s.duration));
      const hasError = spans.some(s => s.statusCode === 'Error');

      return {
        traceId,
        spans,
        rootSpan,
        duration: maxDuration,
        spanCount: spans.length,
        statusCode: hasError ? 'Error' : 'Ok',
      };
    } catch (error) {
      if (error instanceof ClickHouseError) {
        throw error;
      }
      throw new ClickHouseError('getTraceById', 'Failed to query trace by ID', error);
    }
  }

  async getErrors(query: ErrorQuery): Promise<PaginatedResult<ErrorItem>> {
    const client = this.ensureClient();
    const conditions = ["StatusCode = 'Error'", 'Timestamp >= parseDateTime64BestEffort({startTime:String})', 'Timestamp <= parseDateTime64BestEffort({endTime:String})'];

    if (query.service) {
      conditions.push('ServiceName = {service:String}');
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    try {
      const sql = `
        SELECT
          Timestamp as timestamp,
          TraceId as traceId,
          SpanId as spanId,
          ServiceName as serviceName,
          SpanName as spanName,
          StatusMessage as statusMessage
        FROM open_telemetry_traces
        WHERE ${conditions.join(' AND ')}
        ORDER BY Timestamp DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const result = await client.query({
        query: sql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
        },
      });

      const data = await result.json() as { data?: Array<ErrorItem & { timestamp: string }> };

      // Get total count
      const countSql = `SELECT count() as total FROM open_telemetry_traces WHERE ${conditions.join(' AND ')}`;
      const countResult = await client.query({
        query: countSql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
        },
      });
      const countData = await countResult.json() as { data?: Array<{ total: number }> };
      const total = countData.data?.[0]?.total || 0;

      // Convert timestamps to ISO 8601
      const list = (data.data || []).map((item) => ({
        ...item,
        timestamp: this.toISO8601(item.timestamp),
      }));

      return {
        list,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      throw new ClickHouseError('getErrors', 'Failed to query errors', error);
    }
  }

  async getErrorGroups(query: ErrorQuery): Promise<ErrorGroup[]> {
    const client = this.ensureClient();
    const conditions = ["StatusCode = 'Error'", 'Timestamp >= parseDateTime64BestEffort({startTime:String})', 'Timestamp <= parseDateTime64BestEffort({endTime:String})'];

    if (query.service) {
      conditions.push('ServiceName = {service:String}');
    }

    const sql = `
      SELECT
        StatusMessage as message,
        ServiceName as serviceName,
        count() as count,
        max(Timestamp) as lastOccurrence
      FROM open_telemetry_traces
      WHERE ${conditions.join(' AND ')}
      GROUP BY StatusMessage, ServiceName
      ORDER BY count DESC
      LIMIT 100
    `;

    try {
      const result = await client.query({
        query: sql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
        },
      });

      const data = await result.json() as { data?: Array<ErrorGroup & { lastOccurrence: string }> };

      // Convert lastOccurrence to ISO 8601
      return (data.data || []).map((item) => ({
        ...item,
        lastOccurrence: this.toISO8601(item.lastOccurrence),
      }));
    } catch (error) {
      throw new ClickHouseError('getErrorGroups', 'Failed to query error groups', error);
    }
  }

  async getSlowCalls(query: SlowQuery): Promise<SlowCall[]> {
    const client = this.ensureClient();
    const conditions = ['Timestamp >= parseDateTime64BestEffort({startTime:String})', 'Timestamp <= parseDateTime64BestEffort({endTime:String})'];

    if (query.service) {
      conditions.push('ServiceName = {service:String}');
    }

    const limit = query.limit || 100;

    const sql = `
      SELECT
        Timestamp as timestamp,
        TraceId as traceId,
        SpanId as spanId,
        ServiceName as serviceName,
        SpanName as spanName,
        Duration as duration
      FROM open_telemetry_traces
      WHERE ${conditions.join(' AND ')}
      ORDER BY Duration DESC
      LIMIT ${limit}
    `;

    try {
      const result = await client.query({
        query: sql,
        query_params: {
          startTime: query.startTime,
          endTime: query.endTime,
          service: query.service,
        },
      });

      const data = await result.json() as { data?: Array<SlowCall & { timestamp: string }> };

      // Convert timestamps to ISO 8601
      return (data.data || []).map((item) => ({
        ...item,
        timestamp: this.toISO8601(item.timestamp),
      }));
    } catch (error) {
      throw new ClickHouseError('getSlowCalls', 'Failed to query slow calls', error);
    }
  }
}

export default new ClickHouseTracePlugin();
