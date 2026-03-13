/**
 * Timezone-based date validation utilities
 * Handles date validation based on tour's country timezone
 */

/**
 * Timezone mapping for countries
 * Maps country codes to their IANA timezone identifiers
 */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  MX: 'America/Mexico_City',
  US: 'America/New_York',
  ES: 'Europe/Madrid',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IT: 'Europe/Rome',
  GB: 'Europe/London',
  RU: 'Europe/Moscow',
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  BR: 'America/Sao_Paulo',
  AR: 'America/Argentina/Buenos_Aires',
  CO: 'America/Bogota',
  PE: 'America/Lima',
  CL: 'America/Santiago',
  AU: 'Australia/Sydney',
  CA: 'America/Toronto',
  IN: 'Asia/Kolkata',
  KR: 'Asia/Seoul',
  ZA: 'Africa/Johannesburg',
  NG: 'Africa/Lagos',
  EG: 'Africa/Cairo',
  TR: 'Europe/Istanbul',
  SA: 'Asia/Riyadh',
  AE: 'Asia/Dubai',
  TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh',
  ID: 'Asia/Jakarta',
  MY: 'Asia/Kuala_Lumpur',
  PH: 'Asia/Manila',
  SG: 'Asia/Singapore',
  NZ: 'Pacific/Auckland',
};

/**
 * Get timezone for a country code
 * Defaults to UTC if country not found
 */
export function getTimezoneForCountry(countryCode: string): string {
  return COUNTRY_TIMEZONES[countryCode.toUpperCase()] ?? 'UTC';
}

/**
 * Parse a time string (e.g., "06:00 AM" or "14:30") to hours and minutes
 */
export function parseTimeToHoursMinutes(timeStr: string): { hours: number; minutes: number } {
  // Try to parse 12-hour format (e.g., "06:00 AM")
  const amPmMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch !== null) {
    let hours = parseInt(amPmMatch[1] ?? '0', 10);
    const minutes = parseInt(amPmMatch[2] ?? '0', 10);
    const period = amPmMatch[3]?.toUpperCase() ?? '';

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  // Try to parse 24-hour format (e.g., "14:30")
  const h24Match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match !== null) {
    const hours = parseInt(h24Match[1] ?? '0', 10);
    const minutes = parseInt(h24Match[2] ?? '0', 10);
    return { hours, minutes };
  }

  // Default to midnight if parsing fails
  return { hours: 0, minutes: 0 };
}

/**
 * Get the current date in a specific timezone
 */
export function getCurrentDateInTimezone(timezone: string): Date {
  const now = new Date();
  // Create a date string in the target timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  const yearPart = parts.find((p) => p.type === 'year');
  const monthPart = parts.find((p) => p.type === 'month');
  const dayPart = parts.find((p) => p.type === 'day');
  const hoursPart = parts.find((p) => p.type === 'hour');
  const minutesPart = parts.find((p) => p.type === 'minute');
  const secondsPart = parts.find((p) => p.type === 'second');

  const year = parseInt(yearPart?.value ?? '0', 10);
  const month = parseInt(monthPart?.value ?? '0', 10) - 1;
  const day = parseInt(dayPart?.value ?? '0', 10);
  const hours = parseInt(hoursPart?.value ?? '0', 10);
  const minutes = parseInt(minutesPart?.value ?? '0', 10);
  const seconds = parseInt(secondsPart?.value ?? '0', 10);

  return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * Calculate the minimum allowed date for booking
 * Returns a date string in YYYY-MM-DD format for the min attribute of date inputs
 *
 * If today + tour start time > now in tour's timezone, allow today
 * Otherwise, block today and return tomorrow
 */
export function getMinimumBookingDate(tourStartTime: string, countryCode: string): string {
  const timezone = getTimezoneForCountry(countryCode);
  const nowInTimezone = getCurrentDateInTimezone(timezone);

  // Parse the tour start time
  const { hours: tourHours, minutes: tourMinutes } = parseTimeToHoursMinutes(tourStartTime);

  // Create a date for today with the tour start time
  const todayWithTourTime = new Date(nowInTimezone);
  todayWithTourTime.setHours(tourHours, tourMinutes, 0, 0);

  // If the tour start time today has already passed, return tomorrow
  // Otherwise, return today
  if (nowInTimezone >= todayWithTourTime) {
    // Tour start time has passed today, so return tomorrow
    const tomorrow = new Date(nowInTimezone);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateToYYYYMMDD(tomorrow);
  }

  // Tour start time hasn't passed yet, so today is allowed
  return formatDateToYYYYMMDD(nowInTimezone);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate if a selected date is allowed for booking
 * Returns true if date is allowed, false otherwise
 */
export function isDateAllowedForBooking(
  selectedDate: string, // YYYY-MM-DD format
  tourStartTime: string,
  countryCode: string
): boolean {
  const minimumDate = getMinimumBookingDate(tourStartTime, countryCode);
  return selectedDate >= minimumDate;
}
