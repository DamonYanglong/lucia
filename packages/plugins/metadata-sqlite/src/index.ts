import Database from 'better-sqlite3';
import type { IMetadataStorePlugin } from '@lucia/core';
import type { ServiceMetadata, MetadataQuery } from '@lucia/core';

interface SQLiteConfig {
  path: string;
}

/**
 * Custom error class for SQLite operations
 */
export class SQLiteError extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`SQLite error during ${operation}: ${message}`);
    this.name = 'SQLiteError';
  }
}

export class SQLiteMetadataPlugin implements IMetadataStorePlugin {
  name = 'sqlite';
  version = '0.1.0';
  type = 'metadata' as const;

  private db: Database.Database | null = null;
  private config: SQLiteConfig | null = null;

  async init(config: Record<string, unknown>): Promise<void> {
    this.config = config as unknown as SQLiteConfig;

    if (!this.config.path) {
      throw new SQLiteError('init', 'Missing required configuration: path');
    }

    try {
      this.db = new Database(this.config.path);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS service_metadata (
          service_name TEXT PRIMARY KEY,
          display_name TEXT,
          description TEXT,
          environment TEXT,
          owner TEXT,
          team TEXT,
          ips TEXT,
          repository TEXT,
          tags TEXT,
          status TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          source TEXT NOT NULL
        )
      `);

      // Create indexes for common queries
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_metadata_environment ON service_metadata(environment);
        CREATE INDEX IF NOT EXISTS idx_metadata_owner ON service_metadata(owner);
        CREATE INDEX IF NOT EXISTS idx_metadata_status ON service_metadata(status)
      `);
    } catch (error) {
      throw new SQLiteError('init', 'Failed to initialize SQLite database', error);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        // Log but don't throw on close
        console.error('Error closing SQLite database:', error);
      }
      this.db = null;
    }
  }

  /**
   * Ensure database is initialized
   */
  private ensureDb(): NonNullable<typeof this.db> {
    if (!this.db) {
      throw new SQLiteError('query', 'SQLite database not initialized');
    }
    return this.db;
  }

  /**
   * Parse stored JSON fields
   */
  private parseRow(row: Record<string, unknown>): ServiceMetadata {
    return {
      serviceName: row.service_name as string,
      displayName: row.display_name as string | undefined,
      description: row.description as string | undefined,
      environment: row.environment as ServiceMetadata['environment'],
      owner: row.owner as string | undefined,
      team: row.team as string | undefined,
      ips: row.ips ? JSON.parse(row.ips as string) : undefined,
      repository: row.repository as string | undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      status: row.status as ServiceMetadata['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      source: row.source as ServiceMetadata['source'],
    };
  }

  async get(serviceName: string): Promise<ServiceMetadata | null> {
    const db = this.ensureDb();

    try {
      const stmt = db.prepare('SELECT * FROM service_metadata WHERE service_name = ?');
      const row = stmt.get(serviceName) as Record<string, unknown> | undefined;

      if (!row) {
        return null;
      }

      return this.parseRow(row);
    } catch (error) {
      throw new SQLiteError('get', `Failed to get metadata for ${serviceName}`, error);
    }
  }

  async list(query?: MetadataQuery): Promise<ServiceMetadata[]> {
    const db = this.ensureDb();

    try {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (query?.environment) {
        conditions.push('environment = ?');
        params.push(query.environment);
      }
      if (query?.owner) {
        conditions.push('owner = ?');
        params.push(query.owner);
      }
      if (query?.status) {
        conditions.push('status = ?');
        params.push(query.status);
      }
      if (query?.search) {
        conditions.push('(service_name LIKE ? OR display_name LIKE ? OR description LIKE ?)');
        const searchPattern = `%${query.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const stmt = db.prepare(`SELECT * FROM service_metadata ${whereClause} ORDER BY service_name`);
      const rows = stmt.all(...params) as Record<string, unknown>[];

      return rows.map((row) => this.parseRow(row));
    } catch (error) {
      throw new SQLiteError('list', 'Failed to list metadata', error);
    }
  }

  async upsert(metadata: ServiceMetadata): Promise<ServiceMetadata> {
    const db = this.ensureDb();

    const now = new Date().toISOString();
    const createdAt = metadata.createdAt || now;
    const updatedAt = now;

    try {
      const stmt = db.prepare(`
        INSERT INTO service_metadata (
          service_name, display_name, description, environment, owner, team,
          ips, repository, tags, status, created_at, updated_at, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(service_name) DO UPDATE SET
          display_name = excluded.display_name,
          description = excluded.description,
          environment = excluded.environment,
          owner = excluded.owner,
          team = excluded.team,
          ips = excluded.ips,
          repository = excluded.repository,
          tags = excluded.tags,
          status = excluded.status,
          updated_at = excluded.updated_at,
          source = excluded.source
      `);

      stmt.run(
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
        metadata.source || 'manual'
      );

      return {
        ...metadata,
        createdAt,
        updatedAt,
        source: metadata.source || 'manual',
      };
    } catch (error) {
      throw new SQLiteError('upsert', `Failed to upsert metadata for ${metadata.serviceName}`, error);
    }
  }

  async delete(serviceName: string): Promise<void> {
    const db = this.ensureDb();

    try {
      const stmt = db.prepare('DELETE FROM service_metadata WHERE service_name = ?');
      stmt.run(serviceName);
    } catch (error) {
      throw new SQLiteError('delete', `Failed to delete metadata for ${serviceName}`, error);
    }
  }

  async exists(serviceName: string): Promise<boolean> {
    const db = this.ensureDb();

    try {
      const stmt = db.prepare('SELECT 1 FROM service_metadata WHERE service_name = ?');
      const row = stmt.get(serviceName);
      return !!row;
    } catch (error) {
      throw new SQLiteError('exists', `Failed to check existence for ${serviceName}`, error);
    }
  }
}

export default new SQLiteMetadataPlugin();
