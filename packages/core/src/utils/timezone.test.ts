import { describe, it, expect } from 'vitest';
import {
  formatWithTimezone,
  formatForDatabase,
  getCommonTimezones,
  isValidTimezone,
  getTimezoneOffset,
} from './timezone';

describe('timezone utilities', () => {
  describe('formatWithTimezone', () => {
    it('should format a timestamp in UTC', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      const result = formatWithTimezone(timestamp, 'UTC', 'datetime');
      expect(result).toContain('2024');
      expect(result).toContain('01');
      expect(result).toContain('15');
    });

    it('should format a timestamp in Asia/Shanghai timezone', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      const result = formatWithTimezone(timestamp, 'Asia/Shanghai', 'datetime');
      // Asia/Shanghai is UTC+8, so 10:30 UTC should be 18:30 local
      expect(result).toContain('18');
      expect(result).toContain('30');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:45.000Z');
      const result = formatWithTimezone(date, 'UTC', 'datetime');
      expect(result).toContain('2024');
    });

    it('should format with full format including timezone name', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      const result = formatWithTimezone(timestamp, 'UTC', 'full');
      expect(result).toContain('UTC');
    });

    it('should format with date only', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      const result = formatWithTimezone(timestamp, 'UTC', 'date');
      expect(result).toContain('2024');
      expect(result).toContain('01');
      expect(result).toContain('15');
      expect(result).not.toContain(':');  // No time component
    });

    it('should format with time only', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      const result = formatWithTimezone(timestamp, 'UTC', 'time');
      expect(result).toContain('10');
      expect(result).toContain('30');
      expect(result).toContain('45');
    });

    it('should fallback to UTC for invalid timezone', () => {
      const timestamp = '2024-01-15T10:30:45.000Z';
      // Invalid timezone should not throw, should fallback to UTC
      const result = formatWithTimezone(timestamp, 'Invalid/Timezone', 'datetime');
      expect(result).toBeDefined();
    });
  });

  describe('formatForDatabase', () => {
    it('should format a date for ClickHouse queries', () => {
      const date = new Date('2024-01-15T10:30:45.123Z');
      const result = formatForDatabase(date);
      expect(result).toBe('2024-01-15 10:30:45');
    });

    it('should pad single digit values', () => {
      const date = new Date('2024-01-05T01:02:03.000Z');
      const result = formatForDatabase(date);
      expect(result).toBe('2024-01-05 01:02:03');
    });
  });

  describe('getCommonTimezones', () => {
    it('should return an array of timezone options', () => {
      const timezones = getCommonTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
    });

    it('should include UTC', () => {
      const timezones = getCommonTimezones();
      const utc = timezones.find(tz => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc?.label).toBe('UTC');
    });

    it('should include Asia/Shanghai', () => {
      const timezones = getCommonTimezones();
      const shanghai = timezones.find(tz => tz.value === 'Asia/Shanghai');
      expect(shanghai).toBeDefined();
    });

    it('should have label and value for each timezone', () => {
      const timezones = getCommonTimezones();
      for (const tz of timezones) {
        expect(tz).toHaveProperty('label');
        expect(tz).toHaveProperty('value');
        expect(typeof tz.label).toBe('string');
        expect(typeof tz.value).toBe('string');
      }
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Asia/Shanghai')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('GMT+8')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getTimezoneOffset', () => {
    it('should return offset for UTC', () => {
      const offset = getTimezoneOffset('UTC');
      expect(offset).toBe('+00:00');
    });

    it('should return positive offset for Asia/Shanghai', () => {
      const offset = getTimezoneOffset('Asia/Shanghai');
      // Asia/Shanghai is UTC+8
      expect(offset).toMatch(/\+08:00/);
    });

    it('should return negative offset for America/New_York', () => {
      const offset = getTimezoneOffset('America/New_York');
      // America/New_York is UTC-5 or UTC-4 depending on DST
      expect(offset).toMatch(/-0[45]:00/);
    });

    it('should return offset in correct format', () => {
      const offset = getTimezoneOffset('Asia/Tokyo');
      // Should match format like +09:00
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });
  });
});
