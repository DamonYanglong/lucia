import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteMetadataPlugin, SQLiteError } from './index';
import type { ServiceMetadata } from '@lucia/core';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SQLiteMetadataPlugin', () => {
  let plugin: SQLiteMetadataPlugin;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    plugin = new SQLiteMetadataPlugin();
    tempDir = await mkdtemp(join(tmpdir(), 'sqlite-metadata-test-'));
    dbPath = join(tempDir, 'test.db');
  });

  afterEach(async () => {
    await plugin.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should initialize with valid config', async () => {
      await expect(plugin.init({ path: dbPath })).resolves.not.toThrow();
    });

    it('should throw error when path is missing', async () => {
      await expect(plugin.init({})).rejects.toThrow(SQLiteError);
    });

    it('should create database file', async () => {
      await plugin.init({ path: dbPath });

      const file = await readFile(dbPath);
      expect(file.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      await plugin.init({ path: dbPath });
    });

    const sampleMetadata: ServiceMetadata = {
      serviceName: 'test-service',
      displayName: 'Test Service',
      description: 'A test service for unit testing',
      environment: 'dev',
      owner: 'test-team',
      team: 'engineering',
      ips: ['10.0.0.1', '10.0.0.2'],
      repository: 'https://github.com/example/test-service',
      tags: { language: 'typescript', framework: 'fastify' },
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      source: 'manual',
    };

    describe('upsert and get', () => {
      it('should insert new metadata', async () => {
        const result = await plugin.upsert(sampleMetadata);

        expect(result.serviceName).toBe(sampleMetadata.serviceName);
        expect(result.displayName).toBe(sampleMetadata.displayName);
        expect(result.source).toBe('manual');
      });

      it('should get existing metadata', async () => {
        await plugin.upsert(sampleMetadata);

        const result = await plugin.get('test-service');

        expect(result).not.toBeNull();
        expect(result?.serviceName).toBe('test-service');
        expect(result?.displayName).toBe('Test Service');
        expect(result?.ips).toEqual(['10.0.0.1', '10.0.0.2']);
        expect(result?.tags).toEqual({ language: 'typescript', framework: 'fastify' });
      });

      it('should return null for non-existent service', async () => {
        const result = await plugin.get('non-existent');
        expect(result).toBeNull();
      });

      it('should update existing metadata', async () => {
        await plugin.upsert(sampleMetadata);

        const updated = {
          ...sampleMetadata,
          displayName: 'Updated Service',
          status: 'maintenance' as const,
        };

        await plugin.upsert(updated);

        const result = await plugin.get('test-service');
        expect(result?.displayName).toBe('Updated Service');
        expect(result?.status).toBe('maintenance');
        expect(result?.createdAt).toBe(sampleMetadata.createdAt);
      });
    });

    describe('list', () => {
      beforeEach(async () => {
        await plugin.upsert({
          serviceName: 'service-a',
          displayName: 'Service A',
          environment: 'prod',
          owner: 'team-alpha',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'manual',
        });

        await plugin.upsert({
          serviceName: 'service-b',
          displayName: 'Service B',
          environment: 'dev',
          owner: 'team-beta',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'manual',
        });

        await plugin.upsert({
          serviceName: 'service-c',
          displayName: 'Service C',
          environment: 'prod',
          owner: 'team-alpha',
          status: 'deprecated',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'manual',
        });
      });

      it('should list all metadata', async () => {
        const result = await plugin.list();
        expect(result.length).toBe(3);
      });

      it('should filter by environment', async () => {
        const result = await plugin.list({ environment: 'prod' });
        expect(result.length).toBe(2);
        expect(result.every((m) => m.environment === 'prod')).toBe(true);
      });

      it('should filter by owner', async () => {
        const result = await plugin.list({ owner: 'team-alpha' });
        expect(result.length).toBe(2);
        expect(result.every((m) => m.owner === 'team-alpha')).toBe(true);
      });

      it('should filter by status', async () => {
        const result = await plugin.list({ status: 'deprecated' });
        expect(result.length).toBe(1);
        expect(result[0].serviceName).toBe('service-c');
      });

      it('should search by name', async () => {
        const result = await plugin.list({ search: 'Service A' });
        expect(result.length).toBe(1);
        expect(result[0].serviceName).toBe('service-a');
      });

      it('should combine filters', async () => {
        const result = await plugin.list({
          environment: 'prod',
          owner: 'team-alpha',
          status: 'active',
        });
        expect(result.length).toBe(1);
        expect(result[0].serviceName).toBe('service-a');
      });
    });

    describe('exists', () => {
      it('should return true for existing service', async () => {
        await plugin.upsert(sampleMetadata);
        const result = await plugin.exists('test-service');
        expect(result).toBe(true);
      });

      it('should return false for non-existent service', async () => {
        const result = await plugin.exists('non-existent');
        expect(result).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete existing metadata', async () => {
        await plugin.upsert(sampleMetadata);
        await plugin.delete('test-service');

        const result = await plugin.get('test-service');
        expect(result).toBeNull();
      });

      it('should not throw when deleting non-existent service', async () => {
        await expect(plugin.delete('non-existent')).resolves.not.toThrow();
      });
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await plugin.init({ path: dbPath });
      await plugin.close();

      // Second close should not throw
      await expect(plugin.close()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw SQLiteError when not initialized', async () => {
      await expect(plugin.get('test')).rejects.toThrow(SQLiteError);
      await expect(plugin.list()).rejects.toThrow(SQLiteError);
      await expect(plugin.upsert({} as ServiceMetadata)).rejects.toThrow(SQLiteError);
      await expect(plugin.delete('test')).rejects.toThrow(SQLiteError);
      await expect(plugin.exists('test')).rejects.toThrow(SQLiteError);
    });
  });
});
