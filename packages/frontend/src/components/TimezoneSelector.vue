<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useTimezoneStore } from '../stores/timezone';

const timezoneStore = useTimezoneStore();

onMounted(async () => {
  await timezoneStore.fetchServerSettings();
});

const selectedTimezone = computed({
  get: () => timezoneStore.selectedTimezone || timezoneStore.serverTimezone,
  set: (value: string) => {
    if (value === timezoneStore.serverTimezone) {
      timezoneStore.clearTimezone();
    } else {
      timezoneStore.setTimezone(value);
    }
  },
});
</script>

<template>
  <el-select
    v-model="selectedTimezone"
    placeholder="Timezone"
    size="small"
    style="width: 200px"
  >
    <el-option
      v-for="tz in timezoneStore.availableTimezones"
      :key="tz.value"
      :label="tz.label"
      :value="tz.value"
    />
  </el-select>
</template>
