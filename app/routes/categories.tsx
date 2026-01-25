/**
 * Categories Route - Categories Management
 */

import type { JSX } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Table } from '~/components/ui/Table';
import Select from '~/components/ui/Select';
import {
  getCategories,
  createCategory,
  uploadCategoryImage,
  updateCategory,
  type Category,
  type CategoriesResponse,
  type CreateCategoryDto,
} from '~/server/categories';
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

export default function Categories(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Local state for categories and pagination
  const [categories, setCategories] = useState<Category[]>([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<CreateCategoryDto>({
    name_es: '',
    name_en: '',
    slug: '',
    description_es: '',
    description_en: '',
    imageUrl: '',
    isActive: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
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
  const dispatch = useAppDispatch();

  // Fetch categories when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount
    if (isInitialMount.current === true) {
      isInitialMount.current = false;
      return;
    }

    const fetchCategories = async () => {
      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = (await getCategories({
          page,
          limit,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language,
        })) as CategoriesResponse;

        if (result.success === true && result.data !== undefined) {
          setCategories(result.data);
          setPagination(result.pagination);
          // Hide loader after state is updated (React will render before this)
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        } else {
          // Hide loader if no success
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        // Hide loader on error
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchCategories();
  }, [page, statusFilter, limit, language, dispatch, t]);

  // Handle image preview using useMemo for derived state
  const imagePreview = useMemo(() => {
    if (selectedImage !== null) {
      return URL.createObjectURL(selectedImage);
    }
    // If editing mode and no new image selected, show existing image
    if (isEditMode === true) {
      return existingImageUrl;
    }
    return null;
  }, [selectedImage, isEditMode, existingImageUrl]);

  const generateSlug = (text: string) => {
    const baseSlug = text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text

    return baseSlug;
  };

  const resetForm = () => {
    setNewCategory({
      name_es: '',
      name_en: '',
      slug: '',
      description_es: '',
      description_en: '',
      imageUrl: '',
      isActive: true,
    });
    setSelectedImage(null);
    setExistingImageUrl(null);
    setErrors({});
    setIsEditMode(false);
    setEditingCategoryId(null);
  };

  const handleOpenEditModal = (category: Category) => {
    setNewCategory({
      name_es: category.name_es,
      name_en: category.name_en,
      slug: category.slug,
      description_es: category.description_es ?? '',
      description_en: category.description_en ?? '',
      imageUrl: category.imageUrl ?? '',
      isActive: category.isActive,
    });
    setExistingImageUrl(category.imageUrl ?? null);
    setIsEditMode(true);
    setEditingCategoryId(category.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleStatus = async (category: Category) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('categories.updating') || 'Updating...',
        })
      );

      const result = (await updateCategory(
        category.id,
        { isActive: !category.isActive },
        token,
        language
      )) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setCategories(
          categories.map((c) => (c.id === category.id ? { ...c, isActive: !c.isActive } : c))
        );
        // Hide loader after state is updated and UI is ready
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        setErrorModal({
          isOpen: true,
          title: t('categories.errorUpdateTitle'),
          message: result.message ?? result.error?.message ?? t('categories.errorUpdate'),
        });
        // Hide loader on error
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error toggling category status:', error);
      // Hide loader on exception
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle create or update category
  const handleSaveCategory = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation (Visual)
    const newErrors: Record<string, string> = {};

    if (!newCategory.name_es.trim())
      newErrors.name_es = t('categories.validation.required') || 'Required';
    if (!newCategory.name_en.trim())
      newErrors.name_en = t('categories.validation.required') || 'Required';
    // Slug is auto-generated, but we ensure it exists internally
    if (!newCategory.slug.trim()) newErrors.slug = 'Slug specific error';
    if (newCategory.description_es !== undefined && !newCategory.description_es.trim())
      newErrors.description_es = t('categories.validation.required') || 'Required';
    if (newCategory.description_en !== undefined && !newCategory.description_en.trim())
      newErrors.description_en = t('categories.validation.required') || 'Required';
    if (selectedImage === null && isEditMode === false)
      newErrors.image = t('categories.validation.required') || 'Required';

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
            ? t('categories.updating') || 'Updating...'
            : t('categories.creating') || 'Creating...',
        })
      );

      let categoryId = editingCategoryId;

      // Step 1: Create or Update Category Metadata
      if (isEditMode === true && categoryId !== null) {
        // Update
        const result = (await updateCategory(categoryId, newCategory, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating category:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('categories.errorUpdateTitle') || 'Error',
            message: result.message ?? result.error?.message ?? t('categories.errorUpdate'),
          });
          return;
        }
      } else {
        // Create
        const categoryData: CreateCategoryDto = {
          ...newCategory,
          imageUrl: '', // Will be updated by upload
        };

        const result = (await createCategory(categoryData, token, language)) as {
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
          console.error('Error creating category:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('categories.errorCreateTitle'),
            message: result.message ?? result.error?.message ?? t('categories.errorCreate'),
          });
          return;
        }
        categoryId = result.data.id;
      }

      // Step 2: Upload Image if selected
      if (selectedImage !== null && categoryId !== null && categoryId !== '') {
        dispatch(
          setGlobalLoading({
            isLoading: true,
            message: t('categories.uploadingImage') || 'Uploading Image...',
          })
        );

        const uploadResult = (await uploadCategoryImage(
          categoryId,
          selectedImage,
          token,
          language
        )) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (uploadResult.error !== undefined || uploadResult.success === false) {
          console.error('Error uploading image:', uploadResult.error ?? uploadResult);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('categories.imageUploadFailed'),
            message:
              uploadResult.message ??
              uploadResult.error?.message ??
              t('categories.categoryCreatedButUploadFailed'),
          });
        }
      }

      // Success - Keep loader open while refetching
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const params = {
        page: 1,
        limit,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        language,
      };

      const refreshResult = (await getCategories(params)) as CategoriesResponse;
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setCategories(refreshResult.data);
        setPagination(refreshResult.pagination);
        setPage(1);
        // Hide loader after state is updated and UI is ready
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        // Hide loader even if refetch fails
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error in category saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter categories by search term
  const filteredCategories = categories.filter((category) => {
    const searchLower = searchTerm.toLowerCase();
    const name = language === 'en' ? category.name_en : category.name_es;
    const description = language === 'en' ? category.description_en : category.description_es;

    return (
      name.toLowerCase().includes(searchLower) ||
      (description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const columns: Column<Category>[] = [
    {
      key: 'imageUrl',
      label: t('categories.image'),
      render: (value: unknown, row: Category) => (
        <div className="flex-shrink-0">
          <img
            src={(value as string) ?? '/placeholder-image.png'}
            alt={language === 'en' ? row.name_en : row.name_es}
            className="w-16 h-16 rounded-xl object-cover shadow-md hover:shadow-lg transition-shadow duration-200 bg-gray-200"
            loading="lazy"
          />
        </div>
      ),
    },
    {
      key: 'name',
      label: t('categories.category'),
      render: (_: unknown, row: Category) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {language === 'en' ? row.name_en : row.name_es}
          </div>
          <div className="text-sm text-gray-500 font-mono mt-0.5">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'description',
      label: t('categories.description'),
      render: (_: unknown, row: Category) => (
        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">
          {language === 'en' ? row.description_en : row.description_es}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'isActive',
      label: t('categories.status'),
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
          {(value as boolean) ? t('categories.active') : t('categories.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('categories.created'),
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
      label: t('categories.actions'),
      render: (_: unknown, row: Category) => (
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
            title="Edit Category"
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

          {/* Premium iOS-style Toggle Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => void handleToggleStatus(row)}
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
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                color: row.isActive ? '#047857' : '#6b7280',
                textTransform: 'uppercase',
                minWidth: '60px',
              }}
            >
              {row.isActive ? t('categories.active') : t('categories.inactive')}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('categories.allCategories')}>
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
                placeholder={t('categories.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('categories.allStatus') },
                { value: 'true', label: t('categories.active') },
                { value: 'false', label: t('categories.inactive') },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder={t('categories.allStatus')}
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
              {t('categories.addNewCategory')}
            </span>
          </Button>
        </div>

        {/* Table */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <p className="text-lg font-medium">{t('categories.noCategoriesFound')}</p>
            <p className="text-sm">{t('categories.noCategoriesDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredCategories} columns={columns} />
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('categories.showing')}{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span> {t('categories.to')}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
              {t('categories.of')} <span className="font-medium">{pagination.total}</span>{' '}
              {t('categories.results')}
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
                {t('categories.previous')}
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
                {t('categories.next')}
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
        title={
          isEditMode === true
            ? t('categories.editCategoryTitle')
            : t('categories.createCategoryTitle')
        }
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
              {t('categories.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveCategory()}>
              {isEditMode === true ? t('common.save') : t('categories.save')}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          <Input
            label={t('categories.nameEs')}
            placeholder="Ej: Deportes Acuáticos"
            value={newCategory.name_es}
            onChange={(e) => {
              setNewCategory({ ...newCategory, name_es: e.target.value });
              if (errors.name_es !== undefined && errors.name_es !== '')
                setErrors({ ...errors, name_es: '' });
            }}
            error={errors.name_es}
            required
          />
          <Input
            label={t('categories.nameEn')}
            placeholder="Ex: Water Sports"
            value={newCategory.name_en}
            onChange={(e) => {
              const val = e.target.value;
              setNewCategory({ ...newCategory, name_en: val, slug: generateSlug(val) });
              if (errors.name_en !== undefined && errors.name_en !== '')
                setErrors({ ...errors, name_en: '' });
            }}
            error={errors.name_en}
            required
          />
          {/* Slug is hidden and auto-generated */}

          <Input
            label={t('categories.descriptionEs')}
            placeholder="Descripción en español"
            value={newCategory.description_es}
            onChange={(e) => {
              setNewCategory({ ...newCategory, description_es: e.target.value });
              if (errors.description_es !== undefined && errors.description_es !== '')
                setErrors({ ...errors, description_es: '' });
            }}
            error={errors.description_es}
            required
          />
          <Input
            label={t('categories.descriptionEn')}
            placeholder="Description in English"
            value={newCategory.description_en}
            onChange={(e) => {
              setNewCategory({ ...newCategory, description_en: e.target.value });
              if (errors.description_en !== undefined && errors.description_en !== '')
                setErrors({ ...errors, description_en: '' });
            }}
            error={errors.description_en}
            required
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <input
              type="checkbox"
              id="category-active"
              checked={newCategory.isActive}
              onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="category-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('categories.active')}
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color:
                  errors.image !== undefined && errors.image !== ''
                    ? 'var(--color-error-600)'
                    : 'var(--color-neutral-700)',
              }}
            >
              {t('categories.imageUrl')}
            </label>
            <div
              style={{
                border: `2px dashed ${errors.image !== undefined && errors.image !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor:
                  errors.image !== undefined && errors.image !== ''
                    ? 'var(--color-error-50)'
                    : 'var(--color-neutral-50)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                const isError = errors.image !== undefined && errors.image !== '';
                e.currentTarget.style.borderColor = isError
                  ? 'var(--color-error-500)'
                  : 'var(--color-neutral-300)';
                e.currentTarget.style.backgroundColor = isError
                  ? 'var(--color-error-50)'
                  : 'var(--color-neutral-50)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                const files = e.dataTransfer.files;
                if (files !== null && files.length > 0) {
                  const file = files[0];
                  if (file !== undefined && file !== null) {
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    if (!validTypes.includes(file.type)) {
                      setErrors({
                        ...errors,
                        image: t('categories.validation.invalidFormat') || 'Invalid format',
                      });
                      return;
                    }
                    setSelectedImage(file);
                    if (errors.image !== undefined && errors.image !== '')
                      setErrors({ ...errors, image: '' });
                  }
                }
              }}
              onClick={() => {
                const input = document.getElementById('category-image-upload');
                if (input !== null) input.click();
              }}
            >
              <input
                id="category-image-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files !== null && files.length > 0) {
                    const file = files[0];
                    if (file !== undefined && file !== null) {
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      if (!validTypes.includes(file.type)) {
                        setErrors({
                          ...errors,
                          image: t('categories.validation.invalidFormat') || 'Invalid format',
                        });
                        return;
                      }
                      setSelectedImage(file);
                      if (errors.image !== undefined && errors.image !== '')
                        setErrors({ ...errors, image: '' });
                    }
                  }
                }}
              />
              {imagePreview !== null ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '300px',
                      height: '160px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <span
                        style={{
                          color: 'white',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          padding: 'var(--space-1) var(--space-3)',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        {t('categories.changeImage')}
                      </span>
                    </div>
                  </div>
                  {selectedImage !== null && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-500)' }}>
                      {selectedImage.name}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <svg
                    style={{
                      width: 32,
                      height: 32,
                      color:
                        errors.image !== undefined && errors.image !== ''
                          ? 'var(--color-error-400)'
                          : 'var(--color-neutral-400)',
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color:
                        errors.image !== undefined && errors.image !== ''
                          ? 'var(--color-error-600)'
                          : 'var(--color-neutral-600)',
                    }}
                  >
                    {errors.image !== undefined && errors.image !== ''
                      ? errors.image
                      : 'Click or drag image here'}
                  </span>
                </div>
              )}
            </div>
            {errors.image !== undefined && errors.image !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.image}
              </p>
            )}
          </div>
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
              // Also close create modal if open, as per request
              setIsCreateModalOpen(false);
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
