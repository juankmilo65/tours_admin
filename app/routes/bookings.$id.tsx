/**
 * Booking Details Route - Single Booking Management
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import {
  fetchBookingByIdStart,
  fetchBookingByIdSuccess,
  fetchBookingByIdFailure,
  fetchPaymentsStart,
  fetchPaymentsSuccess,
  fetchPaymentsFailure,
  clearSelectedBooking,
} from '~/store/slices/bookingsSlice';
import { selectAuthToken } from '~/store/slices/authSlice';
import {
  getBookingByIdBusiness,
  getBookingPaymentsBusiness,
} from '~/server/businessLogic/bookingsBusinessLogic';
import { Card } from '~/components/ui/Card';
import type { Booking, Payment } from '~/types/booking';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function BookingDetails(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const { selectedBooking, payments, isLoading, error } = useAppSelector((state) => state.bookings);

  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'history'>('details');

  const loadBookingDetails = async () => {
    if (
      id === undefined ||
      id === null ||
      id === '' ||
      token === undefined ||
      token === null ||
      token === ''
    )
      return;

    try {
      dispatch(fetchBookingByIdStart());
      const bookingResponse = await getBookingByIdBusiness(id, token);

      if (bookingResponse !== null) {
        dispatch(fetchBookingByIdSuccess(bookingResponse));
      } else {
        dispatch(fetchBookingByIdFailure('Failed to load booking'));
      }
    } catch (err) {
      dispatch(
        fetchBookingByIdFailure(err instanceof Error ? err.message : 'Failed to load booking')
      );
    }
  };

  const loadPayments = async () => {
    if (
      id === undefined ||
      id === null ||
      id === '' ||
      token === undefined ||
      token === null ||
      token === ''
    )
      return;

    try {
      dispatch(fetchPaymentsStart());
      const paymentsResponse = await getBookingPaymentsBusiness(id, token);

      if (paymentsResponse.success === true && paymentsResponse.data !== undefined) {
        dispatch(fetchPaymentsSuccess(paymentsResponse.data));
      } else {
        dispatch(fetchPaymentsFailure('Failed to load payments'));
      }
    } catch (err) {
      dispatch(
        fetchPaymentsFailure(err instanceof Error ? err.message : 'Failed to load payments')
      );
    }
  };

  // Load booking details on mount
  useEffect(() => {
    if (
      id !== undefined &&
      id !== null &&
      id !== '' &&
      token !== undefined &&
      token !== null &&
      token !== ''
    ) {
      void loadBookingDetails();
    }

    return () => {
      dispatch(clearSelectedBooking());
    };
  }, [id, token]);

  // Load payments when tab changes to payments
  useEffect(() => {
    if (
      activeTab === 'payments' &&
      id !== undefined &&
      id !== null &&
      id !== '' &&
      token !== undefined &&
      token !== null &&
      token !== ''
    ) {
      void loadPayments();
    }
  }, [activeTab, id, token]);

  const booking = selectedBooking;

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">{isLoading ? 'Loading...' : 'Booking not found'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            navigate('/bookings');
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back to Bookings
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('details');
            }}
            className={`pb-4 border-b-2 font-medium ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => {
              setActiveTab('payments');
            }}
            className={`pb-4 border-b-2 font-medium ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
            }}
            className={`pb-4 border-b-2 font-medium ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Error message */}
      {error !== undefined && error !== null && error !== '' && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Tab Content */}
      {activeTab === 'details' && <DetailsTab booking={booking} />}
      {activeTab === 'payments' && <PaymentsTab payments={payments} />}
      {activeTab === 'history' && <HistoryTab booking={booking} />}
    </div>
  );
}

function DetailsTab({ booking }: { booking: Booking }): JSX.Element {
  return (
    <Card title="Booking Details">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Confirmation Code</p>
            <p className="font-semibold text-gray-900">{booking.confirmationCode ?? ''}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-semibold text-gray-900">{booking.status ?? ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-semibold text-gray-900">{booking.startDate ?? ''}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-semibold text-gray-900">{booking.endDate ?? ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Number of People</p>
            <p className="font-semibold text-gray-900">{booking.numberOfPeople ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Price</p>
            <p className="font-semibold text-gray-900">
              ${booking.totalPrice ?? 0} {booking.currency ?? ''}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">Customer Information</p>
          <div className="mt-1 space-y-1">
            <p className="text-gray-900">
              {booking.firstName1 ?? ''} {booking.lastName1 ?? ''}
            </p>
            {booking.firstName2 !== undefined &&
              booking.firstName2 !== null &&
              booking.firstName2 !== '' && (
                <p className="text-gray-900">
                  {booking.firstName2} {booking.lastName2 ?? ''}
                </p>
              )}
            <p className="text-gray-900">{booking.email ?? ''}</p>
            <p className="text-gray-900">{booking.phone ?? ''}</p>
          </div>
        </div>

        {booking.tour !== undefined && booking.tour !== null && (
          <div>
            <p className="text-sm text-gray-500">Tour</p>
            <p className="font-semibold text-gray-900">{booking.tour.title ?? ''}</p>
          </div>
        )}

        {booking.country !== undefined && booking.country !== null && (
          <div>
            <p className="text-sm text-gray-500">Country</p>
            <p className="font-semibold text-gray-900">{booking.country.name ?? ''}</p>
          </div>
        )}

        {booking.isDeleted === true && booking.isDeleted !== null && (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
            <p className="font-semibold">This booking has been cancelled</p>
            {booking.cancellationReason !== undefined && booking.cancellationReason !== null && (
              <p className="text-sm mt-1">Reason: {booking.cancellationReason}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PaymentsTab({ payments }: { payments: Payment[] }): JSX.Element {
  return (
    <Card title="Payments">
      {payments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No payments yet</div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">
                  ${payment.amount ?? 0} {payment.currency ?? ''}
                </p>
                <p className="text-sm text-gray-500">{payment.paymentMethod ?? ''}</p>
                {payment.transactionReference !== undefined &&
                  payment.transactionReference !== null && (
                    <p className="text-sm text-gray-500">Ref: {payment.transactionReference}</p>
                  )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{payment.status ?? ''}</p>
                {payment.paidAt !== undefined && payment.paidAt !== null && (
                  <p className="text-sm text-gray-500">{payment.paidAt}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function HistoryTab({ booking }: { booking: Booking }): JSX.Element {
  return (
    <Card title="Booking History">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Created</p>
            <p className="text-sm text-gray-500">{booking.createdAt ?? ''}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Last Updated</p>
            <p className="text-sm text-gray-500">{booking.updatedAt ?? ''}</p>
          </div>
        </div>
        {booking.deletedAt !== undefined && booking.deletedAt !== null && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Cancelled At</p>
              <p className="text-sm text-gray-500">{booking.deletedAt}</p>
            </div>
          </div>
        )}
        {booking.lastReminderSent !== undefined && booking.lastReminderSent !== null && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Last Reminder Sent</p>
              <p className="text-sm text-gray-500">{booking.lastReminderSent}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
