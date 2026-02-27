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

export class ClickHouseTracePlugin implements ITraceStorePlugin {
  name = 'clickhouse';
  version = '0.1.0';
  type = 'trace' as const;
  
  private client: any;
  private config: ClickHouseConfig | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as ClickHouseConfig;
    
    this.client = createClient({
      host: `http://${this.config.host}:${this.config.port}`,
      database: this.config.database,
      username: this.config.username,
      password: this.config.password,
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  async getServices(query: ServiceQuery): Promise<Service[]> {
    const sql = `
      SELECT 
        ServiceName as name,
        count() as requestCount,
        countIf(StatusCode = 'Error') as errorCount,
        avg(Duration) as avgDuration
      FROM open_telemetry_traces
      WHERE Timestamp >= {startTime:DateTime} AND Timestamp <= {endTime:DateTime}
      GROUP BY ServiceName
      ORDER BY requestCount DESC
    `;
    
    const result = await this.client.query({
      query: sql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
      },
    });
    
    const data = await result.json() as any;
    return data.data || [];
  }

  async getTraces(query: TraceQuery): Promise<PaginatedResult<TraceListItem>> {
    const conditions = ['Timestamp >= {startTime:DateTime}', 'Timestamp <= {endTime:DateTime}'];
    
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
    
    const countSql = `SELECT count(DISTINCT TraceId) as total FROM open_telemetry_traces WHERE ${conditions.join(' AND ')}`;
    const countResult = await this.client.query({
      query: countSql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
        traceId: query.traceId,
      },
    });
    const countData = await countResult.json() as any;
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
    
    const result = await this.client.query({
      query: sql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
        traceId: query.traceId,
      },
    });
    
    const data = await result.json() as any;
    
    return {
      list: data.data || [],
      total,
      page,
      pageSize,
    };
  }

  async getTraceById(traceId: string): Promise<Trace | null> {
    // Use auxiliary table for efficient trace lookup
    const timeRangeSql = `
      SELECT min(Start) as start, max(End) as end
      FROM open_telemetry_traces_trace_id_ts
      WHERE TraceId = {traceId:String}
    `;
    
    const timeResult = await this.client.query({
      query: timeRangeSql,
      query_params: { traceId },
    });
    const timeData = await timeResult.json() as any;
    
    if (!timeData.data?.[0]?.start) {
      return null;
    }
    
    const { start, end } = timeData.data[0];
    
    const sql = `
      SELECT *
      FROM open_telemetry_traces
      WHERE TraceId = {traceId:String}
        AND Timestamp >= {start:DateTime}
        AND Timestamp <= {end:DateTime}
      ORDER BY Timestamp
    `;
    
    const result = await this.client.query({
      query: sql,
      query_params: { traceId, start, end },
    });
    
    const data = await result.json() as any;
    const spans: Span[] = (data.data || []).map((row: any) => ({
      timestamp: row.Timestamp,
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
  }

  async getErrors(query: ErrorQuery): Promise<PaginatedResult<ErrorItem>> {
    const conditions = ["StatusCode = 'Error'", 'Timestamp >= {startTime:DateTime}', 'Timestamp <= {endTime:DateTime}'];
    
    if (query.service) {
      conditions.push('ServiceName = {service:String}');
    }
    
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;
    
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
    
    const result = await this.client.query({
      query: sql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
      },
    });
    
    const data = await result.json() as any;
    
    // Get total count
    const countSql = `SELECT count() as total FROM open_telemetry_traces WHERE ${conditions.join(' AND ')}`;
    const countResult = await this.client.query({
      query: countSql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
      },
    });
    const countData = await countResult.json() as any;
    const total = countData.data?.[0]?.total || 0;
    
    return {
      list: data.data || [],
      total,
      page,
      pageSize,
    };
  }

  async getErrorGroups(query: ErrorQuery): Promise<ErrorGroup[]> {
    const conditions = ["StatusCode = 'Error'", 'Timestamp >= {startTime:DateTime}', 'Timestamp <= {endTime:DateTime}'];
    
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
    
    const result = await this.client.query({
      query: sql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
      },
    });
    
    const data = await result.json() as any;
    return data.data || [];
  }

  async getSlowCalls(query: SlowQuery): Promise<SlowCall[]> {
    const conditions = ['Timestamp >= {startTime:DateTime}', 'Timestamp <= {endTime:DateTime}'];
    
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
    
    const result = await this.client.query({
      query: sql,
      query_params: {
        startTime: query.startTime,
        endTime: query.endTime,
        service: query.service,
      },
    });
    
    const data = await result.json() as any;
    return data.data || [];
  }
}

export default new ClickHouseTracePlugin();
