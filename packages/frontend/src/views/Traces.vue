<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import { useTimezoneStore } from '../stores/timezone';

const router = useRouter();
const filterStore = useFilterStore();
const timezoneStore = useTimezoneStore();

const traces = ref<any[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

// 搜索条件
const searchForm = reactive({
  traceId: '',
  spanName: '',
  minDuration: '',
  maxDuration: '',
  status: '',
  httpStatusCode: '',
  tags: '',
});

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'OK', value: 'ok' },
  { label: 'Error', value: 'error' },
];

const timeShortcuts = [
  { text: '15m', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 / 4); return [start, end]; } },
  { text: '1h', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000); return [start, end]; } },
  { text: '3h', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 * 3); return [start, end]; } },
  { text: '6h', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 * 6); return [start, end]; } },
  { text: '24h', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 * 24); return [start, end]; } },
  { text: '3d', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 * 24 * 3); return [start, end]; } },
  { text: '7d', value: () => { const end = new Date(); const start = new Date(); start.setTime(start.getTime() - 3600 * 1000 * 24 * 7); return [start, end]; } },
];

const timeRange = ref<[Date, Date]>(getDefaultTimeRange());

function getDefaultTimeRange(): [Date, Date] {
  const end = new Date();
  const start = new Date();
  start.setTime(start.getTime() - 3600 * 1000);
  return [start, end];
}

onMounted(async () => {
  await loadServices();
  await loadTraces();
});

watch([() => filterStore.service, timeRange], () => {
  page.value = 1;
  loadTraces();
}, { deep: true });

async function loadServices() {
  try {
    const res = await fetch(`/api/services?startTime=${filterStore.startTime}&endTime=${filterStore.endTime}`);
    const data = await res.json();
    services.value = (data.data || []).map((s: any) => s.name);
  } catch (e) {
    console.error('Failed to load services', e);
  }
}

async function loadTraces() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    
    if (timeRange.value && timeRange.value[0] && timeRange.value[1]) {
      params.set('startTime', formatDateTime(timeRange.value[0]));
      params.set('endTime', formatDateTime(timeRange.value[1]));
    }
    
    params.set('page', String(page.value));
    params.set('pageSize', String(pageSize.value));
    
    if (filterStore.service) params.set('service', filterStore.service);
    if (searchForm.traceId) params.set('traceId', searchForm.traceId);
    if (searchForm.spanName) params.set('spanName', searchForm.spanName);
    if (searchForm.minDuration) params.set('minDuration', parseDuration(searchForm.minDuration));
    if (searchForm.maxDuration) params.set('maxDuration', parseDuration(searchForm.maxDuration));
    if (searchForm.status) params.set('status', searchForm.status);
    if (searchForm.httpStatusCode) params.set('httpStatusCode', searchForm.httpStatusCode);
    if (searchForm.tags) params.set('tags', searchForm.tags);
    
    const res = await fetch(`/api/traces?${params}`);
    const data = await res.json();
    traces.value = data.data?.list || [];
    total.value = data.data?.total || 0;
  } catch (e) {
    console.error('Failed to load traces', e);
  } finally {
    loading.value = false;
  }
}

