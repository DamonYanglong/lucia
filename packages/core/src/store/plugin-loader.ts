import type { StorePlugins } from './interface';
import type { Config } from '../config';

type StoreConfig = Config['store'];

export async function loadPlugins(storeConfig: StoreConfig): Promise<StorePlugins> {
  const plugins: StorePlugins = {};

  // Load Trace plugin
  if (storeConfig.trace) {
    const tracePlugin = await loadPlugin('trace', storeConfig.trace.plugin);
    await tracePlugin.init(storeConfig.trace.config);
    plugins.trace = tracePlugin;
  }

  // Load Metric plugin (future)
  if (storeConfig.metric) {
    const metricPlugin = await loadPlugin('metric', storeConfig.metric.plugin);
    await metricPlugin.init(storeConfig.metric.config);
    plugins.metric = metricPlugin;
  }

  // Load Log plugin (future)
  if (storeConfig.log) {
    const logPlugin = await loadPlugin('log', storeConfig.log.plugin);
    await logPlugin.init(storeConfig.log.config);
    plugins.log = logPlugin;
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

  let module: any;
  if (builtin[type]?.includes(name)) {
    const packageName = type === 'trace'
      ? `@lucia/plugin-store-trace-${name}`
      : `@lucia/plugin-store-${type}-${name}`;
    module = await import(packageName);
  } else {
    // External plugins
    module = await import(`lucia-plugin-store-${type}-${name}`);
  }

  // Handle both default exports and named exports
  return module.default || module;
}
