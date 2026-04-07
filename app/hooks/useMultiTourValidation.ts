/**
 * useMultiTourValidation Hook
 * Validates multi-tour bookings with availability checks and margin warnings
 */

import { useState, useCallback } from 'react';
import type { BookingTour } from '~/types/booking';
import { validateSameDayMargin } from '~/utilities/validationHelpers';
import type { MultiTourValidationResult } from '~/services/bookingService';

export const useMultiTourValidation = (): {
  validationResult: MultiTourValidationResult;
  isValidating: boolean;
  validate: (
    tours: BookingTour[],
    getTourAvailability?: (tourId: string, date: string) => Promise<{ canCreateBooking: boolean }>
  ) => Promise<MultiTourValidationResult>;
  clearValidation: () => void;
} => {
  const [validationResult, setValidationResult] = useState<MultiTourValidationResult>({
    valid: true,
    errors: {},
    warnings: [],
  });
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(
    async (
      tours: BookingTour[],
      getTourAvailability?: (tourId: string, date: string) => Promise<{ canCreateBooking: boolean }>
    ): Promise<MultiTourValidationResult> => {
      setIsValidating(true);
      const errors: Record<string, string> = {};
      const warnings: string[] = [];

      // Check availability for each tour if function provided
      if (getTourAvailability) {
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
      }

      // Check same-day margin for tours on same date
      const toursByDate = new Map<string, BookingTour[]>();
      for (const tour of tours) {
        if (!toursByDate.has(tour.startDate)) {
          toursByDate.set(tour.startDate, []);
        }
        const dateToursList = toursByDate.get(tour.startDate);
        if (dateToursList !== undefined) {
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

      const result: MultiTourValidationResult = {
        valid: Object.keys(errors).length === 0,
        errors,
        warnings,
      };

      setValidationResult(result);
      setIsValidating(false);
      return result;
    },
    []
  );

  const clearValidation = useCallback(() => {
    setValidationResult({ valid: true, errors: {}, warnings: [] });
  }, []);

  return {
    validationResult,
    isValidating,
    validate,
    clearValidation,
  };
};