function formatDateTime(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

function parseDuration(input: string): string {
  const match = input.match(/^([\d.]+)\s*(ms|s|us|ns|m)?$/i);
  if (!match) return input;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  
  switch (unit) {
    case 'ns': return String(value);
    case 'us': return String(value * 1000);
    case 'ms': return String(value * 1000000);
    case 's': return String(value * 1000000000);
    case 'm': return String(value * 60000000000);
    default: return String(value * 1000000);
  }
}

function goToTrace(traceId: string) {
  router.push(`/traces/${traceId}`);
}

function formatDuration(ns: number): string {
  if (ns >= 1000000000) return (ns / 1000000000).toFixed(2) + ' s';
  if (ns >= 1000000) return (ns / 1000000).toFixed(2) + ' ms';
  if (ns >= 1000) return (ns / 1000).toFixed(2) + ' µs';
  return ns + ' ns';
}

function getDurationClass(ns: number): string {
  if (ns >= 1000000000) return 'slow';
  if (ns >= 100000000) return 'medium';
  return 'fast';
}

function resetSearch() {
  searchForm.traceId = '';
  searchForm.spanName = '';
  searchForm.minDuration = '';
  searchForm.maxDuration = '';
  searchForm.status = '';
  searchForm.httpStatusCode = '';
  searchForm.tags = '';
  filterStore.service = '';
  timeRange.value = getDefaultTimeRange();
  page.value = 1;
  loadTraces();
}

function search() {
  page.value = 1;
  loadTraces();
}
</script>

<template>
  <div class="traces-page">
    <!-- 搜索表单 -->
    <div class="search-form card">
      <div class="search-row">
        <el-select
          v-model="filterStore.service"
          filterable
          clearable
          placeholder="Service"
          @change="search"
          style="width: 180px"
        >
          <el-option v-for="item in services" :key="item" :label="item" :value="item" />
        </el-select>
        
        <el-input
          v-model="searchForm.spanName"
          placeholder="URL or Span name"
          clearable
          @keyup.enter="search"
          style="width: 240px"
        />
        
        <el-input
          v-model="searchForm.traceId"
          placeholder="Trace ID"
          clearable
          @keyup.enter="search"
          style="width: 200px"
        />
        
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          :shortcuts="timeShortcuts"
          range-separator="→"
          start-placeholder="Start"
          end-placeholder="End"
          format="MM-DD HH:mm"
          style="width: 360px"
        />
        
        <el-select
          v-model="searchForm.status"
          clearable
          placeholder="Status"
          @change="search"
          style="width: 100px"
        >
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      
      <div class="search-row" style="margin-top: 12px">
        <el-input
          v-model="searchForm.minDuration"
          placeholder="Min duration (e.g. 100ms)"
          clearable
          @keyup.enter="search"
          style="width: 160px"
        />
        
        <el-input
          v-model="searchForm.maxDuration"
          placeholder="Max duration (e.g. 1s)"
          clearable
          @keyup.enter="search"
          style="width: 160px"
        />
        
        <el-input
          v-model="searchForm.tags"
          placeholder="Tags (key=value)"
          clearable
          @keyup.enter="search"
          style="width: 200px"
        />
        
        <div style="flex: 1"></div>
        
        <el-button type="primary" @click="search">
          <el-icon><Search /></el-icon>
          Search
        </el-button>
        <el-button @click="resetSearch">
          <el-icon><Refresh /></el-icon>
          Reset
        </el-button>
      </div>
    </div>
    
    <!-- 结果表格 -->
    <div class="card" style="margin-top: 16px">
      <el-table 
        :data="traces" 
        v-loading="loading"
        @row-click="(row: any) => goToTrace(row.traceId)"
      >
        <el-table-column label="Status" width="80">
          <template #default="{ row }">
            <span 
              class="status-badge"
              :class="row.statusCode === 'Error' || row.statusCode === 'STATUS_CODE_ERROR' ? 'error' : 'success'"
            >
              {{ row.statusCode === 'Error' || row.statusCode === 'STATUS_CODE_ERROR' ? 'Error' : 'OK' }}
            </span>
          </template>
        </el-table-column>
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
        <el-table-column label="Duration" width="120" sortable>
          <template #default="{ row }">
            <span class="duration" :class="getDurationClass(row.duration)">
              {{ formatDuration(row.duration) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Time" width="180">
          <template #default="{ row }">
            {{ timezoneStore.formatTime(row.timestamp) }}
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadTraces"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </div>
  </div>
</template>

<style scoped>
.traces-page {
  display: flex;
  flex-direction: column;
}

.search-form {
  padding: 16px 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background: var(--bg-tertiary) !important;
}
</style>
