import type { 
  Service, 
  TraceListItem, 
  Trace, 
  ErrorItem, 
  ErrorGroup,
  SlowCall,
  ServiceQuery,
  TraceQuery,
  ErrorQuery,
  SlowQuery,
  PaginatedResult
} from '../types';

// Trace 存储插件接口
export interface ITraceStorePlugin {
  name: string;
  version: string;
  type: 'trace';
  
  init(config: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  
  getServices(query: ServiceQuery): Promise<Service[]>;
  getTraces(query: TraceQuery): Promise<PaginatedResult<TraceListItem>>;
  getTraceById(traceId: string): Promise<Trace | null>;
  getErrors(query: ErrorQuery): Promise<PaginatedResult<ErrorItem>>;
  getErrorGroups(query: ErrorQuery): Promise<ErrorGroup[]>;
  getSlowCalls(query: SlowQuery): Promise<SlowCall[]>;
}

// Metrics 存储插件接口（未来）
export interface IMetricStorePlugin {
  name: string;
  version: string;
  type: 'metric';
  
  init(config: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

// Logs 存储插件接口（未来）
export interface ILogStorePlugin {
  name: string;
  version: string;
  type: 'log';
  
  init(config: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

// 插件集合
export interface StorePlugins {
  trace?: ITraceStorePlugin;
  metric?: IMetricStorePlugin;
  log?: ILogStorePlugin;
}
