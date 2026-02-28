<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import { useTimezoneStore } from '../stores/timezone';
import type { SlowCall } from '../api';
import { formatDuration } from '../api';
import TimeSelector from '../components/TimeSelector.vue';
import ServiceFilter from '../components/ServiceFilter.vue';

const router = useRouter();
const filterStore = useFilterStore();
const timezoneStore = useTimezoneStore();

const slowCalls = ref<SlowCall[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const limit = ref(100);

// 计算统计数据
const stats = computed(() => {
  const total = slowCalls.value.length;
  const slowestDuration = total > 0 ? slowCalls.value[0].duration : 0;
  const avgDuration = total > 0
    ? slowCalls.value.reduce((sum, c) => sum + c.duration, 0) / total
    : 0;
  const p99Duration = total > 0
    ? slowCalls.value[Math.min(Math.floor(total * 0.99), total - 1)].duration
    : 0;

  return {
    total,
    slowestDuration,
    avgDuration,
    p99Duration,
  };
});

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

function getDurationClass(duration: number): string {
  const ms = duration / 1000000;
  if (ms > 5000) return 'slow';
  if (ms > 1000) return 'medium';
  return 'fast';
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
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">Total Slow Calls</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-error">{{ formatDuration(stats.slowestDuration) }}</div>
        <div class="stat-label">Slowest Call</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-warning">{{ formatDuration(stats.avgDuration) }}</div>
        <div class="stat-label">Average Duration</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatDuration(stats.p99Duration) }}</div>
        <div class="stat-label">P99 Duration</div>
      </div>
    </div>

    <!-- 过滤器 -->
    <div class="filters card">
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

    <!-- 慢调用列表 -->
    <div class="card">
      <el-table
        :data="slowCalls"
        v-loading="loading"
        default-sort="{ prop: 'duration', order: 'descending' }"
        @row-click="(row: SlowCall) => goToTrace(row.traceId)"
      >
        <el-table-column prop="serviceName" label="Service" width="160">
          <template #default="{ row }">
            <el-tag size="small" effect="dark" type="info">{{ row.serviceName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="spanName" label="Operation" min-width="240">
          <template #default="{ row }">
            <span class="operation-name">{{ row.spanName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Duration" width="140" sortable="custom">
          <template #default="{ row }">
            <span class="duration" :class="getDurationClass(row.duration)">
              {{ formatDuration(row.duration) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Time" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ timezoneStore.formatTime(row.timestamp) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Trace ID" width="120">
          <template #default="{ row }">
            <span class="trace-id">{{ row.traceId.slice(0, 8) }}...</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && slowCalls.length === 0" description="No slow calls found" />
    </div>
  </div>
</template>

<style scoped>
.slow-calls-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.text-error {
  color: var(--error);
}

.text-warning {
  color: var(--warning);
}

.filters {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
}

.trace-id {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.time-text {
  color: var(--text-secondary);
  font-size: 13px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background: var(--bg-tertiary) !important;
}
</style>
