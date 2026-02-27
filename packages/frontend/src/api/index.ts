// Base API configuration
const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
}

// Types
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

export interface Trace {
  traceId: string;
  spans: Span[];
  rootSpan: Span;
  duration: number;
  spanCount: number;
  statusCode: 'Unset' | 'Ok' | 'Error';
}

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

// API Functions
export async function getServices(params: { startTime: string; endTime: string }): Promise<Service[]> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/services?${searchParams}`);
  const data: ApiResponse<Service[]> = await res.json();
  return data.data || [];
}

export async function getTraces(params: {
  service?: string;
  startTime: string;
  endTime: string;
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedResult<TraceListItem>> {
  const searchParams = new URLSearchParams();
  if (params.service) searchParams.set('service', params.service);
  searchParams.set('startTime', params.startTime);
  searchParams.set('endTime', params.endTime);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.status) searchParams.set('status', params.status);

  const res = await fetch(`${API_BASE}/traces?${searchParams}`);
  const data: ApiResponse<PaginatedResult<TraceListItem>> = await res.json();
  return data.data || { list: [], total: 0, page: 1, pageSize: 20 };
}

export async function getTraceById(traceId: string): Promise<Trace | null> {
  const res = await fetch(`${API_BASE}/traces/${traceId}`);
  if (res.status === 404) return null;
  const data: ApiResponse<Trace> = await res.json();
  return data.data || null;
}

export async function getErrors(params: {
  service?: string;
  startTime: string;
  endTime: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<ErrorItem>> {
  const searchParams = new URLSearchParams();
  if (params.service) searchParams.set('service', params.service);
  searchParams.set('startTime', params.startTime);
  searchParams.set('endTime', params.endTime);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const res = await fetch(`${API_BASE}/errors?${searchParams}`);
  const data: ApiResponse<PaginatedResult<ErrorItem>> = await res.json();
  return data.data || { list: [], total: 0, page: 1, pageSize: 20 };
}

export async function getErrorGroups(params: {
  service?: string;
  startTime: string;
  endTime: string;
}): Promise<ErrorGroup[]> {
  const searchParams = new URLSearchParams();
  if (params.service) searchParams.set('service', params.service);
  searchParams.set('startTime', params.startTime);
  searchParams.set('endTime', params.endTime);

  const res = await fetch(`${API_BASE}/errors/groups?${searchParams}`);
  const data: ApiResponse<ErrorGroup[]> = await res.json();
  return data.data || [];
}

export async function getSlowCalls(params: {
  service?: string;
  startTime: string;
  endTime: string;
  limit?: number;
}): Promise<SlowCall[]> {
  const searchParams = new URLSearchParams();
  if (params.service) searchParams.set('service', params.service);
  searchParams.set('startTime', params.startTime);
  searchParams.set('endTime', params.endTime);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/slow?${searchParams}`);
  const data: ApiResponse<SlowCall[]> = await res.json();
  return data.data || [];
}

// Utility functions
export function formatDuration(ns: number): string {
  if (ns < 1000) return `${ns} ns`;
  if (ns < 1000000) return `${(ns / 1000).toFixed(2)} µs`;
  if (ns < 1000000000) return `${(ns / 1000000).toFixed(2)} ms`;
  return `${(ns / 1000000000).toFixed(2)} s`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

// Tree building for spans
export interface SpanNode extends Span {
  children: SpanNode[];
  depth: number;
  startTime: number; // Relative to root
}

export function buildSpanTree(spans: Span[]): SpanNode[] {
  if (spans.length === 0) return [];

  // Sort by timestamp
  const sortedSpans = [...spans].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find root span (no parent or earliest)
  const rootSpan = sortedSpans.find(s => !s.parentSpanId) || sortedSpans[0];
  const rootTime = new Date(rootSpan.timestamp).getTime();

  // Build a map for quick lookup
  const spanMap = new Map<string, SpanNode>();
  const rootNodes: SpanNode[] = [];

  // First pass: create all nodes
  for (const span of sortedSpans) {
    const spanTime = new Date(span.timestamp).getTime();
    spanMap.set(span.spanId, {
      ...span,
      children: [],
      depth: 0,
      startTime: spanTime - rootTime,
    });
  }

  // Second pass: build tree structure
  for (const span of sortedSpans) {
    const node = spanMap.get(span.spanId)!;
    if (span.parentSpanId && spanMap.has(span.parentSpanId)) {
      const parent = spanMap.get(span.parentSpanId)!;
      parent.children.push(node);
      node.depth = parent.depth + 1;
    } else {
      rootNodes.push(node);
    }
  }

  // Return roots (should be just one, but handle multiple)
  return rootNodes.sort((a, b) => a.startTime - b.startTime);
}

export function flattenSpanTree(nodes: SpanNode[]): SpanNode[] {
  const result: SpanNode[] = [];
  function traverse(node: SpanNode) {
    result.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }
  for (const node of nodes) {
    traverse(node);
  }
  return result;
}
