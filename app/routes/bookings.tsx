/**
 * Bookings Route - Bookings Management
 * Complete filtering, pagination, and responsive table
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { data } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { getSession, commitSession } from '~/utilities/sessions';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table, type Column } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';
import { getAllBookingsBusiness, type Booking } from '~/server/businessLogic/bookingsBusinessLogic';
import citiesBL from '~/server/businessLogic/citiesBusinessLogic';
import countriesBL from '~/server/businessLogic/countriesBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { getBookingStatusesDropdownBusiness } from '~/server/businessLogic/bookingStatusesBusinessLogic';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useErrorModal } from '~/utilities/useErrorModal';
import { selectAuthToken } from '~/store/slices/authSlice';
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import { CreateBookingModal } from '~/components/bookings/CreateBookingModal';
import type { City } from '~/server/cities';

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

  // Fetch users for dropdown
  const usersResult = await getUsersDropdownBusiness(
    session.get('authToken') as string | undefined,
    'es'
  );
  const users =
    usersResult.success === true && usersResult.data !== undefined ? usersResult.data : [];

  // Fetch booking statuses for dropdown
  const statusesResult = await getBookingStatusesDropdownBusiness(
    session.get('authToken') as string | undefined,
    'es'
  );
  const statuses =
    statusesResult.success === true && statusesResult.data !== undefined ? statusesResult.data : [];

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
  const navigate = useNavigate();

  // Use component-specific translations
  const bookingsT = language === 'en' ? bookingEn : bookingEs;

  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken) ?? undefined;
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const countryId = selectedCountry?.id ?? loaderData.countryId ?? null;

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [tourIdFilter, setTourIdFilter] = useState('');
  const [confirmationCodeFilter, setConfirmationCodeFilter] = useState('');
  const [cityIdFilter, setCityIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [bookingDateFilter, setBookingDateFilter] = useState('');

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

  const { showError } = useErrorModal();

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Refresh bookings function
  const refreshBookings = async () => {
    dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') ?? 'Cargando...' }));

    try {
      const result = await getAllBookingsBusiness({
        page,
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

  // Fetch bookings on filter changes
  useEffect(() => {
    void refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    statusFilter,
    userFilter,
    tourIdFilter,
    confirmationCodeFilter,
    countryId,
    cityIdFilter,
    startDateFilter,
    endDateFilter,
    bookingDateFilter,
    limit,
    language,
    dispatch,
    t,
    token,
  ]);

  // Reload statuses when language changes
  useEffect(() => {
    void getBookingStatusesDropdownBusiness(token, language).then((result) => {
      if (result.success === true && result.data !== undefined && result.data !== null) {
        setStatuses(result.data);
      }
    });
  }, [language, token]);

  const handleViewBooking = (booking: Booking) => {
    navigate(`/bookings/${booking.id}`);
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
  };

  // Table columns
  const columns: Column<Booking>[] = [
    {
      key: 'confirmationCode',
      label: bookingsT.confirmationCode,
      render: (value: unknown) => {
        const code = value as string;
        return (
          <div className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
            {code}
          </div>
        );
      },
    },
    {
      key: 'tourTitle',
      label: bookingsT.tour,
      render: (value: unknown, record: Booking) => {
        const title = (value as string | undefined) ?? record.tour?.title ?? bookingsT.notSpecified;
        return (
          <div className="text-sm text-gray-900 font-medium max-w-[180px] truncate" title={title}>
            {title}
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
          (record.firstName1 !== undefined
            ? `${record.firstName1} ${record.lastName1 ?? ''}`
            : bookingsT.notSpecified);
        const email = user?.email;
        return (
          <div>
            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{fullName}</div>
            {email !== undefined && <div className="text-xs text-gray-500">{email}</div>}
          </div>
        );
      },
    },
    {
      key: 'clients',
      label: bookingsT.numberOfPeople,
      render: (value: unknown, record: Booking) => {
        const clients = value as Booking['clients'];
        const count = clients?.length ?? record.numberOfPeople ?? 0;
        return (
          <div className="text-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              {count}
            </span>
          </div>
        );
      },
    },
    {
      key: 'startDate',
      label: bookingsT.startDate,
      render: (value: unknown) => {
        const dateValue = value as string;
        return (
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {new Date(dateValue).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      key: 'endDate',
      label: bookingsT.endDate,
      render: (value: unknown) => {
        const dateValue = value as string;
        return (
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {new Date(dateValue).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      key: 'bookingDate',
      label: bookingsT.bookingDate,
      render: (value: unknown, record: Booking) => {
        const dateValue = (value as string | undefined) ?? record.createdAt;
        return (
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {new Date(dateValue).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: bookingsT.status,
      render: (value: unknown) => {
        const statusValue = value as string;
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700',
          partial: 'bg-orange-100 text-orange-700',
          paid: 'bg-green-100 text-green-700',
          cancelled: 'bg-red-100 text-red-700',
          urgent: 'bg-red-100 text-red-700',
          requested: 'bg-blue-100 text-blue-700',
        };
        const statusLabels: Record<string, string> = {
          pending: bookingsT.pending,
          partial: bookingsT.partial,
          paid: bookingsT.paid,
          cancelled: bookingsT.cancelled,
          urgent: bookingsT.urgent,
          requested: bookingsT.requested ?? 'Solicitada',
        };
        const colorClass = statusColors[statusValue] ?? 'bg-gray-100 text-gray-700';
        const labelText = statusLabels[statusValue] ?? statusValue;
        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${colorClass}`}
          >
            {labelText}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: t('common.actions') ?? 'Acciones',
      render: (_value: unknown, row: Booking) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => handleViewBooking(row)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
            }}
            title={bookingsT.viewDetails}
          >
            <svg
              style={{ width: '16px', height: '16px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={bookingsT.allBookings}>
        {/* Filters Section */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
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
                {t('users.user')}
              </label>
              <Select
                options={[{ value: '', label: bookingsT.allUsers }].concat(
                  loaderData.users.map((u) => ({
                    value: u.id,
                    label: u.name,
                  }))
                )}
                value={userFilter}
                onChange={(v: string) => {
                  setUserFilter(v);
                  setPage(1);
                }}
                placeholder={bookingsT.allUsers}
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
                onChange={(v: string) => {
                  setCityIdFilter(v);
                  setPage(1);
                }}
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
                onChange={(v: string) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setConfirmationCodeFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setBookingDateFilter(e.target.value);
                  setPage(1);
                }}
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
                ID del Tour
              </label>
              <Input
                type="text"
                placeholder="ID del Tour"
                value={tourIdFilter}
                onChange={(e) => {
                  setTourIdFilter(e.target.value);
                  setPage(1);
                }}
                style={{ height: '40px' }}
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
    </div>
  );
}
