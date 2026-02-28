<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import type { Service } from '../api';

const router = useRouter();
const filterStore = useFilterStore();
const services = ref<Service[]>([]);
const loading = ref(false);

// 计算统计数据
const stats = computed(() => {
  const totalRequests = services.value.reduce((sum, s) => sum + (s.requestCount || 0), 0);
  const totalErrors = services.value.reduce((sum, s) => sum + (s.errorCount || 0), 0);
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0';
  const avgDuration = services.value.length > 0
    ? services.value.reduce((sum, s) => sum + (s.avgDuration || 0), 0) / services.value.length
    : 0;
  
  return {
    totalServices: services.value.length,
    totalRequests,
    totalErrors,
    errorRate,
    avgDuration,
  };
});

onMounted(async () => {
  await loadServices();
});

async function loadServices() {
  loading.value = true;
  try {
    const res = await fetch(`/api/services?startTime=${filterStore.startTime}&endTime=${filterStore.endTime}`);
    const data = await res.json();
    services.value = data.data || [];
  } catch (e) {
    console.error('Failed to load services', e);
  } finally {
    loading.value = false;
  }
}

function formatDuration(ns: number): string {
  if (ns >= 1000000000) return (ns / 1000000000).toFixed(2) + ' s';
  if (ns >= 1000000) return (ns / 1000000).toFixed(2) + ' ms';
  if (ns >= 1000) return (ns / 1000).toFixed(2) + ' µs';
  return ns + ' ns';
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function getServiceStatus(s: Service): 'healthy' | 'warning' | 'error' {
  const errorRate = s.requestCount > 0 ? s.errorCount / s.requestCount : 0;
  if (errorRate > 0.05) return 'error';
  if (errorRate > 0.01) return 'warning';
  return 'healthy';
}

function goToTraces(serviceName: string) {
  filterStore.service = serviceName;
  router.push('/traces');
}
</script>

<template>
  <div class="services-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalServices }}</div>
        <div class="stat-label">Services</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(stats.totalRequests) }}</div>
        <div class="stat-label">Total Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" :class="{ 'text-error': parseFloat(stats.errorRate) > 1 }">
          {{ stats.errorRate }}%
        </div>
        <div class="stat-label">Error Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatDuration(stats.avgDuration) }}</div>
        <div class="stat-label">Avg Duration</div>
      </div>
    </div>
    
    <!-- 服务列表 -->
    <div class="services-list" v-loading="loading">
      <div 
        v-for="service in services" 
        :key="service.name"
        class="service-card"
        @click="goToTraces(service.name)"
      >
        <div class="service-name">
          <span class="service-status" :class="getServiceStatus(service)"></span>
          {{ service.name }}
        </div>
        <div class="service-metrics">
          <div class="metric">
            <div class="metric-value">{{ formatNumber(service.requestCount || 0) }}</div>
            <div class="metric-label">Requests</div>
          </div>
          <div class="metric">
            <div class="metric-value" :class="{ 'text-error': service.errorCount > 0 }">
              {{ service.errorCount || 0 }}
            </div>
            <div class="metric-label">Errors</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ formatDuration(service.avgDuration || 0) }}</div>
            <div class="metric-label">Avg Duration</div>
          </div>
        </div>
      </div>
      
      <div v-if="!loading && services.length === 0" class="empty-state">
        No services found
      </div>
    </div>
  </div>
</template>

<style scoped>
.services-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.text-error {
  color: var(--error);
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
}
</style>
