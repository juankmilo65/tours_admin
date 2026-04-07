/**
 * Dashboard Route - Main Admin Dashboard
 * Style inspired by TailwindAdmin React Dark
 */

import type { JSX, ReactNode, CSSProperties } from 'react';
import { useEffect, useCallback } from 'react';
import { Link } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
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
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';

interface DashboardTranslations {
  welcome: string;
  overview: string;
  totalBookings: string;
  paidBookings: string;
  pendingBookings: string;
  cancelledBookings: string;
  totalRevenue: string;
  recentBookings: string;
  viewAllBookings: string;
  noRecentBookings: string;
  createNewTour: string;
  createNewTourDesc: string;
  manageUsers: string;
  manageUsersDesc: string;
  viewReports: string;
  viewReportsDesc: string;
  manageBookings: string;
  manageBookingsDesc: string;
  goTo: string;
  earnings: string;
  bookingsOverview: string;
  quickActions: string;
  code: string;
  client: string;
  date: string;
  status: string;
}

const dashboardEs: DashboardTranslations = {
  welcome: 'Bienvenido de nuevo',
  overview: 'Aquí tienes el resumen de tu plataforma',
  totalBookings: 'Total Reservas',
  paidBookings: 'Pagadas',
  pendingBookings: 'Pendientes',
  cancelledBookings: 'Canceladas',
  totalRevenue: 'Ingresos Totales',
  recentBookings: 'Reservas Recientes',
  viewAllBookings: 'Ver todas',
  noRecentBookings: 'No hay reservas recientes',
  createNewTour: 'Crear Tour',
  createNewTourDesc: 'Agrega un nuevo tour a tu catálogo',
  manageUsers: 'Usuarios',
  manageUsersDesc: 'Gestiona cuentas de usuario',
  viewReports: 'Reportes',
  viewReportsDesc: 'Analíticas y métricas',
  manageBookings: 'Reservas',
  manageBookingsDesc: 'Gestiona todas las reservas',
  goTo: 'Ir a',
  earnings: 'Ganancias',
  bookingsOverview: 'Resumen de Reservas',
  quickActions: 'Acciones Rápidas',
  code: 'Código',
  client: 'Cliente',
  date: 'Fecha',
  status: 'Estado',
};

const dashboardEn: DashboardTranslations = {
  welcome: 'Welcome back',
  overview: "Here's your platform overview",
  totalBookings: 'Total Bookings',
  paidBookings: 'Paid',
  pendingBookings: 'Pending',
  cancelledBookings: 'Cancelled',
  totalRevenue: 'Total Revenue',
  recentBookings: 'Recent Bookings',
  viewAllBookings: 'View all',
  noRecentBookings: 'No recent bookings',
  createNewTour: 'Create Tour',
  createNewTourDesc: 'Add a new tour to your catalog',
  manageUsers: 'Users',
  manageUsersDesc: 'Manage user accounts',
  viewReports: 'Reports',
  viewReportsDesc: 'Analytics and metrics',
  manageBookings: 'Bookings',
  manageBookingsDesc: 'Manage all bookings',
  goTo: 'Go to',
  earnings: 'Earnings',
  bookingsOverview: 'Bookings Overview',
  quickActions: 'Quick Actions',
  code: 'Code',
  client: 'Client',
  date: 'Date',
  status: 'Status',
};

