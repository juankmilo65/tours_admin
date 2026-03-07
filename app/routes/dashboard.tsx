/**
 * Dashboard Route - Main Admin Dashboard
 */

import type { JSX } from 'react';
import { useEffect } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken } from '~/store/slices/authSlice';
import {
  fetchBookingsStart,
  fetchBookingsSuccess,
  fetchStatsStart,
  fetchStatsSuccess,
  fetchStatsFailure,
} from '~/store/slices/bookingsSlice';
import {
  getBookingStatsBusiness,
  getAllBookingsBusiness,
} from '~/server/businessLogic/bookingsBusinessLogic';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Dashboard(): JSX.Element {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const { bookings, stats } = useAppSelector((state) => state.bookings);
  const { language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    urgent: 'bg-red-100 text-red-800',
    requested: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-indigo-100 text-indigo-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
    partially_paid: 'bg-orange-100 text-orange-800',
  };
  const statusLabels: Record<string, string> = {
    pending: bookingsT.pending,
    partial: bookingsT.partial,
    paid: bookingsT.paid,
    cancelled: bookingsT.cancelled,
    urgent: bookingsT.urgent,
    requested: bookingsT.requested,
    confirmed: bookingsT.confirmed,
    pending_payment: bookingsT.pendingPayment,
    partially_paid: bookingsT.partiallyPaid,
  };

  const loadDashboardData = async () => {
    // Load stats
    try {
      dispatch(fetchStatsStart());
      const statsResponse = await getBookingStatsBusiness(token ?? undefined);

      if (statsResponse.success === true && statsResponse.data !== undefined) {
        dispatch(fetchStatsSuccess(statsResponse.data));
      } else {
        dispatch(fetchStatsFailure(statsResponse.error ?? 'Failed to load stats'));
      }
    } catch (err) {
      dispatch(fetchStatsFailure(err instanceof Error ? err.message : 'Failed to load stats'));
    }

    // Load recent bookings
    try {
      dispatch(fetchBookingsStart());
      const bookingsResponse = await getAllBookingsBusiness({
        page: 1,
        limit: 5,
        user_id: '',
        tour_id: '',
        booking_date: '',
        start_date: '',
        end_date: '',
        status: '',
        confirmation_code: '',
        country: '',
        city_id: '',
        token: token ?? undefined,
        language: 'es',
        currency: 'MXN',
      });

      if (bookingsResponse.success === true && bookingsResponse.data !== undefined) {
        dispatch(
          fetchBookingsSuccess({
            bookings: bookingsResponse.data,
            pagination: bookingsResponse.pagination ?? {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            },
          })
        );
      }
    } catch {
      // Silently fail for recent bookings
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Active Reservations" value="127" change="+12%" positive />
        <KPICard title="Completed Payments" value="$45,230" change="+8%" positive />
        <KPICard title="Popular Tours" value="23" change="-2%" />
        <KPICard title="Total Users" value="1,847" change="+15%" positive />
      </div>

      {/* Booking KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Bookings"
          value={stats?.totalBookings?.toString() ?? '0'}
          change="+5%"
          positive
        />
        <KPICard
          title="Paid Bookings"
          value={stats?.paidBookings?.toString() ?? '0'}
          change="+8%"
          positive
        />
        <KPICard
          title="Pending Bookings"
          value={stats?.pendingBookings?.toString() ?? '0'}
          change="-3%"
        />
        <KPICard
          title="Total Revenue"
          value={`$${stats?.totalRevenueUSD?.toFixed(2) ?? '0.00'} USD`}
          change="+12%"
          positive
        />
      </div>

      {/* Recent Activity */}
      <Card title="Recent Bookings">
        <div className="space-y-4">
          {bookings.slice(0, 5).map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{booking.confirmationCode}</p>
                <p className="text-sm text-gray-500">
                  {booking.firstName1} {booking.lastName1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{booking.startDate}</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    statusColors[booking.status] ?? 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {statusLabels[booking.status] ?? booking.status}
                </span>
              </div>
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="text-center text-gray-500 py-8">No recent bookings</div>
          )}
        </div>
        <div className="mt-4">
          <Button variant="secondary" className="w-full">
            View All Bookings
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Create New Tour"
          description="Add a new tour to your catalog"
          icon="🏛️"
        />
        <QuickActionCard
          title="Manage Users"
          description="View and manage user accounts"
          icon="👥"
        />
        <QuickActionCard
          title="View Reports"
          description="See analytics and performance metrics"
          icon="📊"
        />
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  positive = false,
}: {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
}): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
        <span className="text-sm text-gray-500">from last month</span>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <Button variant="secondary" className="w-full">
        Go to {title}
      </Button>
    </div>
  );
}
