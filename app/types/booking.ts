/**
 * Booking Types
 * Types for bookings and payments management
 */

export interface BookingTour {
  id: string;
  name_es: string;
  name_en: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM (backend provides timezone-adjusted)
  endTime: string; // HH:MM
  price: number;
  currency: string;
  capacity: number;
  bookedSlots: number;
  cityId?: string;
  cityName?: string;
  description_es?: string;
  description_en?: string;
  minimumPayment?: number;
}

export interface Booking {
  id: string;
  userId?: string; // No longer at booking level - now in clients
  tourId: string;
  offerId?: string;
  tourTitle?: string;
  startDate: string; // UTC
  endDate: string; // UTC
  bookingDate?: string; // UTC
  numberOfPeople: number;
  totalPrice: number | string;
  minimumPayment?: number | string;
  remainingAfterDeposit?: number | string;
  paidAmountTotal?: number | string;
  remainingAmountTotal?: number | string;
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
  countryCode?: string; // ISO code like 'MX', 'US', 'CO'
  source?: string; // e.g., 'admin', 'web', 'mobile'
  paymentMethods?: string[]; // e.g., ['card', 'oxxo', 'paypal']
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  cancellationReason?: string;
  lastReminderSent?: string;
  createdAt: string;
  updatedAt: string;
  tour?: Tour;
  tours?: BookingTour[]; // Multi-tour support
  user?: User;
  offer?: unknown;
  country?: Country;
  payments?: Payment[];
  clients?: BookingClient[];
  // Split payment fields
  depositAmount?: number | string;
  depositPaid?: boolean;
  depositPaidAt?: string;
  finalPaymentAmount?: number;
  finalPaymentPaid?: boolean;
  finalPaymentPaidAt?: string;
  paymentIntentId?: string;
  // Cancellation
  cancellationRequestedAt?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
  cancellationPolicyId?: string;
}

export interface BookingTourActivity {
  id: string;
  activityId: string;
  activity_es: string;
  activity_en: string;
  hora: string;
  sortOrder: number;
  day?: number;
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
  hourRange?: string;
  daysCount?: number;
  city?: {
    id: string;
    name_es?: string;
    name_en?: string;
    countryId?: string;
    country?: {
      id: string;
      name_es?: string;
      name_en?: string;
      isoCode?: string;
    };
  };
  activities?: BookingTourActivity[];
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
  clientId?: string | null;
  email?: string | null; // NEW - client email
  userId?: string | null; // NEW - linked for primary client
  isPrimary?: boolean;
  user?: User; // User object if linked
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

export interface CreateBookingItemDto {
  tourId: string;
  startAt: string; // UTC ISO 8601 (Z)
  endAt: string; // UTC ISO 8601 (Z)
  qty: number;
  unitPrice: number;
  lineTotal: number;
  unitMinimumPayment: number;
  lineMinimumPayment: number;
}

export interface CreateBookingTotalsDto {
  subtotal: number;
  minimumPayment: number;
  tax: number;
  total: number;
}

// Online charge breakdown: net + IVA + gross-up Stripe fee (the customer covers
// the fee). The backend recomputes net/IVA and trusts only feeAmount; totalAmount
// must reconcile with net + IVA + feeAmount (±0.02) or the backend returns 422.
export interface FeeBreakdown {
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  feeAmount: number;
  totalAmount: number;
}

export interface CreateBookingPayloadDto {
  countryCode: string;
  currency: string;
  startAt: string; // UTC ISO 8601 (Z)
  endAt: string; // UTC ISO 8601 (Z)
  specialRequests?: string;
  paymentMethods?: string[]; // e.g., ['card'], ['oxxo']
  clients: Array<{
    clientName: string;
    clientAge: number;
    email?: string;
    identificationTypeId: string;
    clientId?: string;
    userId?: string;
    isPrimary: boolean;
  }>;
  items: CreateBookingItemDto[];
  totals: CreateBookingTotalsDto;
  // Online charge breakdown (deposit) — see FeeBreakdown.
  feeBreakdown: FeeBreakdown;
}

export interface CreateBookingDto {
  booking: CreateBookingPayloadDto;
}

export interface Client {
  clientName: string;
  clientAge: number;
  identificationTypeId: string; // required
  clientId?: string | null;
  countryCode?: string | null;
  email?: string | null; // renamed from clientEmail to match API
  userId?: string | null; // NEW - for admin users or linking to user account
  isPrimary: boolean; // required, exactly one must be true
}

export interface UpdateBookingDto {
  startDate?: string | null;
  endDate?: string | null;
  numberOfPeople?: number;
  status?: string;
  statusCode?: string | null; // e.g., "paid", "cancelled"
  firstName1?: string;
  firstName2?: string;
  lastName1?: string;
  lastName2?: string;
  email?: string;
  phone?: string;
  countryId?: string;
  specialRequests?: string | null;
  clients?: Client[];
  totalPrice?: number | null;
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

export interface BookingStatusHistoryEntry {
  step: number;
  statusCode: string;
  statusName: string;
  statusName_es: string;
  statusName_en: string;
  amount: number | null;
  currency: string;
  changeReason?: string;
  notes?: string;
  changedBy?: string | null;
  changedAt: string;
}

export interface BookingStatusHistory {
  bookingId: string;
  confirmationCode: string;
  currentStatus: string;
  totalChanges: number;
  history: BookingStatusHistoryEntry[];
}
