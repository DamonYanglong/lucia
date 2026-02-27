<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import type { SlowCall } from '../api';
import { formatDuration, formatDate } from '../api';
import TimeSelector from '../components/TimeSelector.vue';
import ServiceFilter from '../components/ServiceFilter.vue';

const router = useRouter();
const filterStore = useFilterStore();

const slowCalls = ref<SlowCall[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const limit = ref(100);

onMounted(async () => {
  await loadServices();
  await loadSlowCalls();
});

watch([() => filterStore.service, () => filterStore.startTime, () => filterStore.endTime, limit], () => {
  loadSlowCalls();
});

async function loadServices() {
  try {
    const res = await fetch(`/api/services?startTime=${filterStore.startTime}&endTime=${filterStore.endTime}`);
    const data = await res.json();
    services.value = (data.data || []).map((s: any) => s.name);
  } catch (e) {
    console.error('Failed to load services', e);
  }
}

async function loadSlowCalls() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      startTime: filterStore.startTime,
      endTime: filterStore.endTime,
      limit: String(limit.value),
    });
    if (filterStore.service) {
      params.set('service', filterStore.service);
    }

    const res = await fetch(`/api/slow?${params}`);
    const data = await res.json();
    slowCalls.value = data.data || [];
  } catch (e) {
    console.error('Failed to load slow calls', e);
  } finally {
    loading.value = false;
  }
}

function goToTrace(traceId: string) {
  router.push(`/traces/${traceId}`);
}

function getDurationColor(duration: number): string {
  // Duration is in nanoseconds
  const ms = duration / 1000000;
  if (ms > 5000) return 'danger';
  if (ms > 1000) return 'warning';
  return 'success';
}

const limitOptions = [
  { value: 50, label: 'Top 50' },
  { value: 100, label: 'Top 100' },
  { value: 200, label: 'Top 200' },
  { value: 500, label: 'Top 500' },
];
</script>

<template>
  <div class="slow-calls-page">
    <div class="header">
      <h2>Slow Calls</h2>
      <div class="filters">
        <TimeSelector />
        <ServiceFilter :services="services" />
        <el-select v-model="limit" placeholder="Limit" style="width: 120px">
          <el-option
            v-for="opt in limitOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">{{ slowCalls.length }}</div>
        <div class="stat-label">Total Slow Calls</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          {{ slowCalls.length > 0 ? formatDuration(slowCalls[0].duration) : '-' }}
        </div>
        <div class="stat-label">Slowest Call</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          {{
            slowCalls.length > 0
              ? formatDuration(slowCalls.reduce((sum, c) => sum + c.duration, 0) / slowCalls.length)
              : '-'
          }}
        </div>
        <div class="stat-label">Average Duration</div>
      </div>
    </div>

    <el-table
      :data="slowCalls"
      v-loading="loading"
      stripe
      default-sort="{ prop: 'duration', order: 'descending' }"
    >
      <el-table-column prop="serviceName" label="Service" width="150" />
      <el-table-column prop="spanName" label="Operation" min-width="200" />
      <el-table-column label="Duration" width="150" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="getDurationColor(row.duration)" size="small">
            {{ formatDuration(row.duration) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Time" width="180">
        <template #default="{ row }">
          {{ formatDate(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="Trace ID" width="100">
        <template #default="{ row }">
          <span class="trace-id">{{ row.traceId.slice(0, 8) }}...</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="goToTrace(row.traceId)">
            View Trace
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && slowCalls.length === 0" description="No slow calls found" />
  </div>
</template>

<style scoped>
.slow-calls-page {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 16px;
}

h2 {
  margin: 0;
}

.stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: #fff;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.trace-id {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
}
</style>
