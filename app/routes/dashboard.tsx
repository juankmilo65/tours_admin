/**
 * Dashboard Route - Main Admin Dashboard
 * Style inspired by TailwindAdmin React Dark
 */

import type { JSX, ReactNode, CSSProperties } from 'react';
import { useEffect } from 'react';
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
  selectBookingsIsLoading,
} from '~/store/slices/bookingsSlice';
import {
  fetchStripePaymentsStart,
  fetchStripePaymentsSuccess,
  fetchStripePaymentsFailure,
} from '~/store/slices/stripePaymentsSlice';
import {
  getBookingStatsBusiness,
  getAllBookingsBusiness,
} from '~/server/businessLogic/bookingsBusinessLogic';
import { getStripePaymentsBreakdownBusiness } from '~/server/businessLogic/stripePaymentsBusinessLogic';
import {
  selectStripePaymentsSummary,
  selectStripePaymentsBreakdown,
  selectStripePaymentsLoading,
} from '~/store/slices/stripePaymentsSlice';
import { useTranslation } from '~/lib/i18n/utils';

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
function Spinner(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 0, 0, 0.08)',
          borderTopColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
    </div>
  );
}

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

/* ─── Sub-components ─── */
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

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Dashboard(): JSX.Element {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const { stats } = useAppSelector((state) => state.bookings);
  const stripeSummary = useAppSelector(selectStripePaymentsSummary);
  const stripeBreakdown = useAppSelector(selectStripePaymentsBreakdown);
  const bookingsLoading = useAppSelector(selectBookingsIsLoading);
  const stripeLoading = useAppSelector(selectStripePaymentsLoading);
  const { language } = useTranslation();
  const t = language === 'en' ? dashboardEn : dashboardEs;

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    pending: {
      bg: 'var(--color-warning-50)',
      text: 'var(--color-warning-700)',
      dot: 'var(--color-warning-500)',
    },
    distributed: {
      bg: 'var(--color-success-50)',
      text: 'var(--color-success-700)',
      dot: 'var(--color-success-500)',
    },
    failed: {
      bg: 'var(--color-error-50)',
      text: 'var(--color-error-700)',
      dot: 'var(--color-error-500)',
    },
  };

  useEffect(() => {
    const loadDashboardData = async (): Promise<void> => {
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

      // Load Stripe payments breakdown
      try {
        dispatch(fetchStripePaymentsStart());
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const fromDate = firstDayOfMonth.toISOString().split('T')[0] ?? '';
        const toDate = lastDayOfMonth.toISOString().split('T')[0] ?? '';

        const stripeResponse = await getStripePaymentsBreakdownBusiness(
          {
            from: fromDate,
            to: toDate,
            commissionStatus: 'distributed',
          },
          token ?? undefined,
          'es'
        );

        if (stripeResponse.success === true && stripeResponse.data !== undefined) {
          dispatch(fetchStripePaymentsSuccess(stripeResponse.data));
        } else {
          const errorMsg =
            typeof stripeResponse.error === 'string'
              ? stripeResponse.error
              : 'Failed to load Stripe payments';
          dispatch(fetchStripePaymentsFailure(errorMsg));
        }
      } catch (err) {
        dispatch(
          fetchStripePaymentsFailure(
            err instanceof Error ? err.message : 'Failed to load Stripe payments'
          )
        );
      }
    };

    void loadDashboardData();
  }, [dispatch, token]);

  const userName = currentUser?.firstName ?? '';
  const totalBookings = stats?.totalBookings ?? 0;
  const paidBookings = stats?.paidBookings ?? 0;
  const pendingBookings = stats?.pendingBookings ?? 0;
  const cancelledBookings = stats?.cancelledBookings ?? 0;

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

      {/* Row 1: Stripe Summary Cards */}
      {stripeLoading ? (
        <DashCard style={{ padding: 'var(--space-6)' }}>
          <Spinner />
        </DashCard>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              currentUser?.role?.toLowerCase() === 'admin'
                ? 'repeat(auto-fit, minmax(280px, 1fr))'
                : '1fr',
            gap: 'var(--space-5)',
          }}
        >
          {/* Ingresos Totales Card - Admin version */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <DashCard style={{ padding: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
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
                    Ingresos Totales
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
                    MXN {(stripeSummary?.totalReceived ?? 0).toFixed(2)}
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
                  💳
                </div>
              </div>
            </DashCard>
          )}

          {/* Ingresos Totales Card - Owner version */}
          {currentUser?.role?.toLowerCase() !== 'admin' && (
            <DashCard style={{ padding: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
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
                    Ingresos Totales
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
                    MXN {(stripeSummary?.totalEarnings ?? 0).toFixed(2)}
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
            </DashCard>
          )}

          {/* Monto Distribuido Card - Admin only */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <DashCard style={{ padding: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
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
                    Monto Distribuido
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
                    MXN {(stripeSummary?.totalTransferredToOwners ?? 0).toFixed(2)}
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
                  📤
                </div>
              </div>
            </DashCard>
          )}

          {/* Ingresos Plataforma Card - Admin only */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <DashCard style={{ padding: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
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
                    Ingresos Plataforma
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--text-4xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color:
                        (stripeSummary?.platformEarnings ?? 0) >= 0
                          ? 'var(--color-success-600)'
                          : 'var(--color-error-600)',
                      margin: 0,
                      lineHeight: 'var(--leading-tight)',
                    }}
                  >
                    MXN {(stripeSummary?.platformEarnings ?? 0).toFixed(2)}
                  </p>
                </div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-xl)',
                    background:
                      (stripeSummary?.platformEarnings ?? 0) >= 0
                        ? 'linear-gradient(135deg, var(--color-success-500), var(--color-success-600))'
                        : 'linear-gradient(135deg, var(--color-error-500), var(--color-error-600))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    boxShadow:
                      (stripeSummary?.platformEarnings ?? 0) >= 0
                        ? '0 4px 14px rgba(34, 197, 94, 0.3)'
                        : '0 4px 14px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {(stripeSummary?.platformEarnings ?? 0) >= 0 ? '💰' : '📉'}
                </div>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {/* Row 2: Resumen de Reservas Card */}
      {bookingsLoading ? (
        <DashCard style={{ padding: 'var(--space-6)' }}>
          <Spinner />
        </DashCard>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-5)',
          }}
        >
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
                    'linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
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
      )}

      {/* Row 3: Stripe Payments Breakdown Table */}
      {stripeLoading ? (
        <DashCard style={{ padding: 'var(--space-6)' }}>
          <Spinner />
        </DashCard>
      ) : (
        <div>
          {/* Stripe Payments Table */}
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
                💳 Desglose de Pagos Stripe
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
                Ver todas las Reservas →
              </Link>
            </div>
            {!stripeBreakdown || stripeBreakdown.length === 0 ? (
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
                  💳
                </span>
                No hay pagos disponibles
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
                      {['Código', 'Tour', 'Monto', 'Transferido', 'Ganancia Neta', 'Estado'].map(
                        (header) => (
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
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {stripeBreakdown.slice(0, 5).map((payment) => {
                      const paymentStatus =
                        statusStyles[payment.commissionStatus] ?? statusStyles['pending'];
                      return (
                        <tr
                          key={payment.paymentId ?? 'unknown'}
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
                            {payment.confirmationCode}
                          </td>
                          <td
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              color: 'var(--color-neutral-600)',
                            }}
                          >
                            {payment.tours[0] ?? 'N/A'}
                          </td>
                          <td
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              color: 'var(--color-neutral-500)',
                              fontWeight: 'var(--font-weight-semibold)',
                            }}
                          >
                            {payment.currency} {(payment.amount ?? 0).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              color: 'var(--color-neutral-500)',
                              fontWeight: 'var(--font-weight-semibold)',
                            }}
                          >
                            {payment.currency} {(payment.transferredToOwners ?? 0).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              fontWeight: 'var(--font-weight-semibold)',
                              color:
                                (payment.netPlatformEarning ?? 0) >= 0
                                  ? 'var(--color-success-700)'
                                  : 'var(--color-error-700)',
                            }}
                          >
                            {payment.currency} {(payment.netPlatformEarning ?? 0).toFixed(2)}
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
                                backgroundColor: paymentStatus.bg,
                                color: paymentStatus.text,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: paymentStatus.dot,
                                  display: 'inline-block',
                                }}
                              />
                              {payment.commissionStatus}
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
        </div>
      )}
    </div>
  );
}
