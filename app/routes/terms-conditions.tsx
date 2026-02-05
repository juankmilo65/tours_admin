/**
 * Terms and Conditions Route - Tour Terms Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect, useRef } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import {
  getMyTourTerms,
  createTourTerms,
  type TourTerm,
  type CreateTourTermDto,
} from '~/server/tourTerms';
import type { Column } from '~/components/ui/Table';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Textarea } from '~/components/ui/Textarea';
import { Dialog } from '~/components/ui/Dialog';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';
import { getToursDropdown } from '~/server/tours';
import type { Tour } from '~/types/PayloadTourDataProps';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function TermsConditions(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Local state for tour terms and pagination
  const [tourTerms, setTourTerms] = useState<TourTerm[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState<CreateTourTermDto>({
    tourId: '',
    terms_conditions_es: '',
    terms_conditions_en: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const isInitialMount = useRef(true);
  const dispatch = useAppDispatch();

  // Fetch tours (for dropdown)
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const result = (await getToursDropdown(null, language)) as {
          success?: boolean;
          data?: Tour[];
        };

        if (result.success === true && result.data !== undefined) {
          setTours(result.data);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      }
    };

    void fetchTours();
  }, [language]);

  // Fetch tour terms when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount
    if (isInitialMount.current === true) {
      isInitialMount.current = false;
      return;
    }

    const fetchTourTerms = async () => {
      if (token === null || token === '') return;

      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = await getMyTourTerms(
          {
            page,
            limit,
            language,
          },
          token
        );

        if (result.success === true && result.data !== undefined) {
          setTourTerms(result.data);
          setPagination(result.pagination ?? { page, limit, total: 0, totalPages: 0 });
          // Hide loader after state is updated
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        } else {
          // Hide loader if no success
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        }
      } catch (error) {
        console.error('Error fetching tour terms:', error);
        setTourTerms([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        // Hide loader on error
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchTourTerms();
  }, [page, limit, language, token, dispatch, t]);

  const resetForm = () => {
    setNewTerm({
      tourId: '',
      terms_conditions_es: '',
      terms_conditions_en: '',
    });
    setErrors({});
  };

  // Handle create tour terms
  const handleCreateTerm = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};

    if (newTerm.tourId === '' || newTerm.tourId === undefined)
      newErrors.tourId = t('termsConditions.validation.requiredTour') ?? 'Required';
    if (!newTerm.terms_conditions_es.trim())
      newErrors.terms_conditions_es = t('termsConditions.validation.requiredEs') ?? 'Required';
    if (!newTerm.terms_conditions_en.trim())
      newErrors.terms_conditions_en = t('termsConditions.validation.requiredEn') ?? 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if valid
    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('termsConditions.creating') ?? 'Creating...',
        })
      );

      const result = (await createTourTerms(newTerm, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.error !== undefined || result.success === false) {
        console.error('Error creating tour terms:', result.error ?? result);
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        setErrorModal({
          isOpen: true,
          title: t('termsConditions.errorCreateTitle') ?? 'Error',
          message:
            result.message ??
            (result.error as { message?: string })?.message ??
            t('termsConditions.errorCreate'),
        });
        return;
      }

      // Success - Keep loader open while refetching
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const refreshResult = await getMyTourTerms(
        {
          page: 1,
          limit,
          language,
        },
        token
      );
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setTourTerms(refreshResult.data);
        setPagination(refreshResult.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
        setPage(1);
        // Hide loader after state is updated
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        // Hide loader even if refetch fails
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error in tour terms creation flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter tour terms by search term
  const filteredTourTerms = tourTerms.filter((term) => {
    const searchLower = searchTerm.toLowerCase();
    const tourName = term.tour ? (language === 'en' ? term.tour.title_en : term.tour.title_es) : '';

    return (
      tourName.toLowerCase().includes(searchLower) ||
      term.terms_conditions_es.toLowerCase().includes(searchLower) ||
      term.terms_conditions_en.toLowerCase().includes(searchLower)
    );
  });

  const columns: Column<TourTerm>[] = [
    {
      key: 'tour',
      label: t('termsConditions.tour'),
      render: (_: unknown, row: TourTerm) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {row.tour
              ? language === 'en'
                ? row.tour.title_en
                : row.tour.title_es
              : t('termsConditions.unknownTour')}
          </div>
          <div className="text-sm text-gray-500 font-mono mt-0.5">{row.tour?.slug ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'terms_es',
      label: t('termsConditions.termsEs'),
      render: (_: unknown, row: TourTerm) => (
        <div className="text-sm text-gray-600 line-clamp-3 max-w-xs">{row.terms_conditions_es}</div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'terms_en',
      label: t('termsConditions.termsEn'),
      render: (_: unknown, row: TourTerm) => (
        <div className="text-sm text-gray-600 line-clamp-3 max-w-xs">{row.terms_conditions_en}</div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'createdAt',
      label: t('termsConditions.created'),
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
      label: t('termsConditions.actions'),
      render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            {t('termsConditions.active')}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('termsConditions.allTerms')}>
        {/* Filters & Actions Toolbar */}
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          {/* Search */}
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <svg
                  style={{ height: '1.25rem', width: '1.25rem', color: 'var(--color-neutral-400)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={t('termsConditions.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Add Button */}
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          >
            <span className="flex items-center gap-2">
              <svg
                style={{ width: '20px', height: '20px' }}
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('termsConditions.addNewTerms')}
            </span>
          </Button>
        </div>

        {/* Table */}
        {tourTerms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium">{t('termsConditions.noTermsFound')}</p>
            <p className="text-sm">{t('termsConditions.noTermsDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredTourTerms} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('termsConditions.showing')}{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span>{' '}
              {t('termsConditions.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
              {t('termsConditions.of')} <span className="font-medium">{pagination.total}</span>{' '}
              {t('termsConditions.results')}
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
                {t('termsConditions.previous')}
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
                {t('termsConditions.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={t('termsConditions.createTermsTitle')}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              {t('termsConditions.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleCreateTerm()}>
              {t('termsConditions.save')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Tour Selection */}
          <div style={{ width: '100%' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color:
                  errors.tourId !== undefined && errors.tourId !== ''
                    ? 'var(--color-error-600)'
                    : 'var(--color-neutral-700)',
              }}
            >
              {t('termsConditions.tour')}
            </label>
            <Select
              options={[
                { value: '', label: t('termsConditions.selectTour') },
                ...tours.map((tour) => ({
                  value: tour.id,
                  label: language === 'en' ? tour.title_en : tour.title_es,
                })),
              ]}
              value={newTerm.tourId}
              onChange={(value) => {
                setNewTerm({ ...newTerm, tourId: value });
                if (errors.tourId !== undefined && errors.tourId !== '')
                  setErrors({ ...errors, tourId: '' });
              }}
              className="w-full"
            />
            {errors.tourId !== undefined && errors.tourId !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.tourId}
              </p>
            )}
          </div>

          {/* Terms in Spanish */}
          <Textarea
            label={t('termsConditions.termsEs')}
            placeholder="Términos y condiciones en español"
            value={newTerm.terms_conditions_es}
            onChange={(e) => {
              setNewTerm({ ...newTerm, terms_conditions_es: e.target.value });
              if (errors.terms_conditions_es !== undefined && errors.terms_conditions_es !== '')
                setErrors({ ...errors, terms_conditions_es: '' });
            }}
            error={errors.terms_conditions_es}
            required
            rows={6}
          />

          {/* Terms in English */}
          <Textarea
            label={t('termsConditions.termsEn')}
            placeholder="Terms and conditions in English"
            value={newTerm.terms_conditions_en}
            onChange={(e) => {
              setNewTerm({ ...newTerm, terms_conditions_en: e.target.value });
              if (errors.terms_conditions_en !== undefined && errors.terms_conditions_en !== '')
                setErrors({ ...errors, terms_conditions_en: '' });
            }}
            error={errors.terms_conditions_en}
            required
            rows={6}
          />
        </div>
      </Dialog>

      {/* Error Modal */}
      <Dialog
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setErrorModal({ ...errorModal, isOpen: false });
            }}
          >
            {t('common.accept')}
          </Button>
        }
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <p
            style={{
              margin: 0,
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {errorModal.title}
          </p>
          <p
            style={{
              color: 'var(--color-neutral-700)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            {errorModal.message}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
