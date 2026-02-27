import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFilterStore = defineStore('filter', () => {
  const service = ref('');
  const timeRange = ref('1h');
  const customStartTime = ref<Date | null>(null);
  const customEndTime = ref<Date | null>(null);

  const startTime = computed(() => {
    const end = customEndTime.value || new Date();
    const start = new Date();
    
    switch (timeRange.value) {
      case '15m':
        start.setTime(end.getTime() - 15 * 60 * 1000);
        break;
      case '1h':
        start.setTime(end.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        return customStartTime.value?.toISOString() || start.toISOString();
    }
    
    return start.toISOString();
  });

  const endTime = computed(() => {
    return (customEndTime.value || new Date()).toISOString();
  });

  function setService(s: string) {
    service.value = s;
  }

  function setTimeRange(r: string) {
    timeRange.value = r;
  }

  function setCustomRange(start: Date, end: Date) {
    customStartTime.value = start;
    customEndTime.value = end;
    timeRange.value = 'custom';
  }

  return {
    service,
    timeRange,
    customStartTime,
    customEndTime,
    startTime,
    endTime,
    setService,
    setTimeRange,
    setCustomRange,
  };
});
