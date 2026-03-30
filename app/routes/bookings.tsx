/**
 * Bookings Route - Bookings Management
 * Complete filtering, pagination, and responsive table
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { data } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { getSession, commitSession } from '~/utilities/sessions';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table, type Column } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';
import {
  getAllBookingsBusiness,
  getBookingByIdBusiness,
  resendPaymentLinkBusiness,
  type Booking,
} from '~/server/businessLogic/bookingsBusinessLogic';
import citiesBL from '~/server/businessLogic/citiesBusinessLogic';
import countriesBL from '~/server/businessLogic/countriesBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { getBookingStatusesDropdownBusiness } from '~/server/businessLogic/bookingStatusesBusinessLogic';
import { getToursDropdownBusiness } from '~/server/businessLogic/toursBusinessLogic';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useErrorModal } from '~/utilities/useErrorModal';
import { selectAuthToken } from '~/store/slices/authSlice';
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { selectCurrentUser } from '~/store/slices/authSlice';
import { CreateBookingModal } from '~/components/bookings/CreateBookingModal';
import { BookingClientsModal } from '~/components/bookings/BookingClientsModal';
import { EditBookingModal } from '~/components/bookings/EditBookingModal';
import { BookingStatusModal } from '~/components/bookings/BookingStatusModal';
import type { BookingClient } from '~/types/booking';
import type { City } from '~/server/cities';

interface TourOption {
  id: string;
  title_es: string;
  title_en: string;
}

// Types for loader data
interface LoaderData {
  countryId: string | null;
  cities: City[];
  users: Array<{ id: string; name: string; email: string }>;
  statuses: Array<{ value: string; label: string }>;
}

// Helper to extract data from loader response
function extractLoaderData(loaderData: unknown): LoaderData {
  const innerData =
    typeof loaderData === 'object' &&
    loaderData !== null &&
    'type' in loaderData &&
    (loaderData as { type?: string }).type === 'DataWithResponseInit'
      ? (loaderData as { data?: LoaderData }).data
      : loaderData;

  return {
    countryId: (innerData as { countryId?: string | null })?.countryId ?? null,
    cities: (innerData as { cities?: City[] })?.cities ?? [],
    users:
      (innerData as { users?: Array<{ id: string; name: string; email: string }> })?.users ?? [],
    statuses:
      (
        innerData as {
          statuses?: Array<{ value: string; label: string }>;
        }
      )?.statuses ?? [],
  };
}

// Loader function - runs on server
export async function loader(args: LoaderFunctionArgs): Promise<ReturnType<typeof data>> {
  await requireAuth(args);

  // Load session to get selected countryId
  const session = await getSession(args.request.headers.get('Cookie'));
  let selectedCountryId = session.get('selectedCountryId') as string | undefined;

  // If no countryId in session, get default (Mexico) from countries
  if (selectedCountryId === undefined || selectedCountryId === null || selectedCountryId === '') {
    const countriesFormData = new FormData();
    countriesFormData.append('action', 'getCountriesBusiness');
    countriesFormData.append('language', 'es');
    const countriesResult = await countriesBL(countriesFormData);

    interface CountryData {
      id: string;
      code: string;
      name_es?: string;
      name_en?: string;
    }

    const isCountriesResult = (
      result: unknown
    ): result is { success: boolean; data: CountryData[] | null } =>
      typeof result === 'object' && result !== null && 'success' in result && 'data' in result;

    if (
      isCountriesResult(countriesResult) &&
      countriesResult.success &&
      countriesResult.data &&
      countriesResult.data.length > 0
    ) {
      const countries = countriesResult.data;
      const mexicoCountry = countries.find(
        (c: CountryData) =>
          c.code === 'MX' ||
          c.name_es?.toLowerCase() === 'méxico' ||
          c.name_en?.toLowerCase() === 'mexico'
      );
      const defaultCountry = mexicoCountry ?? countries[0];

      if (defaultCountry !== undefined && defaultCountry !== null) {
        selectedCountryId = defaultCountry.id;
        session.set('selectedCountryId', defaultCountry.id);
        session.set('selectedCountryCode', defaultCountry.code);
      }
    }
  }

  // Fetch active cities based on selected country
  let activeCities: City[] = [];

  if (selectedCountryId !== undefined && selectedCountryId !== null && selectedCountryId !== '') {
    const citiesFormData = new FormData();
    citiesFormData.append('action', 'getCitiesBusiness');
    citiesFormData.append(
      'filters',
      JSON.stringify({ isActive: true, countryId: selectedCountryId })
    );
    citiesFormData.append('language', 'es');
    const citiesResult = await citiesBL(citiesFormData);

    const isCitiesResult = (result: unknown): result is { success: boolean; data: City[] | null } =>
      typeof result === 'object' && result !== null && 'success' in result && 'data' in result;

    activeCities =
      isCitiesResult(citiesResult) && citiesResult.success === true && citiesResult.data !== null
        ? citiesResult.data
        : [];
  }

  // Fetch users for dropdown (igual que tours)
  const authToken = session.get('authToken') as string | undefined;
  const authUser = session.get('authUser') as
    | { id: string; role: string; firstName?: string; lastName?: string; email?: string }
    | undefined;
  let users: Array<{ id: string; name: string; email: string }> = [];
  if (authToken !== undefined) {
    if (authUser?.role === 'admin') {
      const usersResult = await getUsersDropdownBusiness(['user'], 'true', authToken, 'es');
      users =
        usersResult.success === true && usersResult.data !== undefined
          ? usersResult.data.map((u) => ({
              id: u.id,
              name: u.firstName,
              email: u.email,
            }))
          : [];
    } else if (typeof authUser?.id === 'string' && authUser.id.trim() !== '') {
      const firstName = authUser.firstName ?? '';
      const lastName = authUser.lastName ?? '';
      const trimmedName = (firstName + ' ' + lastName).trim();
      const email = authUser.email ?? '';
      const fullName = trimmedName !== '' ? trimmedName : (email ?? 'Usuario');
      users = [{ id: authUser.id, name: fullName, email: email ?? 'usuario@ejemplo.com' }];
    }
  }

  // Fetch booking statuses for dropdown
  const statusesResult: { success: boolean; data: Array<{ value: string; label: string }> | null } =
    await getBookingStatusesDropdownBusiness(session.get('authToken') as string | undefined, 'es');
  const statuses =
    statusesResult.success === true && statusesResult.data !== null ? statusesResult.data : [];

  return data(
    {
      countryId: selectedCountryId,
      cities: activeCities,
      users,
      statuses,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function Bookings(): JSX.Element {
  const rawLoaderData = useLoaderData<typeof loader>();
  const loaderData = extractLoaderData(rawLoaderData);
  const { t, language } = useTranslation();

  // Use component-specific translations
  const bookingsT = language === 'en' ? bookingEn : bookingEs;

  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken) ?? undefined;
  const currentUser = useAppSelector(selectCurrentUser);
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const countryId = selectedCountry?.id ?? loaderData.countryId ?? null;

  const isAdmin = currentUser?.role === 'admin';

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [tourIdFilter, setTourIdFilter] = useState('');
  const [confirmationCodeFilter, setConfirmationCodeFilter] = useState('');
  const [cityIdFilter, setCityIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  // Filter state management - track when filters are changed but not yet applied
  const [filtersChanged, setFiltersChanged] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statuses, setStatuses] = useState<Array<{ value: string; label: string }>>(
    loaderData.statuses
  );
  const [tours, setTours] = useState<TourOption[]>([]);

  const { showError } = useErrorModal();

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Clients modal state
  const [clientsModal, setClientsModal] = useState<{
    isOpen: boolean;
    clients: BookingClient[];
    confirmationCode: string;
  }>({ isOpen: false, clients: [], confirmationCode: '' });

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    readOnly?: boolean;
  }>({
    isOpen: false,
    booking: null,
  });

  // Status modal state
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; booking: Booking | null }>({
    isOpen: false,
    booking: null,
  });

  // Resend payment link state
  const [resendModal, setResendModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    bookingId: string | null;
    error: string | null;
  }>({
    isOpen: false,
    isLoading: false,
    bookingId: null,
    error: null,
  });

  const handleResendPaymentLink = async (bookingId: string): Promise<void> => {
    setResendModal({ isOpen: false, isLoading: true, bookingId, error: null });
    const result = await resendPaymentLinkBusiness(bookingId, token ?? '', language);
    if (result.success) {
      setResendModal({ isOpen: true, isLoading: false, bookingId, error: null });
    } else {
      setResendModal({
        isOpen: true,
        isLoading: false,
        bookingId,
        error: result.error ?? bookingsT.paymentLinkSentError,
      });
    }
  };

  // Refresh bookings function
  const refreshBookings = async (pageOverride?: number) => {
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Cargando...' }));

    try {
      const result = await getAllBookingsBusiness({
        page: pageOverride ?? page,
        limit,
        user_id: userFilter, // Use user filter
        tour_id: tourIdFilter,
        booking_date: bookingDateFilter,
        start_date: startDateFilter,
        end_date: endDateFilter,
        status: statusFilter,
        confirmation_code: confirmationCodeFilter,
        country: countryId ?? '', // Use country from session/header
        city_id: cityIdFilter,
        token,
        language,
        currency: 'MXN',
      });

      if (result.success === true && result.data !== undefined) {
        setBookings(result.data ?? []);
        setPagination(
          result.pagination ?? {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }
        );
      } else {
        setBookings([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        showError({ messageKey: 'common.loadError' });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      showError({ messageKey: 'common.loadError' });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Fetch bookings on page change only (filters are applied manually via Apply button)
  useEffect(() => {
    if (hasSearched) {
      void refreshBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Auto-select current user as provider for non-admin
  useEffect(() => {
    if (!isAdmin && currentUser?.id !== undefined && userFilter !== currentUser.id) {
      setUserFilter(currentUser.id);
      setHasSearched(true);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, currentUser]);

  // Auto-load bookings when country changes (not filters)
  useEffect(() => {
    // Skip if non-admin user hasn't been auto-selected yet
    if (!isAdmin && (currentUser?.id === undefined || userFilter !== currentUser.id)) {
      return;
    }

    if (countryId !== undefined && countryId !== null && countryId !== '') {
      setHasSearched(true);
      void refreshBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId, isAdmin, currentUser, userFilter]);

  // Reload statuses when language changes
  useEffect(() => {
    void getBookingStatusesDropdownBusiness(token, language).then(
      (result: { success: boolean; data: Array<{ value: string; label: string }> | null }) => {
        if (result.success === true && result.data !== null) {
          setStatuses(result.data);
        }
      }
    );
  }, [language, token]);

  // Load tours dropdown
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const result = await getToursDropdownBusiness(
          countryId ?? null,
          language,
          userFilter ?? null
        );
        if (
          typeof result === 'object' &&
          result !== null &&
          'success' in result &&
          result.success === true &&
          'data' in result &&
          result.data !== undefined &&
          result.data !== null &&
          Array.isArray(result.data)
        ) {
          setTours(result.data);
        }
      } catch (error) {
        console.error('Error fetching tours dropdown:', error);
      }
    };
    void fetchTours();
  }, [countryId, language, userFilter]);

  // Auto-select current user as provider for non-admin
  useEffect(() => {
    if (!isAdmin && currentUser?.id !== undefined && userFilter !== currentUser.id) {
      setUserFilter(currentUser.id);
      setHasSearched(true);
      setPage(1);
      void refreshBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, currentUser]);

  const handleEditBooking = async (bookingId: string, readOnly = false) => {
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Cargando...' }));
    try {
      const result = await getBookingByIdBusiness(bookingId, token ?? '', language);
      if (result.success === true && result.data !== undefined) {
        setEditModal({ isOpen: true, booking: result.data, readOnly });
      } else {
        showError({ messageKey: 'common.loadError', fallback: result.error });
      }
    } catch {
      showError({ messageKey: 'common.loadError' });
    } finally {
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handler to apply filters and search
  const handleApplyFilters = async () => {
    setHasSearched(true);
    setFiltersChanged(false);
    setPage(1);
    // Pass pageOverride=1 explicitly: setPage(1) is async so
    // refreshBookings() would otherwise read the stale page value.
    await refreshBookings(1);
  };

  // Wrapper functions to mark filters as changed when modified
  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v);
    setFiltersChanged(true);
  };

  const handleTourIdFilterChange = (v: string) => {
    setTourIdFilter(v);
    setFiltersChanged(true);
  };

  const handleConfirmationCodeFilterChange = (value: string) => {
    setConfirmationCodeFilter(value);
    setFiltersChanged(true);
  };

  const handleCityIdFilterChange = (v: string) => {
    setCityIdFilter(v);
    setFiltersChanged(true);
  };

  const handleStartDateFilterChange = (value: string) => {
    setStartDateFilter(value);
    setFiltersChanged(true);
  };

  const handleEndDateFilterChange = (value: string) => {
    setEndDateFilter(value);
    setFiltersChanged(true);
  };

  const handleBookingDateFilterChange = (value: string) => {
    setBookingDateFilter(value);
    setFiltersChanged(true);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setUserFilter('');
    setTourIdFilter('');
    setConfirmationCodeFilter('');
    setCityIdFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setBookingDateFilter('');
    setPage(1);
    setFiltersChanged(false);
    setHasSearched(false);
  };

  // Table columns
  const columns: Column<Booking>[] = [
    {
      key: 'tourTitle',
      label: bookingsT.tourInfo,
      render: (value: unknown, record: Booking) => {
        const title = (value as string | undefined) ?? bookingsT.notSpecified;
        const code = record.confirmationCode ?? '';
        const statusValue = record.status ?? '';
        const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
          pending: { bg: '#fef9c3', text: '#a16207', dot: '#eab308' },
          partial: { bg: '#ffedd5', text: '#c2410c', dot: '#f97316' },
          paid: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
          cancelled: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
          urgent: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
          requested: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
          confirmed: { bg: '#e0e7ff', text: '#4338ca', dot: '#6366f1' },
          pending_payment: { bg: '#fef9c3', text: '#a16207', dot: '#eab308' },
          partially_paid: { bg: '#ffedd5', text: '#c2410c', dot: '#f97316' },
          pending_confirmation: { bg: '#fef9c3', text: '#a16207', dot: '#eab308' },
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
          pending_confirmation: bookingsT.pending_confirmation,
        };
        const colors = statusColors[statusValue] ?? {
          bg: '#f3f4f6',
          text: '#374151',
          dot: '#9ca3af',
        };
        const labelText = statusLabels[statusValue] ?? statusValue;
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--gap-6)',
            }}
          >
            <div
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', maxWidth: 200 }}
              title={title}
            >
              {title}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                fontSize: '0.7rem',
                color: '#6b7280',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.5 }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {code}
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: colors.bg,
                color: colors.text,
                width: 'fit-content',
              }}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.dot }}
              />
              {labelText}
            </span>
          </div>
        );
      },
    },
    {
      key: 'user',
      label: bookingsT.customer,
      render: (value: unknown, record: Booking) => {
        const user = value as Booking['user'];
        const fullName =
          user?.fullName ??
          (user?.firstName !== undefined ? `${user.firstName} ${user.lastName}` : undefined) ??
          bookingsT.notSpecified;
        const email = user?.email;
        const count = record.numberOfPeople ?? 0;
        return (
          <div>
            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{fullName}</div>
            {email !== undefined && <div className="text-xs text-gray-500">{email}</div>}
            <div
              style={{
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#6b7280',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
              {bookingsT.companions}
            </div>
          </div>
        );
      },
    },
    {
      key: 'startDate',
      label: bookingsT.tourDate,
      render: (value: unknown, record: Booking) => {
        const startStr = value as string;
        const endStr = record.endDate;
        const dateOpts: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        const locale = language === 'en' ? 'en-US' : 'es-ES';
        const startFormatted = new Date(startStr).toLocaleDateString(locale, dateOpts);
        const endFormatted = new Date(endStr).toLocaleDateString(locale, dateOpts);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 110 }}>
            <div>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                }}
              >
                {bookingsT.tourStart}
              </div>
              <div
                style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}
              >
                {startFormatted}
              </div>
            </div>
            <div style={{ marginTop: '2px' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#b0b5be',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                }}
              >
                {bookingsT.tourEnd}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  color: '#9ca3af',
                  lineHeight: 1.3,
                }}
              >
                {endFormatted}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'bookingDate',
      label: bookingsT.bookingDate,
      render: (value: unknown) => {
        const dateValue = value as string;
        const locale = language === 'en' ? 'en-US' : 'es-ES';
        return (
          <div style={{ fontSize: '0.8rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
            {new Date(dateValue).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: t('common.actions') ?? 'Acciones',
      render: (_value: unknown, row: Booking) => {
        const tourIsFuture =
          row.startDate !== undefined &&
          row.startDate !== null &&
          new Date(row.startDate) > new Date();

        // Si es rol user, solo mostrar botón cancelar (si el tour aún no pasó)
        if (currentUser?.role === 'user') {
          if (!tourIsFuture) return null;
          return (
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid #fca5a5',
                background: '#fff1f2',
                color: '#dc2626',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .18s ease',
                lineHeight: 1,
              }}
              title={bookingsT.cancelBooking}
              onClick={() => {
                showError({
                  messageKey: 'common.error',
                  fallback:
                    language === 'en' ? 'Cancel booking (user)' : 'Cancelar reserva (usuario)',
                });
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          );
        }
        // Si es admin, mostrar editar y modal de estados
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Edit (solo 'requested') o Ver (resto de estados) */}
            {row.status === 'requested' ? (
              <button
                type="button"
                onClick={() => void handleEditBooking(row.id, false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-lg, 10px)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-neutral-100, #f3f4f6)',
                  color: 'var(--color-neutral-600, #4b5563)',
                  transition: 'all .18s ease',
                  lineHeight: 1,
                }}
                title={language === 'en' ? 'Edit' : 'Editar'}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-200, #e5e7eb)';
                  e.currentTarget.style.color = 'var(--color-neutral-800, #1f2937)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100, #f3f4f6)';
                  e.currentTarget.style.color = 'var(--color-neutral-600, #4b5563)';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleEditBooking(row.id, true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-lg, 10px)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  transition: 'all .18s ease',
                  lineHeight: 1,
                }}
                title={language === 'en' ? 'View' : 'Ver'}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dbeafe';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
            {/* Status history */}
            <button
              type="button"
              onClick={() => setStatusModal({ isOpen: true, booking: row })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-lg, 10px)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'var(--color-success-50, #f0fdf4)',
                color: 'var(--color-success-500, #22c55e)',
                transition: 'all .18s ease',
                lineHeight: 1,
              }}
              title={language === 'en' ? 'Status' : 'Estado'}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-success-100, #dcfce7)';
                e.currentTarget.style.color = 'var(--color-success-600, #16a34a)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-success-50, #f0fdf4)';
                e.currentTarget.style.color = 'var(--color-success-500, #22c55e)';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </button>
            {/* Resend payment link — only for pending_payment */}
            {row.status === 'pending_payment' && (
              <button
                type="button"
                disabled={resendModal.isLoading && resendModal.bookingId === row.id}
                onClick={() => void handleResendPaymentLink(row.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-lg, 10px)',
                  border: 'none',
                  cursor:
                    resendModal.isLoading && resendModal.bookingId === row.id ? 'wait' : 'pointer',
                  backgroundColor: '#fff7ed',
                  color: '#ea580c',
                  transition: 'all .18s ease',
                  lineHeight: 1,
                  opacity: resendModal.isLoading && resendModal.bookingId === row.id ? 0.6 : 1,
                }}
                title={bookingsT.resendPaymentLink}
                onMouseOver={(e) => {
                  if (!(resendModal.isLoading && resendModal.bookingId === row.id)) {
                    e.currentTarget.style.backgroundColor = '#ffedd5';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff7ed';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gap-6)',
      }}
    >
      <Card title={bookingsT.allBookings}>
        {/* Filters Section */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--gap-4)',
          }}
        >
          {/* Filters Changed Warning */}
          {filtersChanged && hasSearched && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-warning-50)',
                border: '1px solid var(--color-warning-200)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-warning-700)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span>
                {t('tours.filtersChangedMessage') ||
                  'Los filtros han cambiado. Presiona "Filtrar" para aplicar los nuevos criterios de búsqueda.'}
              </span>
            </div>
          )}

          {/* Row 1: User, City, Status, Confirmation Code */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.allUsers}
              </label>
              {isAdmin ? (
                <Select
                  options={[
                    { value: '', label: bookingsT.allUsers },
                    ...loaderData.users.map((u) => ({
                      value: u.id,
                      label: u.name,
                    })),
                  ]}
                  value={userFilter}
                  onChange={(v) => {
                    setUserFilter(v);
                    setCityIdFilter('');
                    setTourIdFilter('');
                    setFiltersChanged(true);
                  }}
                  placeholder={bookingsT.allUsers}
                  id="select-provider"
                />
              ) : (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-neutral-100)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-neutral-700)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {currentUser?.firstName} {currentUser?.lastName}
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {t('tours.city')}
              </label>
              <Select
                options={[{ value: '', label: bookingsT.allCities }].concat(
                  loaderData.cities.map((c) => ({
                    value: c.id,
                    label: c.name_es ?? c.name_en ?? c.id,
                  }))
                )}
                value={cityIdFilter}
                onChange={handleCityIdFilterChange}
                placeholder={bookingsT.allCities}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.status}
              </label>
              <Select
                options={[{ value: '', label: bookingsT.allStatus }].concat(statuses)}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                placeholder={bookingsT.allStatus}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.confirmationCode}
              </label>
              <Input
                type="text"
                placeholder={bookingsT.confirmationCode}
                value={confirmationCodeFilter}
                onChange={(e) => handleConfirmationCodeFilterChange(e.target.value)}
                style={{ height: '40px' }}
              />
            </div>
          </div>

          {/* Row 2: Start Date, End Date, Booking Date, Tour ID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.startDate}
              </label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => handleStartDateFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  color: '#111827',
                  height: '40px',
                }}
                className="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.endDate}
              </label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => handleEndDateFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  color: '#111827',
                  height: '40px',
                }}
                className="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.bookingDate}
              </label>
              <input
                type="date"
                value={bookingDateFilter}
                onChange={(e) => handleBookingDateFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  color: '#111827',
                  height: '40px',
                }}
                className="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {bookingsT.tour}
              </label>
              <Select
                options={[
                  { value: '', label: language === 'en' ? 'All Tours' : 'Todos los Tours' },
                  ...tours.map((tour) => ({
                    value: tour.id,
                    label: language === 'en' ? tour.title_en : tour.title_es,
                  })),
                ]}
                value={tourIdFilter}
                onChange={handleTourIdFilterChange}
                placeholder={language === 'en' ? 'All Tours' : 'Todos los Tours'}
              />
            </div>
          </div>

          {/* Row 3: Actions */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={handleClearFilters}>
              {t('common.clearFilters') ?? 'Limpiar Filtros'}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void handleApplyFilters();
              }}
            >
              {t('common.filter') ?? 'Filtrar'}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateModalOpen(true);
              }}
            >
              {bookingsT.newBooking}
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-lg font-medium">{bookingsT.noBookingsFound}</p>
            <p className="text-sm">{bookingsT.noBookingsDescription}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={bookings} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('pagination.showing')} {(page - 1) * limit + 1} {t('pagination.to')}{' '}
              {Math.min(page * limit, pagination.total)} {t('pagination.of')} {pagination.total}{' '}
              {t('pagination.results')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('pagination.previous')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                  .map((p, index, arr) => {
                    const prev = arr[index - 1];
                    const showEllipsis = prev !== undefined && prev + 1 !== p;

                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
        onSuccess={() => {
          void refreshBookings();
        }}
      />

      <BookingClientsModal
        isOpen={clientsModal.isOpen}
        clients={clientsModal.clients}
        confirmationCode={clientsModal.confirmationCode}
        onClose={() => setClientsModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <EditBookingModal
        isOpen={editModal.isOpen}
        booking={editModal.booking}
        readOnly={editModal.readOnly ?? false}
        onClose={() => setEditModal({ isOpen: false, booking: null })}
        onSuccess={() => {
          void refreshBookings();
        }}
      />

      <BookingStatusModal
        isOpen={statusModal.isOpen}
        booking={statusModal.booking}
        onClose={() => setStatusModal({ isOpen: false, booking: null })}
        onSuccess={() => {
          void refreshBookings();
        }}
      />

      {/* Resend payment link result modal */}
      {(resendModal.isOpen || resendModal.isLoading) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '32px 36px',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
          >
            {resendModal.isLoading ? (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: '#fff7ed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{
                      animation: 'spin 0.9s linear infinite',
                    }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 8,
                  }}
                >
                  {bookingsT.resendPaymentLink}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {language === 'en' ? 'Sending...' : 'Enviando...'}
                </p>
              </>
            ) : resendModal.error === null ? (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 8,
                  }}
                >
                  {bookingsT.paymentLinkSentTitle}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 24 }}>
                  {bookingsT.paymentLinkSentMessage}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setResendModal({
                      isOpen: false,
                      isLoading: false,
                      bookingId: null,
                      error: null,
                    })
                  }
                  style={{
                    padding: '10px 28px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {language === 'en' ? 'Close' : 'Cerrar'}
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 8,
                  }}
                >
                  {bookingsT.paymentLinkSentError}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 24 }}>
                  {resendModal.error}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setResendModal({
                      isOpen: false,
                      isLoading: false,
                      bookingId: null,
                      error: null,
                    })
                  }
                  style={{
                    padding: '10px 28px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {language === 'en' ? 'Close' : 'Cerrar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
