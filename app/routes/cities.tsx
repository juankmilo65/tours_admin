/**
 * Cities Route - Cities Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect, useRef } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import { getCities } from '~/server/cities';
import type { City, CitiesResponse } from '~/server/cities';
import type { Column } from '~/components/ui/Table';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectSelectedCountryId } from '~/store/slices/countriesSlice';
import { selectCities } from '~/store/slices/citiesSlice';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Cities(): JSX.Element {
  const { t } = useTranslation();

  // Get cities from Redux (loaded by root.tsx loader)
  const reduxCities = useAppSelector(selectCities);
  const [cities, setCities] = useState<City[]>(reduxCities as City[]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const isInitialMount = useRef(true);

  // Get selected country from Redux (managed by Header)
  const selectedCountryId = useAppSelector(selectSelectedCountryId);
  const dispatch = useAppDispatch();

  // Sync Redux cities to local state when they change (from root.tsx loader)
  useEffect(() => {
    setCities(reduxCities as City[]);
    // Update pagination total based on Redux cities
    setPagination((prev) => ({
      ...prev,
      total: reduxCities.length,
      totalPages: Math.ceil(reduxCities.length / limit),
    }));
  }, [reduxCities, limit]);

  // Fetch cities when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount - use Redux cities from loader
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't fetch if there's no selected country
    if (selectedCountryId === null || selectedCountryId === undefined || selectedCountryId === '') {
      setCities([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      return;
    }

    const fetchCities = async () => {
      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = (await getCities({
          page,
          limit,
          countryId: selectedCountryId ?? undefined,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language: 'es',
        })) as CitiesResponse;

        if (result.success === true && result.data !== undefined) {
          setCities(result.data);
          setPagination(result.pagination);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        setCities([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        // Hide global loader when fetching ends
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchCities();
  }, [page, statusFilter, limit, selectedCountryId, dispatch, t]);

  // Filter cities by search term
  const filteredCities = cities.filter((city) => {
    const searchLower = searchTerm.toLowerCase();
    const nameLower = city.name_es.toLowerCase();
    const descLower = city.description_es.toLowerCase();
    return nameLower.includes(searchLower) || descLower.includes(searchLower);
  });

  const columns: Column<City>[] = [
    {
      key: 'imageUrl',
      label: t('cities.image'),
      render: (value: unknown, row: City) => (
        <div className="flex-shrink-0">
          <img
            src={value as string}
            alt={row.name_es}
            className="w-16 h-16 rounded-xl object-cover shadow-md hover:shadow-lg transition-shadow duration-200"
            loading="lazy"
          />
        </div>
      ),
    },
    {
      key: 'name_es',
      label: t('cities.city'),
      render: (value: unknown, row: City) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">{value as string}</div>
          <div className="text-sm text-gray-500 font-mono mt-0.5">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'description_es',
      label: t('cities.description'),
      render: (value: unknown) => (
        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">{value as string}</div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'isActive',
      label: t('cities.status'),
      render: (value: unknown) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            (value as boolean)
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
              : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              (value as boolean) ? 'bg-green-600' : 'bg-red-600'
            }`}
          />
          {(value as boolean) ? t('cities.active') : t('cities.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('cities.created'),
      render: (value: unknown) => (
        <div className="text-sm text-gray-600">
          {new Date(value as string).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'id',
      label: t('cities.actions'),
      render: () => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 group"
            title="Edit City"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 group"
            title="Delete City"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            type="button"
            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 transition-all duration-200 group"
            title="View Details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="space-y-6">
      <Card
        title={t('cities.allCities')}
        actions={<Button variant="primary">{t('cities.addNewCity')}</Button>}
      >
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="search"
              placeholder={t('cities.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-40">
            <Select
              options={[
                { value: '', label: t('cities.allStatus') },
                { value: 'true', label: t('cities.active') },
                { value: 'false', label: t('cities.inactive') },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder="All Status"
              className="w-full"
            />
          </div>
        </div>

        {/* Table */}
        {cities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-lg font-medium">{t('cities.noCitiesFound')}</p>
            <p className="text-sm">{t('cities.noCitiesDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredCities} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('cities.showing')} <span className="font-medium">{(page - 1) * limit + 1}</span>{' '}
              {t('cities.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
              {t('cities.of')} <span className="font-medium">{pagination.total}</span>{' '}
              {t('cities.results')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                }}
              >
                {t('cities.previous')}
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
                          onClick={() => {
                            setPage(p);
                          }}
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
                onClick={() => {
                  setPage((p) => Math.min(pagination.totalPages, p + 1));
                }}
              >
                {t('cities.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
