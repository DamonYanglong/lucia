<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFilterStore } from '../stores/filter';
import type { Service } from '../api';

const filterStore = useFilterStore();
const services = ref<Service[]>([]);
const loading = ref(false);

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
</script>

<template>
  <div class="services-page">
    <h2>Services</h2>
    <el-table :data="services" v-loading="loading" stripe>
      <el-table-column prop="name" label="Service Name" />
      <el-table-column prop="requestCount" label="Requests" width="120" />
      <el-table-column prop="errorCount" label="Errors" width="100" />
      <el-table-column label="Avg Duration" width="140">
        <template #default="{ row }">
          {{ (row.avgDuration / 1000000).toFixed(2) }} ms
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.services-page {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

h2 {
  margin-bottom: 20px;
}
</style>
