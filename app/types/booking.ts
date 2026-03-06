/**
 * Booking Types
 * Types for bookings and payments management
 */

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  offerId?: string;
  tourTitle?: string;
  startDate: string; // UTC
  endDate: string; // UTC
  bookingDate?: string; // UTC
  numberOfPeople: number;
  totalPrice: number | string;
  currency: string;
  totalPriceConverted?: number;
  convertedCurrency?: string;
  usdPrice?: number;
  usdExchangeRate?: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled' | 'urgent' | 'requested' | string;
  statusId?: string;
  confirmationCode: string;
  specialRequests?: string;
  firstName1?: string;
  firstName2?: string;
  lastName1?: string;
  lastName2?: string;
  email?: string;
  phone?: string;
  countryId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  cancellationReason?: string;
  lastReminderSent?: string;
  createdAt: string;
  updatedAt: string;
  tour?: Tour;
  user?: User;
  offer?: unknown;
  country?: Country;
  payments?: Payment[];
  clients?: BookingClient[];
}

export interface Tour {
  id: string;
  title: string;
  title_es?: string;
  title_en?: string;
  description?: string;
  duration?: number;
  basePrice?: number | string;
  currency?: string;
  city?: {
    id: string;
    name_es?: string;
    name_en?: string;
    country?: {
      id: string;
      name_es?: string;
      name_en?: string;
      isoCode?: string;
    };
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
}

export interface BookingClient {
  id?: string;
  clientName: string;
  clientAge: number;
  countryId?: string;
  countryCode?: string;
  identificationTypeId?: string;
  clientId?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  usdAmount?: number;
  usdExchangeRate?: number;
  status: string;
  paymentType?: 'deposit' | 'balance' | 'full';
  paymentMethod: 'paypal' | 'credit_card' | 'cash' | 'oxxo' | 'bank_transfer' | 'credit_card_td';
  transactionId: string;
  transactionReference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  countryId?: string;
  cityId?: string;
  startDate?: string;
  endDate?: string;
  hasPendingPayment?: boolean;
  ownerUserId?: string;
  isDeleted?: boolean;
}

export interface BookingStats {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenueUSD: number;
  revenueTrend: string;
}

export interface BookingResponse {
  success: boolean;
  data?: Booking;
  message?: string;
  error?: string;
}

export interface BookingsResponse {
  success: boolean;
  data?: Booking[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: Payment;
  message?: string;
  error?: string;
}

export interface PaymentsResponse {
  success: boolean;
  data?: Payment[];
  message?: string;
  error?: string;
}

export interface BookingStatsResponse {
  success: boolean;
  data?: BookingStats;
  message?: string;
  error?: string;
}

export interface CreateBookingDto {
  tourId: string;
  startDate: string;
  endDate: string;
  clients: Client[];
  currency: string;
}

export interface Client {
  clientName: string;
  clientAge: number;
  countryId?: string;
  countryCode?: string;
  identificationTypeId?: string;
  clientId?: string;
}

export interface UpdateBookingDto {
  startDate?: string;
  endDate?: string;
  numberOfPeople?: number;
  status?: string;
  firstName1?: string;
  firstName2?: string;
  lastName1?: string;
  lastName2?: string;
  email?: string;
  phone?: string;
  countryId?: string;
}

export interface CreatePaymentDto {
  bookingId: string;
  amount: number;
  currency: string;
  paymentType?: 'deposit' | 'balance' | 'full';
  paymentMethod: 'paypal' | 'credit_card' | 'cash' | 'oxxo' | 'bank_transfer' | 'credit_card_td';
  transactionId: string;
  transactionReference?: string;
  notes?: string;
}
