import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFilterStore = defineStore('filter', () => {
  const service = ref('');
  const timeRange = ref('24h');
  const customStartTime = ref<Date | null>(null);
  const customEndTime = ref<Date | null>(null);

  function formatDateTime(date: Date): string {
    // Format: YYYY-MM-DD HH:MM:SS (ClickHouse compatible)
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

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
        return formatDateTime(customStartTime.value || start);
    }
    
    return formatDateTime(start);
  });

  const endTime = computed(() => {
    return formatDateTime(customEndTime.value || new Date());
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
