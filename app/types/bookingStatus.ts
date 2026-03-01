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
