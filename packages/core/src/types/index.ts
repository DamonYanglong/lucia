// Trace types
export interface Span {
  timestamp: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  spanName: string;
  spanKind: string;
  serviceName: string;
  duration: number;
  statusCode: 'Unset' | 'Ok' | 'Error';
  statusMessage: string;
  spanAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
  events: SpanEvent[];
  links: SpanLink[];
}

export interface SpanEvent {
  timestamp: string;
  name: string;
  attributes: Record<string, string>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, string>;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  rootSpan: Span;
  duration: number;
  spanCount: number;
  statusCode: 'Unset' | 'Ok' | 'Error';
}

// Query types
export interface TraceQuery {
  service?: string;
  traceId?: string;
  status?: 'all' | 'error' | 'ok';
  startTime: string;
  endTime: string;
  page?: number;
  pageSize?: number;
}

export interface ServiceQuery {
  startTime: string;
  endTime: string;
}

export interface ErrorQuery {
  service?: string;
  startTime: string;
  endTime: string;
  page?: number;
  pageSize?: number;
}

export interface SlowQuery {
  service?: string;
  startTime: string;
  endTime: string;
  limit?: number;
}

// Response types
export interface Service {
  name: string;
  requestCount: number;
  errorCount: number;
  avgDuration: number;
}

export interface TraceListItem {
  traceId: string;
  serviceName: string;
  spanName: string;
  duration: number;
  statusCode: string;
  timestamp: string;
}

export interface ErrorItem {
  timestamp: string;
  traceId: string;
  spanId: string;
  serviceName: string;
  spanName: string;
  statusMessage: string;
}

export interface ErrorGroup {
  message: string;
  count: number;
  lastOccurrence: string;
  serviceName: string;
}

export interface SlowCall {
  timestamp: string;
  traceId: string;
  spanId: string;
  serviceName: string;
  spanName: string;
  duration: number;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
