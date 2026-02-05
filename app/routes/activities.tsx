/**
 * Activities Route - Activities Management
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
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleActivityStatus,
  type Activity,
  type ActivityResponse,
  type CreateActivityDto,
} from '~/server/activities';
import type { Column } from '~/components/ui/Table';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import { selectAuthToken } from '~/store/slices/authSlice';
import { useAppSelector } from '~/store/hooks';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function ActivitiesRoute(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Local state for activities and pagination
  const [activities, setActivities] = useState<Activity[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState<CreateActivityDto>({
    activityEs: '',
    activityEn: '',
    category: '',
    isActive: true,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; activity: Activity | null }>({
    isOpen: false,
    activity: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
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

  // Fetch activities when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount
    if (isInitialMount.current === true) {
      isInitialMount.current = false;
      return;
    }

    const fetchActivities = async () => {
      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = (await getActivities({
          page,
          limit,
          isActive: activeFilter === '' ? undefined : activeFilter === 'true',
          category: categoryFilter === '' ? undefined : categoryFilter,
          language,
        })) as ActivityResponse;

        if (result.success === true && result.data !== undefined) {
          setActivities(result.data);
          setPagination(result.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 });
          // Hide loader after state is updated (React will render before this)
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        } else {
          // Hide loader if no success
          setActivities([]);
          setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    };

    void fetchActivities();
  }, [page, activeFilter, categoryFilter, limit, language, dispatch, t]);

  const resetForm = () => {
    setNewActivity({
      activityEs: '',
      activityEn: '',
      category: '',
      isActive: true,
    });
    setErrors({});
    setIsEditMode(false);
    setEditingActivityId(null);
  };

  const handleOpenEditModal = (activity: Activity) => {
    setNewActivity({
      activityEs: activity.activityEs,
      activityEn: activity.activityEn,
      category: activity.category?.slug ?? '',
      isActive: activity.isActive,
    });
    setIsEditMode(true);
    setEditingActivityId(activity.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleActiveStatus = async (activity: Activity) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('activities.updating') ?? 'Updating...',
        })
      );

      const result = (await toggleActivityStatus(activity.id, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setActivities(
          activities.map((a) => (a.id === activity.id ? { ...a, isActive: !a.isActive } : a))
        );
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('activities.errorUpdateTitle'),
          message: result.message ?? result.error?.message ?? t('activities.errorUpdate'),
        });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error toggling activity status:', error);
      // Hide loader on exception
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async () => {
    if (token === null || token === '' || deleteModal.activity === null) return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('activities.deleting') ?? 'Deleting...',
        })
      );

      const result = (await deleteActivity(deleteModal.activity.id, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setActivities(activities.filter((a) => a.id !== deleteModal.activity?.id));
        setDeleteModal({ isOpen: false, activity: null });
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: t('activities.errorDeleteTitle'),
          message: result.message ?? result.error?.message ?? t('activities.errorDelete'),
        });
        setDeleteModal({ isOpen: false, activity: null });
        // Hide loader on error after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      // Hide loader on exception
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle create or update activity
  const handleSaveActivity = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation (Visual)
    const newErrors: Record<string, string> = {};

    if (!newActivity.activityEs.trim())
      newErrors.activityEs = t('activities.validation.nameEsRequired');
    if (!newActivity.activityEn.trim())
      newErrors.activityEn = t('activities.validation.nameEnRequired');
    if (!newActivity.category.trim())
      newErrors.category = t('activities.validation.categoryRequired');

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
          message: isEditMode
            ? (t('activities.updating') ?? 'Updating...')
            : (t('activities.creating') ?? 'Creating...'),
        })
      );

      if (isEditMode === true && editingActivityId !== null) {
        // Update
        const result = (await updateActivity(editingActivityId, newActivity, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating activity:', result.error ?? result);
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
          setErrorModal({
            isOpen: true,
            title: t('activities.errorUpdateTitle') ?? 'Error',
            message: result.message ?? result.error?.message ?? t('activities.errorUpdate'),
          });
          return;
        }
      } else {
        // Create
        const result = (await createActivity(newActivity, token, language)) as {
          success?: boolean;
          message?: string;
          data?: { id: string };
          error?: { message?: string };
        };

        if (
          result.error !== undefined ||
          result.success === false ||
          result.data?.id === undefined
        ) {
          console.error('Error creating activity:', result.error ?? result);
          window.requestAnimationFrame(() => {
            dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          });
          setErrorModal({
            isOpen: true,
            title: t('activities.errorCreateTitle'),
            message: result.message ?? result.error?.message ?? t('activities.errorCreate'),
          });
          return;
        }
      }

      // Success - Keep loader open while refetching
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const params = {
        page: 1,
        limit,
        isActive: activeFilter === '' ? undefined : activeFilter === 'true',
        category: categoryFilter === '' ? undefined : categoryFilter,
        language,
      };

      const refreshResult = (await getActivities(params)) as ActivityResponse;
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setActivities(refreshResult.data);
        setPagination(refreshResult.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 });
        setPage(1);
        // Hide loader after React finishes rendering
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      } else {
        // Hide loader even if refetch fails after React renders
        window.requestAnimationFrame(() => {
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        });
      }
    } catch (error) {
      console.error('Error in activity saving flow:', error);
      window.requestAnimationFrame(() => {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      });
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter activities by search term
  const filteredActivities = activities.filter((activity) => {
    const searchLower = searchTerm.toLowerCase();
    const name = language === 'en' ? activity.activityEn : activity.activityEs;
    const categoryName =
      language === 'en' ? activity.category?.name_en : activity.category?.name_es;

    return (
      name.toLowerCase().includes(searchLower) ||
      (categoryName?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Get unique categories for filter dropdown
  const uniqueCategories = [
    ...new Map(activities.map((a) => [a.category.id, a.category])).values(),
  ];

  const columns: Column<Activity>[] = [
    {
      key: 'activityEs',
      label: t('activities.name'),
      render: (_: unknown, row: Activity) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {language === 'en' ? row.activityEn : row.activityEs}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {language === 'en' ? row.activityEs : row.activityEn}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: t('activities.category'),
      render: (_: unknown, row: Activity) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200">
          {language === 'en' ? row.category?.name_en : row.category?.name_es}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: t('activities.status'),
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
          {(value as boolean) ? t('activities.isActive') : t('activities.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('common.createdAt'),
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
      label: t('activities.actions'),
      render: (_: unknown, row: Activity) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={t('activities.editActivity')}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => setDeleteModal({ isOpen: true, activity: row })}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={t('activities.deleteActivity')}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* Active Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => void handleToggleActiveStatus(row)}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                backgroundColor: row.isActive ? '#10b981' : '#e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: row.isActive ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: row.isActive ? '26px' : '2px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('activities.allActivities')}>
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
                placeholder={t('activities.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('activities.allCategories') },
                ...uniqueCategories.map((cat) => ({
                  value: cat.slug,
                  label: language === 'en' ? cat.name_en : cat.name_es,
                })),
              ]}
              value={categoryFilter}
              onChange={(v: string) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              placeholder={t('activities.allCategories')}
              className="w-full"
            />
          </div>

          {/* Active Status Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('activities.allStatus') },
                { value: 'true', label: t('common.active') },
                { value: 'false', label: t('common.inactive') },
              ]}
              value={activeFilter}
              onChange={(v: string) => {
                setActiveFilter(v);
                setPage(1);
              }}
              placeholder={t('activities.allStatus')}
              className="w-full"
            />
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
              {t('activities.addNewActivity')}
            </span>
          </Button>
        </div>

        {/* Table */}
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <p className="text-lg font-medium">{t('activities.noActivitiesFound')}</p>
            <p className="text-sm">{t('activities.noActivitiesDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredActivities} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination?.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('activities.showing')}{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span> {t('activities.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination?.total ?? 0)}</span>{' '}
              {t('activities.of')} <span className="font-medium">{pagination?.total ?? 0}</span>{' '}
              {t('activities.results')}
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
                {t('activities.previous')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination?.totalPages ?? 0 }, (_, i) => i + 1)
                  .filter(
                    (p) => p === 1 || p === (pagination?.totalPages ?? 0) || Math.abs(p - page) <= 1
                  )
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
                disabled={page === (pagination?.totalPages ?? 0)}
                onClick={() => {
                  setPage((p) => Math.min(pagination?.totalPages ?? 0, p + 1));
                }}
              >
                {t('activities.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={
          isEditMode === true
            ? t('activities.editActivityTitle')
            : t('activities.createActivityTitle')
        }
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              {t('activities.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveActivity()}>
              {t('activities.save')}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <Input
            label={t('activities.nameEs')}
            placeholder="Nombre de la actividad en español"
            value={newActivity.activityEs}
            onChange={(e) => {
              setNewActivity({ ...newActivity, activityEs: e.target.value });
              if (errors.activityEs !== undefined && errors.activityEs !== '')
                setErrors({ ...errors, activityEs: '' });
            }}
            error={errors.activityEs}
            required
          />
          <Input
            label={t('activities.nameEn')}
            placeholder="Activity name in English"
            value={newActivity.activityEn}
            onChange={(e) => {
              setNewActivity({ ...newActivity, activityEn: e.target.value });
              if (errors.activityEn !== undefined && errors.activityEn !== '')
                setErrors({ ...errors, activityEn: '' });
            }}
            error={errors.activityEn}
            required
          />
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-2)',
                fontWeight: 500,
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('activities.category')} <span style={{ color: 'red' }}>*</span>
            </label>
            <Select
              options={[
                { value: '', label: t('activities.allCategories') },
                ...uniqueCategories.map((cat) => ({
                  value: cat.slug,
                  label: language === 'en' ? cat.name_en : cat.name_es,
                })),
              ]}
              value={newActivity.category}
              onChange={(v: string) => {
                setNewActivity({ ...newActivity, category: v });
                if (errors.category !== undefined && errors.category !== '')
                  setErrors({ ...errors, category: '' });
              }}
              placeholder={t('activities.allCategories')}
              className="w-full"
            />
            {errors.category !== undefined && errors.category !== '' && (
              <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.category}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label style={{ fontWeight: 500, color: 'var(--color-neutral-700)' }}>
              {t('activities.isActive')}
            </label>
            <div
              onClick={() => setNewActivity({ ...newActivity, isActive: !newActivity.isActive })}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                backgroundColor: newActivity.isActive ? '#10b981' : '#e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: newActivity.isActive ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: newActivity.isActive ? '26px' : '2px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, activity: null })}
        title={t('activities.deleteActivityTitle')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ isOpen: false, activity: null })}
            >
              {t('activities.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleDeleteActivity()}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
          <svg
            style={{
              width: '48px',
              height: '48px',
              color: '#dc2626',
              margin: '0 auto var(--space-4)',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
            {t('activities.confirmDelete')}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-500)' }}>
            {t('activities.deleteWarning')}
          </p>
          {deleteModal.activity !== null && (
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginTop: 'var(--space-3)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {language === 'en'
                ? deleteModal.activity.activityEn
                : deleteModal.activity.activityEs}
            </p>
          )}
        </div>
      </Dialog>

      {/* Error Modal */}
      <Dialog
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
          >
            {t('common.ok')}
          </Button>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
          <svg
            style={{
              width: '48px',
              height: '48px',
              color: '#dc2626',
              margin: '0 auto var(--space-4)',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-600)' }}>
            {errorModal.message}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
