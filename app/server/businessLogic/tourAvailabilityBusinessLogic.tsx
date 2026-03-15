import type { TourAvailabilityResult } from '~/types/tourAvailability';
import { getTourAvailability } from '~/server/tourAvailability';

/**
 * Business logic for checking tour availability
 * @param tourId - Tour ID
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @param token - Authentication token
 * @returns Tour availability information
 */
export async function getTourAvailabilityBusiness(
  tourId: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<TourAvailabilityResult> {
  // Validate required fields
  if (!tourId || !startDate || !endDate) {
    return {
      success: false,
      message: 'Tour ID, start date, and end date are required',
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return {
      success: false,
      message: 'Invalid date format. Use YYYY-MM-DD',
    };
  }

  // Validate that startDate is before or equal to endDate
  if (startDate > endDate) {
    return {
      success: false,
      message: 'startDate must be before or equal to endDate',
    };
  }

  try {
    // Call the API to get tour availability
    const result = await getTourAvailability(tourId, startDate, endDate, token);
    return result;
  } catch (error) {
    console.error('Error getting tour availability:', error);
    return {
      success: false,
      message: 'Failed to get tour availability',
    };
  }
}
