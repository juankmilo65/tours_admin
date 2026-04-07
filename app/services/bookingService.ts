/**
 * Client-side booking service
 * Handles multi-tour booking logic, NOT raw API calls
 */

import type { BookingTour } from '~/types/booking';
import { validateSameDayMargin } from '~/utilities/validationHelpers';

export interface MultiTourValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

/**
 * Validate multiple tours for booking compatibility
 * Checks: availability + same-day margin
 */
export const validateMultiTourBooking = async (
  tours: BookingTour[],
  getTourAvailability: (tourId: string, date: string) => Promise<{ canCreateBooking: boolean }>
): Promise<MultiTourValidationResult> => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // Check availability for each tour
  for (const tour of tours) {
    try {
      const availability = await getTourAvailability(tour.id, tour.startDate);
      if (!availability.canCreateBooking) {
        errors[tour.id] = `Tour not available on ${tour.startDate}`;
      }
    } catch {
      errors[tour.id] = 'Error checking availability';
    }
  }

  // If any tour has availability error, fail early
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, warnings };
  }

  // Check same-day margin for tours on same date
  const toursByDate = new Map<string, BookingTour[]>();
  for (const tour of tours) {
    if (!toursByDate.has(tour.startDate)) {
      toursByDate.set(tour.startDate, []);
    }
    const dateToursList = toursByDate.get(tour.startDate);
    if (dateToursList !== null && dateToursList !== undefined) {
      dateToursList.push(tour);
    }
  }

  for (const [, dateTours] of toursByDate) {
    if (dateTours.length > 1) {
      const marginCheck = validateSameDayMargin(dateTours);
      if (
        marginCheck.warning !== null &&
        marginCheck.warning !== undefined &&
        marginCheck.warning !== ''
      ) {
        warnings.push(marginCheck.warning);
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Calculate total booking price
 */
export const calculateBookingTotal = (tours: BookingTour[]): number => {
  return tours.reduce((sum, tour) => sum + (tour.price ?? 0), 0);
};

/**
 * Calculate deposit amount (typically 30% or configurable)
 */
export const calculateDepositAmount = (total: number, depositPercentage = 0.3): number => {
  return Math.round(total * depositPercentage * 100) / 100;
};
