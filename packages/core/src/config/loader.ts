import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export interface Config {
  server: {
    port: number;
    host: string;
  };
  timezone: string;
  store: {
    trace?: {
      plugin: string;
      config: Record<string, unknown>;
    };
    metric?: {
      plugin: string;
      config: Record<string, unknown>;
    };
    log?: {
      plugin: string;
      config: Record<string, unknown>;
    };
  };
}

const defaultConfig: Config = {
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  timezone: 'UTC',
  store: {},
};

function envOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function envNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export async function loadConfig(): Promise<Config> {
  // Try multiple config paths
  const configPaths = [
    process.env.LUCIA_CONFIG,
    'config.yaml',
    '../../config.yaml',  // When running from packages/core
    '../config.yaml',      // When running from packages/
  ].filter(Boolean) as string[];
  
  let fileConfig: Partial<Config> = {};
  
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      const content = await readFile(configPath, 'utf-8');
      fileConfig = parse(content);
      break;
    }
  }
  
  // Environment variable overrides
  const envConfig: Partial<Config> = {
    server: {
      port: envNumber('LUCIA_PORT', fileConfig.server?.port || defaultConfig.server.port),
      host: envOrDefault('LUCIA_HOST', fileConfig.server?.host || defaultConfig.server.host),
    },
    timezone: envOrDefault('TIMEZONE', fileConfig.timezone || defaultConfig.timezone),
    store: {
      ...fileConfig.store,
      trace: fileConfig.store?.trace ? {
        plugin: fileConfig.store.trace.plugin,
        config: {
          ...fileConfig.store.trace.config,
          host: envOrDefault('CLICKHOUSE_HOST', fileConfig.store.trace.config.host as string || 'localhost'),
          port: envNumber('CLICKHOUSE_PORT', fileConfig.store.trace.config.port as number || 9000),
          database: envOrDefault('CLICKHOUSE_DATABASE', fileConfig.store.trace.config.database as string || 'default'),
          username: envOrDefault('CLICKHOUSE_USERNAME', fileConfig.store.trace.config.username as string || 'default'),
          password: envOrDefault('CLICKHOUSE_PASSWORD', fileConfig.store.trace.config.password as string || ''),
        },
      } : undefined,
    },
  };
  
  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
  };
}
