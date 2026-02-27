<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import TimeSelector from '../components/TimeSelector.vue';
import ServiceFilter from '../components/ServiceFilter.vue';

const router = useRouter();
const filterStore = useFilterStore();

const traces = ref<any[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

onMounted(async () => {
  await loadServices();
  await loadTraces();
});

watch([() => filterStore.service, () => filterStore.startTime, () => filterStore.endTime], () => {
  page.value = 1;
  loadTraces();
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

async function loadTraces() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      startTime: filterStore.startTime,
      endTime: filterStore.endTime,
      page: String(page.value),
      pageSize: String(pageSize.value),
    });
    if (filterStore.service) {
      params.set('service', filterStore.service);
    }
    
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

function goToTrace(traceId: string) {
  router.push(`/traces/${traceId}`);
}

function formatDuration(ns: number): string {
  return (ns / 1000000).toFixed(2) + ' ms';
}
</script>

<template>
  <div class="traces-page">
    <div class="header">
      <h2>Traces</h2>
      <div class="filters">
        <TimeSelector />
        <ServiceFilter :services="services" />
      </div>
    </div>
    
    <el-table :data="traces" v-loading="loading" stripe @row-click="(row: any) => goToTrace(row.traceId)">
      <el-table-column prop="serviceName" label="Service" width="180" />
      <el-table-column prop="spanName" label="Operation" />
      <el-table-column label="Duration" width="120">
        <template #default="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </el-table-column>
      <el-table-column prop="statusCode" label="Status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.statusCode === 'Error' ? 'danger' : 'success'" size="small">
            {{ row.statusCode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="timestamp" label="Time" width="180" />
    </el-table>
    
    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="loadTraces"
    />
  </div>
</template>

<style scoped>
.traces-page {
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

.el-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
