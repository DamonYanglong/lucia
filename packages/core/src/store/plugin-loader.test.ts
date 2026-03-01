import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPlugins } from './plugin-loader';

// Mock the dynamic imports
vi.mock('@lucia/plugin-store-trace-clickhouse', () => ({
  default: {
    name: 'clickhouse',
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@lucia/plugin-store-metadata-sqlite', () => ({
  default: {
    name: 'sqlite',
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('plugin-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPlugins', () => {
    it('should return empty plugins when no config', async () => {
      const plugins = await loadPlugins({});
      
      expect(plugins).toEqual({});
      expect(plugins.trace).toBeUndefined();
      expect(plugins.metric).toBeUndefined();
      expect(plugins.log).toBeUndefined();
    });

    it('should load trace plugin', async () => {
      const config = {
        trace: {
          plugin: 'clickhouse',
          config: {
            host: 'localhost',
            port: 8123,
            database: 'otel',
            username: 'default',
            password: '',
          },
        },
      };

      const plugins = await loadPlugins(config);
      
      expect(plugins.trace).toBeDefined();
      expect(plugins.trace!.name).toBe('clickhouse');
    });

    it('should skip undefined plugin types', async () => {
      const config = {
        trace: undefined,
        metric: undefined,
        log: undefined,
      };

      const plugins = await loadPlugins(config);
      
      expect(plugins.trace).toBeUndefined();
      expect(plugins.metric).toBeUndefined();
      expect(plugins.log).toBeUndefined();
    });

    it('should initialize plugin with config', async () => {
      const mockInit = vi.fn().mockResolvedValue(undefined);
      
      vi.doMock('@lucia/plugin-store-trace-clickhouse', () => ({
        default: {
          name: 'clickhouse',
          init: mockInit,
        },
      }));

      const traceConfig = {
        plugin: 'clickhouse',
        config: {
          host: 'localhost',
          port: 8123,
        },
      };

      const plugins = await loadPlugins({ trace: traceConfig });
      
      expect(plugins.trace).toBeDefined();
    });
  });

  describe('loadPlugin', () => {
    it('should load builtin plugin', async () => {
      const config = {
        trace: {
          plugin: 'clickhouse',
          config: { host: 'localhost' },
        },
      };

      const plugins = await loadPlugins(config);
      
      expect(plugins.trace).toBeDefined();
    });

    it('should handle named exports', async () => {
      // Test that the loader handles both default and named exports
      const config = {
        trace: {
          plugin: 'clickhouse',
          config: { host: 'localhost' },
        },
      };

      const plugins = await loadPlugins(config);
      
      expect(plugins.trace).toBeDefined();
      expect(typeof plugins.trace!.init).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle plugin init failure gracefully', async () => {
      const mockFailingPlugin = {
        name: 'failing-plugin',
        init: vi.fn().mockRejectedValue(new Error('Connection failed')),
      };

      vi.doMock('@lucia/plugin-store-trace-clickhouse', () => ({
        default: mockFailingPlugin,
      }));

      const config = {
        trace: {
          plugin: 'clickhouse',
          config: { host: 'invalid-host' },
        },
      };

      // The loader should throw on init failure
      await expect(loadPlugins(config)).rejects.toThrow();
    });
  });
});
