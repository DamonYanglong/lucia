import { Pool } from 'pg';
import type { IMetadataStorePlugin } from '@lucia/core';
import type { ServiceMetadata, MetadataQuery } from '@lucia/core';

interface PostgresConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  max?: number; // pool size
}

/**
 * Custom error class for PostgreSQL operations
 */
export class PostgresError extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`PostgreSQL error during ${operation}: ${message}`);
    this.name = 'PostgresError';
  }
}

export class PostgresMetadataPlugin implements IMetadataStorePlugin {
  name = 'postgres';
  version = '0.1.0';
  type = 'metadata' as const;

  private pool: Pool | null = null;
  private config: PostgresConfig | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as PostgresConfig;

    if (!this.config.database) {
      throw new PostgresError('init', 'Missing required configuration: database');
    }

    try {
      this.pool = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user || 'postgres',
        password: this.config.password || '',
        max: this.config.max || 10,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Create table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS service_metadata (
          service_name VARCHAR(255) PRIMARY KEY,
          display_name VARCHAR(256),
          description TEXT,
          environment VARCHAR(32),
          owner VARCHAR(256),
          team VARCHAR(256),
          ips JSONB,
          repository VARCHAR(512),
          tags JSONB,
          status VARCHAR(32),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          source VARCHAR(32) NOT NULL DEFAULT 'manual'
        )
      `);

      // Create indexes for common queries
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_metadata_environment ON service_metadata(environment);
        CREATE INDEX IF NOT EXISTS idx_metadata_owner ON service_metadata(owner);
        CREATE INDEX IF NOT EXISTS idx_metadata_status ON service_metadata(status)
      `);
    } catch (error) {
      throw new PostgresError('init', 'Failed to initialize PostgreSQL connection', error);
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error) {
        console.error('Error closing PostgreSQL pool:', error);
      }
      this.pool = null;
    }
  }

  /**
   * Ensure pool is initialized
   */
  private ensurePool(): NonNullable<typeof this.pool> {
    if (!this.pool) {
      throw new PostgresError('query', 'PostgreSQL pool not initialized');
    }
    return this.pool;
  }

  /**
   * Parse stored row to ServiceMetadata
   */
  private parseRow(row: Record<string, unknown>): ServiceMetadata {
    return {
      serviceName: row.service_name as string,
      displayName: row.display_name as string | undefined,
      description: row.description as string | undefined,
      environment: row.environment as ServiceMetadata['environment'],
      owner: row.owner as string | undefined,
      team: row.team as string | undefined,
      ips: row.ips as string[] | undefined,
      repository: row.repository as string | undefined,
      tags: row.tags as Record<string, string> | undefined,
      status: row.status as ServiceMetadata['status'],
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      source: row.source as ServiceMetadata['source'],
    };
  }

  async get(serviceName: string): Promise<ServiceMetadata | null> {
    const pool = this.ensurePool();

    try {
      const result = await pool.query(
        'SELECT * FROM service_metadata WHERE service_name = $1',
        [serviceName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.parseRow(result.rows[0]);
    } catch (error) {
      throw new PostgresError('get', `Failed to get metadata for ${serviceName}`, error);
    }
  }

  async list(query?: MetadataQuery): Promise<ServiceMetadata[]> {
    const pool = this.ensurePool();

    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query?.environment) {
        conditions.push(`environment = $${paramIndex++}`);
        params.push(query.environment);
      }
      if (query?.owner) {
        conditions.push(`owner = $${paramIndex++}`);
        params.push(query.owner);
      }
      if (query?.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(query.status);
      }
      if (query?.search) {
        conditions.push(`(service_name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const result = await pool.query(
        `SELECT * FROM service_metadata ${whereClause} ORDER BY service_name`,
        params
      );

      return result.rows.map((row) => this.parseRow(row));
    } catch (error) {
      throw new PostgresError('list', 'Failed to list metadata', error);
    }
  }

  async upsert(metadata: ServiceMetadata): Promise<ServiceMetadata> {
    const pool = this.ensurePool();

    const now = new Date();
    const createdAt = metadata.createdAt ? new Date(metadata.createdAt) : now;
    const updatedAt = now;

    try {
      const result = await pool.query(`
        INSERT INTO service_metadata (
          service_name, display_name, description, environment, owner, team,
          ips, repository, tags, status, created_at, updated_at, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT(service_name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          environment = EXCLUDED.environment,
          owner = EXCLUDED.owner,
          team = EXCLUDED.team,
          ips = EXCLUDED.ips,
          repository = EXCLUDED.repository,
          tags = EXCLUDED.tags,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          source = EXCLUDED.source
        RETURNING *
      `, [
        metadata.serviceName,
        metadata.displayName || null,
        metadata.description || null,
        metadata.environment || null,
        metadata.owner || null,
        metadata.team || null,
        metadata.ips ? JSON.stringify(metadata.ips) : null,
        metadata.repository || null,
        metadata.tags ? JSON.stringify(metadata.tags) : null,
        metadata.status || null,
        createdAt,
        updatedAt,
        metadata.source || 'manual',
      ]);

      return this.parseRow(result.rows[0]);
    } catch (error) {
      throw new PostgresError('upsert', `Failed to upsert metadata for ${metadata.serviceName}`, error);
    }
  }

  async delete(serviceName: string): Promise<void> {
    const pool = this.ensurePool();

    try {
      await pool.query('DELETE FROM service_metadata WHERE service_name = $1', [serviceName]);
    } catch (error) {
      throw new PostgresError('delete', `Failed to delete metadata for ${serviceName}`, error);
    }
  }

  async exists(serviceName: string): Promise<boolean> {
    const pool = this.ensurePool();

    try {
      const result = await pool.query(
        'SELECT 1 FROM service_metadata WHERE service_name = $1',
        [serviceName]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new PostgresError('exists', `Failed to check existence for ${serviceName}`, error);
    }
  }
}

export default new PostgresMetadataPlugin();
