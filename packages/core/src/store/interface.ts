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
  PaginatedResult,
  ServiceMetadata,
  MetadataQuery,
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

// Metadata 存储插件接口
export interface IMetadataStorePlugin {
  name: string;
  version: string;
  type: 'metadata';

  init(config: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;

  get(serviceName: string): Promise<ServiceMetadata | null>;
  list(query?: MetadataQuery): Promise<ServiceMetadata[]>;
  upsert(metadata: ServiceMetadata): Promise<ServiceMetadata>;
  delete(serviceName: string): Promise<void>;
  exists(serviceName: string): Promise<boolean>;
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
  metadata?: IMetadataStorePlugin;
  metric?: IMetricStorePlugin;
  log?: ILogStorePlugin;
}
