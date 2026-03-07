/**
 * Booking Status Types
 */

export interface BookingStatus {
  id: string;
  code: string;
  name: string;
  name_es: string;
  name_en: string;
}

export interface BookingStatusResponse {
  success: boolean;
  data: BookingStatus[] | null;
  error?: string;
  message?: string;
}

/** Shape returned by GET /api/booking-statuses/:code/next */
export interface NextBookingStatus {
  currentStatus: string;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  nextStatusCode: string;
  nextStatusName: {
    es: string;
    en: string;
  };
  flow: string[];
}
