import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostgresMetadataPlugin, PostgresError } from './index.js';

// Mock pg Pool
const mockPool = {
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
};

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

describe('PostgresMetadataPlugin', () => {
  let plugin: PostgresMetadataPlugin;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    plugin = new PostgresMetadataPlugin();
    
    // Mock connect for init
    mockPool.connect.mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    });
    
    // Mock table creation queries
    mockPool.query.mockResolvedValue({ rows: [] });
    
    await plugin.init({
      host: 'localhost',
      port: 5432,
      database: 'lucia_test',
      user: 'postgres',
      password: '',
    });
  });

  afterEach(async () => {
    await plugin.close();
  });

  describe('init', () => {
    it('should initialize with config', async () => {
      const newPlugin = new PostgresMetadataPlugin();
      
      mockPool.connect.mockResolvedValueOnce({
        query: vi.fn(),
        release: vi.fn(),
      });
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await expect(newPlugin.init({
        database: 'test_db',
      })).resolves.not.toThrow();
      
      await newPlugin.close();
    });

    it('should throw error if database is missing', async () => {
      const newPlugin = new PostgresMetadataPlugin();
      
      await expect(newPlugin.init({})).rejects.toThrow(PostgresError);
    });
  });

  describe('close', () => {
    it('should close pool gracefully', async () => {
      const newPlugin = new PostgresMetadataPlugin();
      
      mockPool.connect.mockResolvedValueOnce({
        query: vi.fn(),
        release: vi.fn(),
      });
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await newPlugin.init({ database: 'test' });
      await newPlugin.close();
      
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return metadata when found', async () => {
      const mockRow = {
        service_name: 'user-service',
        display_name: 'User Service',
        description: 'Handles user operations',
        environment: 'prod',
        owner: 'team-a',
        team: 'backend',
        ips: ['10.0.0.1', '10.0.0.2'],
        repository: 'https://github.com/org/user-service',
        tags: { tier: '1' },
        status: 'active',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
        source: 'manual',
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
      
      const result = await plugin.get('user-service');
      
      expect(result).not.toBeNull();
      expect(result!.serviceName).toBe('user-service');
      expect(result!.displayName).toBe('User Service');
      expect(result!.environment).toBe('prod');
      expect(result!.ips).toEqual(['10.0.0.1', '10.0.0.2']);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await plugin.get('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all metadata without query', async () => {
      const mockRows = [
        {
          service_name: 'service-a',
          display_name: 'Service A',
          created_at: new Date(),
          updated_at: new Date(),
          source: 'manual',
        },
        {
          service_name: 'service-b',
          display_name: 'Service B',
          created_at: new Date(),
          updated_at: new Date(),
          source: 'auto',
        },
      ];
      
      mockPool.query.mockResolvedValueOnce({ rows: mockRows });
      
      const result = await plugin.list();
      
      expect(result).toHaveLength(2);
      expect(result[0].serviceName).toBe('service-a');
      expect(result[1].serviceName).toBe('service-b');
    });

    it('should filter by environment', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await plugin.list({ environment: 'prod' });
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('environment = $1'),
        ['prod']
      );
    });

    it('should filter by owner', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await plugin.list({ owner: 'team-a' });
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('owner = $1'),
        ['team-a']
      );
    });

    it('should filter by search term', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await plugin.list({ search: 'user' });
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%user%']
      );
    });
  });

  describe('upsert', () => {
    it('should insert new metadata', async () => {
      const metadata = {
        serviceName: 'new-service',
        displayName: 'New Service',
        environment: 'dev' as const,
        owner: 'team-b',
      };
      
      const mockRow = {
        service_name: 'new-service',
        display_name: 'New Service',
        description: null,
        environment: 'dev',
        owner: 'team-b',
        team: null,
        ips: null,
        repository: null,
        tags: null,
        status: null,
        created_at: new Date(),
        updated_at: new Date(),
        source: 'manual',
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
      
      const result = await plugin.upsert(metadata);
      
      expect(result.serviceName).toBe('new-service');
      expect(result.displayName).toBe('New Service');
    });

    it('should update existing metadata', async () => {
      const metadata = {
        serviceName: 'existing-service',
        displayName: 'Updated Name',
        environment: 'prod' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };
      
      const mockRow = {
        service_name: 'existing-service',
        display_name: 'Updated Name',
        description: null,
        environment: 'prod',
        owner: null,
        team: null,
        ips: null,
        repository: null,
        tags: null,
        status: null,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date(),
        source: 'manual',
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
      
      const result = await plugin.upsert(metadata);
      
      expect(result.displayName).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should delete metadata', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      await expect(plugin.delete('service-to-delete')).resolves.not.toThrow();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM service_metadata WHERE service_name = $1',
        ['service-to-delete']
      );
    });
  });

  describe('exists', () => {
    it('should return true when exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      
      const result = await plugin.exists('existing-service');
      
      expect(result).toBe(true);
    });

    it('should return false when not exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await plugin.exists('non-existent');
      
      expect(result).toBe(false);
    });
  });
});
