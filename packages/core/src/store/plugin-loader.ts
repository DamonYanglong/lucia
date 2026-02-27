import type { StorePlugins } from './interface';

interface StoreConfig {
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
}

export async function loadPlugins(storeConfig: StoreConfig): Promise<StorePlugins> {
  const plugins: StorePlugins = {};
  
  // Load Trace plugin
  if (storeConfig.trace) {
    plugins.trace = await loadPlugin('trace', storeConfig.trace.plugin);
    await plugins.trace.init(storeConfig.trace.config);
  }
  
  // Load Metric plugin (future)
  if (storeConfig.metric) {
    plugins.metric = await loadPlugin('metric', storeConfig.metric.plugin);
    await plugins.metric.init(storeConfig.metric.config);
  }
  
  // Load Log plugin (future)
  if (storeConfig.log) {
    plugins.log = await loadPlugin('log', storeConfig.log.plugin);
    await plugins.log.init(storeConfig.log.config);
  }
  
  return plugins;
}

async function loadPlugin(type: 'trace' | 'metric' | 'log', name: string): Promise<any> {
  // Built-in plugins
  const builtin: Record<string, string[]> = {
    trace: ['clickhouse'],
    metric: ['prometheus'],
    log: ['clickhouse'],
  };
  
  if (builtin[type]?.includes(name)) {
    return import(`@lucia/plugin-store-${type}-${name}`);
  }
  
  // External plugins
  return import(`lucia-plugin-store-${type}-${name}`);
}
