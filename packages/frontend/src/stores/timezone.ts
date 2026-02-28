import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface TimezoneOption {
  label: string;
  value: string;
}

export const useTimezoneStore = defineStore('timezone', () => {
  const serverTimezone = ref('UTC');
  const selectedTimezone = ref<string | null>(null);
  const availableTimezones = ref<TimezoneOption[]>([]);

  // Use selected timezone if set, otherwise fall back to server timezone
  const timezone = computed(() => {
    return selectedTimezone.value || serverTimezone.value;
  });

  // Load timezone from localStorage on init
  function loadFromStorage() {
    const stored = localStorage.getItem('lucia-timezone');
    if (stored) {
      selectedTimezone.value = stored;
    }
  }

  // Save timezone to localStorage
  function setTimezone(tz: string) {
    selectedTimezone.value = tz;
    localStorage.setItem('lucia-timezone', tz);
  }

  // Clear stored timezone (reset to server default)
  function clearTimezone() {
    selectedTimezone.value = null;
    localStorage.removeItem('lucia-timezone');
  }

  // Fetch server settings
  async function fetchServerSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        serverTimezone.value = data.data.timezone;
        availableTimezones.value = data.data.timezones;
      }
    } catch (e) {
      console.error('Failed to fetch server settings', e);
    }
  }

  // Format a timestamp with the current timezone
  function formatTime(timestamp: string | Date, format: 'full' | 'datetime' | 'date' | 'time' = 'datetime'): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    const options: Intl.DateTimeFormatOptions = {};

    switch (format) {
      case 'full':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        options.timeZoneName = 'short';
        break;
      case 'datetime':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        break;
      case 'date':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        break;
    }

    options.timeZone = timezone.value;
    options.hour12 = false;

    try {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch {
      options.timeZone = 'UTC';
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
  }

  // Initialize
  loadFromStorage();

  return {
    serverTimezone,
    selectedTimezone,
    timezone,
    availableTimezones,
    setTimezone,
    clearTimezone,
    fetchServerSettings,
    formatTime,
  };
});
