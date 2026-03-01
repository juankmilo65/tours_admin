/**
 * Booking Statuses Business Logic
 * Handles business logic for booking statuses
 */

import { getBookingStatusesService } from '../bookingStatuses';
import type { BookingStatus, BookingStatusResponse } from '~/types/bookingStatus';

/**
 * Get all booking statuses
 */
export const getBookingStatusesBusiness = (
  token?: string,
  language = 'es'
): Promise<BookingStatusResponse> => {
  return getBookingStatusesService(token, language);
};

/**
 * Get booking statuses formatted for dropdown options
 */
export const getBookingStatusesDropdownBusiness = async (
  token?: string,
  language = 'es'
): Promise<{ success: boolean; data: Array<{ value: string; label: string }> | null }> => {
  const result = await getBookingStatusesService(token, language);

  if (!result.success || result.data === null) {
    return {
      success: false,
      data: null,
    };
  }

  const dropdownOptions = result.data.map((status: BookingStatus) => ({
    value: status.code,
    label: language === 'en' ? status.name_en : status.name_es,
  }));

  return {
    success: true,
    data: dropdownOptions,
  };
};
