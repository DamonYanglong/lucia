/**
 * Service metadata for enriching service information in APM
 */

export interface ServiceMetadata {
  serviceName: string;
  displayName?: string;
  description?: string;
  environment?: 'dev' | 'staging' | 'prod' | 'other';
  owner?: string;
  team?: string;
  ips?: string[];
  repository?: string;
  tags?: Record<string, string>;
  status?: 'active' | 'deprecated' | 'maintenance';
  createdAt: string;
  updatedAt: string;
  source: 'auto' | 'manual';
}

export interface MetadataQuery {
  environment?: string;
  owner?: string;
  status?: string;
  search?: string;
}

export interface ServiceWithMetadata {
  serviceName: string;
  requestCount: number;
  errorCount: number;
  avgDuration: number;
  metadata?: ServiceMetadata;
}
