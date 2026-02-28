<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import { useTimezoneStore } from '../stores/timezone';
import type { ErrorItem, ErrorGroup } from '../api';
import TimeSelector from '../components/TimeSelector.vue';
import ServiceFilter from '../components/ServiceFilter.vue';

const router = useRouter();
const filterStore = useFilterStore();
const timezoneStore = useTimezoneStore();

const errors = ref<ErrorItem[]>([]);
const errorGroups = ref<ErrorGroup[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const activeTab = ref('list');

// 计算统计数据
const stats = computed(() => {
  const totalErrors = errors.value.length;
  const servicesWithErrors = new Set(errors.value.map(e => e.serviceName)).size;
  const uniqueMessages = new Set(errors.value.map(e => e.statusMessage)).size;

  return {
    totalErrors,
    servicesWithErrors,
    uniqueMessages,
  };
});

onMounted(async () => {
  await loadServices();
  await loadData();
});

watch([() => filterStore.service, () => filterStore.startTime, () => filterStore.endTime], () => {
  page.value = 1;
  loadData();
});

watch(activeTab, () => {
  page.value = 1;
  loadData();
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

async function loadData() {
  loading.value = true;
  try {
    if (activeTab.value === 'list') {
      await loadErrors();
    } else {
      await loadErrorGroups();
    }
  } finally {
    loading.value = false;
  }
}

async function loadErrors() {
  const params = new URLSearchParams({
    startTime: filterStore.startTime,
    endTime: filterStore.endTime,
    page: String(page.value),
    pageSize: String(pageSize.value),
  });
  if (filterStore.service) {
    params.set('service', filterStore.service);
  }

  const res = await fetch(`/api/errors?${params}`);
  const data = await res.json();
  errors.value = data.data?.list || [];
  total.value = data.data?.total || 0;
}

async function loadErrorGroups() {
  const params = new URLSearchParams({
    startTime: filterStore.startTime,
    endTime: filterStore.endTime,
  });
  if (filterStore.service) {
    params.set('service', filterStore.service);
  }

  const res = await fetch(`/api/errors/groups?${params}`);
  const data = await res.json();
  errorGroups.value = data.data || [];
  total.value = errorGroups.value.length;
}

function goToTrace(traceId: string) {
  router.push(`/traces/${traceId}`);
}

function groupedErrors(errors: ErrorItem[]): Map<string, ErrorItem[]> {
  const groups = new Map<string, ErrorItem[]>();
  for (const error of errors) {
    const key = error.statusMessage || 'Unknown Error';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(error);
  }
  return groups;
}

const aggregatedErrors = computed(() => {
  return Array.from(groupedErrors(errors.value).entries()).map(([message, items]) => ({
    message,
    count: items.length,
    lastOccurrence: items[0].timestamp,
    serviceName: items[0].serviceName,
    items,
  }));
});
</script>

<template>
  <div class="errors-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value text-error">{{ stats.totalErrors }}</div>
        <div class="stat-label">Total Errors</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.servicesWithErrors }}</div>
        <div class="stat-label">Affected Services</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.uniqueMessages }}</div>
        <div class="stat-label">Unique Errors</div>
      </div>
    </div>

    <!-- 过滤器 -->
    <div class="filters card">
      <TimeSelector />
      <ServiceFilter :services="services" />
    </div>

    <!-- 标签页 -->
    <div class="card">
      <el-tabs v-model="activeTab" @tab-change="loadData">
        <el-tab-pane label="Error List" name="list">
          <el-table :data="errors" v-loading="loading">
            <el-table-column prop="serviceName" label="Service" width="160">
              <template #default="{ row }">
                <el-tag size="small" effect="dark" type="info">{{ row.serviceName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="spanName" label="Operation" width="200">
              <template #default="{ row }">
                <span class="operation-name">{{ row.spanName }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="statusMessage" label="Error Message" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="error-message">{{ row.statusMessage }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Time" width="180">
              <template #default="{ row }">
                <span class="time-text">{{ timezoneStore.formatTime(row.timestamp) }}</span>
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

          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="loadErrors"
            class="pagination"
          />
        </el-tab-pane>

        <el-tab-pane label="Aggregated" name="aggregated">
          <el-table :data="aggregatedErrors" v-loading="loading">
            <el-table-column prop="serviceName" label="Service" width="160">
              <template #default="{ row }">
                <el-tag size="small" effect="dark" type="info">{{ row.serviceName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="Error Message" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="error-message">{{ row.message }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="Count" width="100" sortable>
              <template #default="{ row }">
                <span class="status-badge error">{{ row.count }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Last Occurrence" width="180">
              <template #default="{ row }">
                <span class="time-text">{{ timezoneStore.formatTime(row.lastOccurrence) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="goToTrace(row.items[0].traceId)">
                  View Sample
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="Error Groups" name="groups">
          <el-table :data="errorGroups" v-loading="loading">
            <el-table-column prop="serviceName" label="Service" width="160">
              <template #default="{ row }">
                <el-tag size="small" effect="dark" type="info">{{ row.serviceName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="Error Message" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="error-message">{{ row.message }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="Count" width="100" sortable>
              <template #default="{ row }">
                <span class="status-badge error">{{ row.count }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Last Occurrence" width="180">
              <template #default="{ row }">
                <span class="time-text">{{ timezoneStore.formatTime(row.lastOccurrence) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.errors-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.text-error {
  color: var(--error);
}

.filters {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.error-message {
  color: var(--error);
  font-size: 13px;
}

.time-text {
  color: var(--text-secondary);
  font-size: 13px;
}

:deep(.el-tabs__item) {
  color: var(--text-secondary);
}

:deep(.el-tabs__item.is-active) {
  color: var(--accent);
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: var(--border);
}
</style>
