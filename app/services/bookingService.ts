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

export interface StripeChargeBreakdown {
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  feeAmount: number;
  totalAmount: number;
}

/**
 * Breaks an online charge into net + IVA + Stripe fee. The fee is grossed up over
 * (net + IVA) so that amount arrives intact after Stripe's cut. Informational on the
 * front; the backend is the source of truth and reconciles the fee with the real
 * balance_transaction. See PROMPT_BACKEND_STRIPE_FEE.md.
 */
export const computeStripeChargeBreakdown = (
  net: number,
  taxRate: number,
  feeRate: number,
  fixedFee = 3
): StripeChargeBreakdown => {
  const round2 = (value: number): number => Math.round(value * 100) / 100;
  const netAmount = round2(net);
  const taxAmount = round2(netAmount * taxRate);
  const base = netAmount + taxAmount;
  // No fee (and no fixed component) when there is no online processing rate.
  const totalAmount = feeRate > 0 && feeRate < 1 ? round2((base + fixedFee) / (1 - feeRate)) : base;
  const feeAmount = round2(totalAmount - base);
  return { netAmount, taxAmount, taxRate, feeAmount, totalAmount };
};

/**
 * Maps the selected payment method (+ card origin) to the Stripe MX processing rate.
 * Official rates (backend-aligned): domestic card 3.6%, international card 6.1%
 * (3.6% + 0.5% + 2% conversion, treated flat), OXXO 4.0% — all with a $3 fixed fee.
 */
export const stripeFeeRate = (method: string, cardType: 'local' | 'foreign'): number => {
  if (method === 'oxxo') return 0.04;
  if (method === 'card') return cardType === 'foreign' ? 0.061 : 0.036;
  return 0;
};
