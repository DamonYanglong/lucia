<script setup lang="ts">
import { useFilterStore } from '../stores/filter';

defineProps<{
  services: string[];
}>();

const filterStore = useFilterStore();
</script>

<template>
  <el-select 
    v-model="filterStore.service" 
    placeholder="All services" 
    clearable 
    size="default"
    style="width: 200px"
  >
    <el-option
      v-for="service in services"
      :key="service"
      :label="service"
      :value="service"
    />
  </el-select>
</template>
