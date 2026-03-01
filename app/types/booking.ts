/**
 * Booking Types
 * Types for bookings and payments management
 */

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  offerId?: string;
  startDate: string; // UTC
  endDate: string; // UTC
  numberOfPeople: number;
  totalPrice: number;
  currency: string;
  usdPrice?: number;
  usdExchangeRate?: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled' | 'urgent';
  confirmationCode: string;
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
  country?: Country;
  payments?: Payment[];
}

export interface Tour {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  basePrice?: number;
  currency?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
  [key: string]: string | number;
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
