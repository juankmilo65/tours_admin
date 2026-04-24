/**
 * Validation Helpers
 * Multi-tour validation utilities
 */

import type { BookingTour } from '~/types/booking';

/**
 * Parse time string to total minutes since midnight.
 * Supports both "HH:MM" (24h) and "HH:MM AM/PM" (12h) formats.
 */
export const parseTime = (time: string): number => {
  const trimmed = time.trim().toUpperCase();
  const isPM = trimmed.endsWith('PM');
  const isAM = trimmed.endsWith('AM');

  // Strip AM/PM suffix
  const cleaned = trimmed.replace(/\s*(AM|PM)$/i, '').trim();
  const parts = cleaned.split(':').map(Number);
  let hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

/**
 * Validate same-day margin between tours
 * Returns warning if margin < 60 minutes (non-blocking)
 */
export const validateSameDayMargin = (
  tours: BookingTour[]
): { valid: boolean; warning?: string } => {
  const sortedTours = [...tours].sort((a, b) => {
    const aStart = parseTime(a.startTime);
    const bStart = parseTime(b.startTime);
    return aStart - bStart;
  });

  for (let i = 0; i < sortedTours.length - 1; i++) {
    const current = sortedTours[i];
    const next = sortedTours[i + 1];
    if (current === undefined || next === undefined) continue;

    const currentEnd = parseTime(current.endTime);
    const nextStart = parseTime(next.startTime);
    const marginMinutes = nextStart - currentEnd;

    if (marginMinutes < 60) {
      return {
        valid: true, // Non-blocking, just a warning
        warning: `Very tight schedule between tours: ${marginMinutes}min margin`,
      };
    }
  }

  return { valid: true };
};

/**
 * Check if a new tour overlaps in time with existing tours on the same date.
 * Returns an error string if overlap is found, null otherwise.
 */
export const checkTimeOverlap = (
  newTour: BookingTour,
  existingTours: BookingTour[]
): string | null => {
  const sameDateTours = existingTours.filter((t) => t.startDate === newTour.startDate);
  if (sameDateTours.length === 0) return null;

  const newStart = parseTime(newTour.startTime);
  const newEnd = parseTime(newTour.endTime);

  for (const existing of sameDateTours) {
    const existingStart = parseTime(existing.startTime);
    const existingEnd = parseTime(existing.endTime);

    // Overlap: new starts before existing ends AND new ends after existing starts
    if (newStart < existingEnd && newEnd > existingStart) {
      const name = newTour.name_es || newTour.name_en;
      const existingName = existing.name_es || existing.name_en;
      return `"${name}" (${newTour.startTime}–${newTour.endTime}) se sobrepone con "${existingName}" (${existing.startTime}–${existing.endTime}) el ${newTour.startDate}`;
    }
  }

  return null;
};

/**
 * Check if a new tour is in a different city than existing tours on the same date.
 * Returns a warning string if different city, null otherwise.
 */
export const checkDifferentCitySameDay = (
  newTour: BookingTour,
  existingTours: BookingTour[]
): string | null => {
  if (newTour.cityId === undefined || newTour.cityId === '') return null;

  const sameDateTours = existingTours.filter(
    (t) => t.startDate === newTour.startDate && t.cityId !== undefined && t.cityId !== ''
  );
  if (sameDateTours.length === 0) return null;

  for (const existing of sameDateTours) {
    if (existing.cityId !== newTour.cityId) {
      const newCity = newTour.cityName ?? newTour.cityId;
      const existingCity = existing.cityName ?? existing.cityId;
      return `"${newTour.name_es || newTour.name_en}" está en ${newCity} pero "${existing.name_es || existing.name_en}" está en ${existingCity} el mismo día (${newTour.startDate})`;
    }
  }

  return null;
};

/**
 * Sort tours chronologically by date, then by start time
 */
export const sortToursChronologically = (tours: BookingTour[]): BookingTour[] => {
  const parseDateToNumber = (dateStr: string): number => {
    const [yearRaw, monthRaw, dayRaw] = dateStr.trim().split('-');
    const year = Number.parseInt(yearRaw ?? '0', 10) || 0;
    const month = Number.parseInt(monthRaw ?? '1', 10) || 1;
    const day = Number.parseInt(dayRaw ?? '1', 10) || 1;
    return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  };

  return [...tours].sort((a, b) => {
    const aDate = parseDateToNumber(a.startDate);
    const bDate = parseDateToNumber(b.startDate);
    if (aDate !== bDate) return aDate - bDate;

    const timeCompare = parseTime(a.startTime) - parseTime(b.startTime);
    if (timeCompare !== 0) return timeCompare;

    // Stable tie-breaker for identical date/time tours
    return a.id.localeCompare(b.id);
  });
};

/**
 * Calculate hours until a given date/time from now
 */
export const calculateHoursUntil = (targetDate: string, targetTime: string): number => {
  const parts = targetTime.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const target = new Date(targetDate);
  target.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  return diffMs / (1000 * 60 * 60);
};

/**
 * Check if booking is within the cancellation/edit restriction window
 */
export const isWithinRestrictionWindow = (
  firstTourDate: string,
  firstTourTime: string,
  hoursThreshold = 48
): boolean => {
  const hoursUntil = calculateHoursUntil(firstTourDate, firstTourTime);
  return hoursUntil <= hoursThreshold;
};
