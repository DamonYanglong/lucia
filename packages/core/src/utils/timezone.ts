/**
 * Timezone utility functions for formatting timestamps
 */

/**
 * Format a UTC timestamp to a specific timezone
 * @param timestamp - ISO timestamp string or Date object
 * @param timezone - IANA timezone identifier (e.g., 'UTC', 'Asia/Shanghai')
 * @param format - Format style: 'full', 'datetime', 'date', 'time'
 * @returns Formatted string in the specified timezone
 */
export function formatWithTimezone(
  timestamp: string | Date,
  timezone: string,
  format: 'full' | 'datetime' | 'date' | 'time' = 'datetime'
): string {
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

  options.timeZone = timezone;
  options.hour12 = false;

  try {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    // Fallback to UTC if timezone is invalid
    options.timeZone = 'UTC';
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

/**
 * Format timestamp for ClickHouse queries (YYYY-MM-DD HH:MM:SS)
 * @param date - Date object
 * @returns Formatted string for database queries
 */
export function formatForDatabase(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Get list of common timezones
 * @returns Array of timezone objects with label and value
 */
export function getCommonTimezones(): Array<{ label: string; value: string }> {
  return [
    { label: 'UTC', value: 'UTC' },
    { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
    { label: 'Asia/Hong_Kong (HKT)', value: 'Asia/Hong_Kong' },
    { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
    { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
    { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
    { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
    { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
    { label: 'America/Denver (MST/MDT)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
    { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' },
  ];
}

/**
 * Validate if a timezone string is valid
 * @param timezone - IANA timezone identifier
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current offset for a timezone in hours
 * @param timezone - IANA timezone identifier
 * @returns Offset string like '+08:00' or '-05:00'
 */
export function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const diff = tzDate.getTime() - utcDate.getTime();

  const hours = Math.floor(Math.abs(diff) / 3600000);
  const minutes = Math.floor((Math.abs(diff) % 3600000) / 60000);
  const sign = diff >= 0 ? '+' : '-';

  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