// Card wrapper component
function DashCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Dashboard(): JSX.Element {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const { bookings, stats } = useAppSelector((state) => state.bookings);
  const { language } = useTranslation();
  const t = language === 'en' ? dashboardEn : dashboardEs;
  const bookingsT = language === 'en' ? bookingEn : bookingEs;

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    pending: {
      bg: 'var(--color-warning-50)',
      text: 'var(--color-warning-700)',
      dot: 'var(--color-warning-500)',
    },
    partial: { bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
    paid: {
      bg: 'var(--color-success-50)',
      text: 'var(--color-success-700)',
      dot: 'var(--color-success-500)',
    },
    cancelled: {
      bg: 'var(--color-error-50)',
      text: 'var(--color-error-700)',
      dot: 'var(--color-error-500)',
    },
    urgent: {
      bg: 'var(--color-error-50)',
      text: 'var(--color-error-700)',
      dot: 'var(--color-error-500)',
    },
    requested: {
      bg: 'var(--color-secondary-50)',
      text: 'var(--color-secondary-700)',
      dot: 'var(--color-secondary-500)',
    },
    confirmed: {
      bg: 'var(--color-primary-50)',
      text: 'var(--color-primary-700)',
      dot: 'var(--color-primary-500)',
    },
    pending_payment: {
      bg: 'var(--color-warning-50)',
      text: 'var(--color-warning-700)',
      dot: 'var(--color-warning-500)',
    },
    partially_paid: { bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
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

  const loadDashboardData = useCallback(async () => {
    try {
      dispatch(fetchStatsStart());
      const statsResponse = await getBookingStatsBusiness(token ?? undefined);
      if (statsResponse.success === true && statsResponse.data !== undefined) {
        dispatch(fetchStatsSuccess(statsResponse.data));
      } else {
        const errorMsg =
          typeof statsResponse.error === 'string' ? statsResponse.error : 'Failed to load stats';
        dispatch(fetchStatsFailure(errorMsg));
      }
    } catch (err) {
      dispatch(fetchStatsFailure(err instanceof Error ? err.message : 'Failed to load stats'));
    }

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
  }, [dispatch, token]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const userName = currentUser?.firstName ?? '';
  const totalBookings = stats?.totalBookings ?? 0;
  const paidBookings = stats?.paidBookings ?? 0;
  const pendingBookings = stats?.pendingBookings ?? 0;
  const cancelledBookings = stats?.cancelledBookings ?? 0;
  const totalRevenue = stats?.totalRevenueUSD ?? 0;

  // Calculate percentages for the mini bar chart
  const maxBookings = Math.max(totalBookings, 1);
  const paidPct = Math.round((paidBookings / maxBookings) * 100);
  const pendingPct = Math.round((pendingBookings / maxBookings) * 100);
  const cancelledPct = Math.round((cancelledBookings / maxBookings) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Welcome Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-neutral-900)',
              margin: 0,
              lineHeight: 'var(--leading-tight)',
            }}
          >
            {t.welcome}
            {userName !== '' ? `, ${userName}` : ''} 👋
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-neutral-500)',
              margin: 'var(--space-1) 0 0 0',
            }}
          >
            {t.overview}
          </p>
        </div>
      </div>

      {/* Row 1: Revenue Card (wide) + Bookings Overview (side) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        {/* Revenue / Earnings Card */}
        <DashCard style={{ padding: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-1) 0',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t.totalRevenue}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  margin: 0,
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                $
                {totalRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-400)',
                  margin: 'var(--space-1) 0 0 0',
                }}
              >
                USD
              </p>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-xl)',
                background:
                  'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
              }}
            >
              💰
            </div>
          </div>

          {/* Mini earnings breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-1) 0',
                }}
              >
                {t.paidBookings}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-success-600)',
                  margin: 0,
                }}
              >
                {paidBookings}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-1) 0',
                }}
              >
                {t.pendingBookings}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-warning-600)',
                  margin: 0,
                }}
              >
                {pendingBookings}
              </p>
            </div>
          </div>
        </DashCard>

        {/* Bookings Overview Card */}
        <DashCard style={{ padding: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-1) 0',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t.bookingsOverview}
              </p>
              <p
                style={{
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  margin: 0,
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                {totalBookings.toLocaleString()}
              </p>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-xl)',
                background:
                  'linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-600))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
              }}
            >
              📊
            </div>
          </div>

          {/* Horizontal bar breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <BarStat
              label={t.paidBookings}
              value={paidBookings}
              pct={paidPct}
              color="var(--color-success-500)"
              bgColor="var(--color-success-50)"
            />
            <BarStat
              label={t.pendingBookings}
              value={pendingBookings}
              pct={pendingPct}
              color="var(--color-warning-500)"
              bgColor="var(--color-warning-50)"
            />
            <BarStat
              label={t.cancelledBookings}
              value={cancelledBookings}
              pct={cancelledPct}
              color="var(--color-error-500)"
              bgColor="var(--color-error-50)"
            />
          </div>
        </DashCard>
      </div>

      {/* Row 2: 4 small KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KpiMini
          icon="📋"
          label={t.totalBookings}
          value={totalBookings.toLocaleString()}
          accent="var(--color-primary-500)"
          accentBg="var(--color-primary-50)"
        />
        <KpiMini
          icon="✅"
          label={t.paidBookings}
          value={paidBookings.toLocaleString()}
          accent="var(--color-success-500)"
          accentBg="var(--color-success-50)"
        />
        <KpiMini
          icon="⏳"
          label={t.pendingBookings}
          value={pendingBookings.toLocaleString()}
          accent="var(--color-warning-500)"
          accentBg="var(--color-warning-50)"
        />
        <KpiMini
          icon="❌"
          label={t.cancelledBookings}
          value={cancelledBookings.toLocaleString()}
          accent="var(--color-error-500)"
          accentBg="var(--color-error-50)"
        />
      </div>

      {/* Row 3: Recent Bookings Table + Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 'var(--space-5)',
        }}
      >
        {/* Recent Bookings — Table style like TailwindAdmin */}
        <DashCard>
          <div
            style={{
              padding: 'var(--space-5) var(--space-6)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-neutral-900)',
                margin: 0,
              }}
            >
              {t.recentBookings}
            </h2>
            <Link
              to="/bookings"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-primary-600)',
                textDecoration: 'none',
                fontWeight: 'var(--font-weight-semibold)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-primary-200)',
                transition: 'all var(--transition-base)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {t.viewAllBookings} →
            </Link>
          </div>
          {bookings.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--color-neutral-400)',
                padding: 'var(--space-12) var(--space-6)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span
                style={{
                  fontSize: '40px',
                  display: 'block',
                  marginBottom: 'var(--space-3)',
                  opacity: 0.6,
                }}
              >
                📭
              </span>
              {t.noRecentBookings}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderTop: '1px solid var(--color-neutral-200)',
                      borderBottom: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    {[t.code, t.client, t.date, t.status].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'left',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-neutral-500)',
                          fontSize: 'var(--text-xs)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 5).map((booking) => {
                    const sStyle = statusStyles[booking.status] ?? {
                      bg: 'var(--color-warning-50)',
                      text: 'var(--color-warning-700)',
                      dot: 'var(--color-warning-500)',
                    };
                    return (
                      <tr
                        key={booking.id}
                        style={{
                          borderBottom: '1px solid var(--color-neutral-100)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td
                          style={{
                            padding: 'var(--space-3) var(--space-4)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-neutral-800)',
                          }}
                        >
                          {booking.confirmationCode}
                        </td>
                        <td
                          style={{
                            padding: 'var(--space-3) var(--space-4)',
                            color: 'var(--color-neutral-600)',
                          }}
                        >
                          {booking.firstName1} {booking.lastName1}
                        </td>
                        <td
                          style={{
                            padding: 'var(--space-3) var(--space-4)',
                            color: 'var(--color-neutral-500)',
                          }}
                        >
                          {booking.startDate}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                              padding: '2px var(--space-2)',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-weight-medium)',
                              backgroundColor: sStyle.bg,
                              color: sStyle.text,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: sStyle.dot,
                                display: 'inline-block',
                              }}
                            />
                            {statusLabels[booking.status] ?? booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashCard>

        {/* Quick Actions Sidebar */}
        <DashCard style={{ padding: 'var(--space-5)' }}>
          <h3
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-500)',
              margin: '0 0 var(--space-4) 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t.quickActions}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <QuickAction
              icon="🏛️"
              title={t.createNewTour}
              desc={t.createNewTourDesc}
              path="/tours"
              color="var(--color-primary-500)"
            />
            <QuickAction
              icon="📋"
              title={t.manageBookings}
              desc={t.manageBookingsDesc}
              path="/bookings"
              color="var(--color-secondary-500)"
            />
            <QuickAction
              icon="👥"
              title={t.manageUsers}
              desc={t.manageUsersDesc}
              path="/users"
              color="var(--color-warning-500)"
            />
            <QuickAction
              icon="📊"
              title={t.viewReports}
              desc={t.viewReportsDesc}
              path="/bookings"
              color="var(--color-success-500)"
            />
          </div>
        </DashCard>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function KpiMini({
  icon,
  label,
  value,
  accent,
  accentBg,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
  accentBg: string;
}): JSX.Element {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        transition: 'box-shadow var(--transition-base), transform var(--transition-base)',
        cursor: 'default',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
          border: `1px solid ${accent}22`,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-neutral-900)',
            margin: 0,
            lineHeight: 'var(--leading-tight)',
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-500)',
            margin: '2px 0 0 0',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function BarStat({
  label,
  value,
  pct,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  bgColor: string;
}): JSX.Element {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-1)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-600)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-neutral-800)',
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: bgColor,
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(pct, 2)}%`,
            backgroundColor: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  path,
  color,
}: {
  icon: string;
  title: string;
  desc: string;
  path: string;
  color: string;
}): JSX.Element {
  return (
    <Link
      to={path}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-lg)',
        transition: 'background-color var(--transition-base)',
        border: '1px solid transparent',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
        e.currentTarget.style.borderColor = 'var(--color-neutral-200)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <span
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-800)',
            margin: 0,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-500)',
            margin: '2px 0 0 0',
          }}
        >
          {desc}
        </p>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          color: 'var(--color-neutral-400)',
          fontSize: 'var(--text-sm)',
        }}
      >
        →
      </span>
    </Link>
  );
}
