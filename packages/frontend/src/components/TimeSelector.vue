<script setup lang="ts">
import { useFilterStore } from '../stores/filter';

const filterStore = useFilterStore();

const options = [
  { label: 'Last 15 minutes', value: '15m' },
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 24 hours', value: '24h' },
];
</script>

<template>
  <el-select v-model="filterStore.timeRange" placeholder="Time range" size="default" style="width: 160px">
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>
