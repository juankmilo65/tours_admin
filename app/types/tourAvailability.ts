export interface TourAvailabilityData {
  tourId: string;
  title_es: string;
  title_en: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  confirmedSlots: number;
  totalReservedSlots: number;
  availableSlots: number;
  totalAvailableSlots: number;
  canCreateBooking: boolean;
  availabilityPercentage: string;
  bookingsDetails: {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
  };
}

export interface TourAvailabilityResult {
  success: boolean;
  data?: TourAvailabilityData;
  message?: string;
}
