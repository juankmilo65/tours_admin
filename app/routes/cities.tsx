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
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import { selectCities } from '~/store/slices/citiesSlice';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';

import { createCity, uploadCityImage, updateCity, type CreateCityDto } from '~/server/cities';
import { selectAuthToken } from '~/store/slices/authSlice';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Cities(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Get cities from Redux (loaded by root.tsx loader)
  const reduxCities = useAppSelector(selectCities);
  const [cities, setCities] = useState<City[]>(reduxCities as City[]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCity, setNewCity] = useState<CreateCityDto>({
    name_es: '',
    name_en: '',
    slug: '',
    countryId: '',
    description_es: '',
    description_en: '',
    imageUrl: '',
    isActive: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
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

  // Get selected country from Redux (managed by Header)
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const selectedCountryId = selectedCountry?.id;
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

  // Handle image preview
  useEffect(() => {
    if (selectedImage === null) {
      if (isEditMode === false) {
        setImagePreview(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreview(objectUrl);

    return () => {
      if (objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedImage, isEditMode]);

  const generateSlug = (text: string) => {
    const code =
      selectedCountry?.code !== undefined && selectedCountry?.code !== ''
        ? `-${selectedCountry.code.toLowerCase()}`
        : '';
    const baseSlug = text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text

    return `${baseSlug}${code}`;
  };

  const resetForm = () => {
    setNewCity({
      name_es: '',
      name_en: '',
      slug: '',
      countryId: '',
      description_es: '',
      description_en: '',
      imageUrl: '',
      isActive: true,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setErrors({});
    setIsEditMode(false);
    setEditingCityId(null);
  };

  const handleOpenEditModal = (city: City) => {
    setNewCity({
      name_es: city.name_es,
      name_en: city.name_en,
      slug: city.slug,
      countryId: city.countryId,
      description_es: city.description_es,
      description_en: city.description_en,
      imageUrl: city.imageUrl,
      isActive: city.isActive,
    });
    setImagePreview(city.imageUrl);
    setIsEditMode(true);
    setEditingCityId(city.id);
    setIsCreateModalOpen(true);
  };

  // Handle create or update city
  const handleSaveCity = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }
    if (selectedCountryId === undefined || selectedCountryId === '') {
      console.error('No country selected');
      return;
    }

    // Validation (Visual)
    const newErrors: Record<string, string> = {};

    if (!newCity.name_es.trim()) newErrors.name_es = t('cities.validation.required') || 'Required';
    if (!newCity.name_en.trim()) newErrors.name_en = t('cities.validation.required') || 'Required';
    // Slug is auto-generated, but we ensure it exists internally
    if (!newCity.slug.trim()) newErrors.slug = 'Slug specific error';
    if (!newCity.description_es.trim())
      newErrors.description_es = t('cities.validation.required') || 'Required';
    if (!newCity.description_en.trim())
      newErrors.description_en = t('cities.validation.required') || 'Required';
    if (selectedImage === null && isEditMode === false)
      newErrors.image = t('cities.validation.required') || 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Create a toast or simpler feedback if needed, but per-field errors are enough
      return;
    }

    // Clear errors if valid
    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode
            ? t('cities.updating') || 'Updating...'
            : t('cities.creating') || 'Creating...',
        })
      );

      let cityId = editingCityId;

      // Step 1: Create or Update City Metadata
      if (isEditMode === true && cityId !== null) {
        // Update
        const result = (await updateCity(cityId, newCity, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating city:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('cities.errorUpdateTitle') || 'Error',
            message: result.message ?? result.error?.message ?? t('cities.errorUpdate'),
          });
          return;
        }
      } else {
        // Create
        const cityData: CreateCityDto = {
          ...newCity,
          imageUrl: '', // Will be updated by upload
          countryId: selectedCountryId,
        };

        const result = (await createCity(cityData, token, language)) as {
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
          console.error('Error creating city:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('cities.errorCreateTitle'),
            message: result.message ?? result.error?.message ?? t('cities.errorCreate'),
          });
          return;
        }
        cityId = result.data.id;
      }

      // Step 2: Upload Image if selected
      if (selectedImage !== null && cityId !== null && cityId !== '') {
        dispatch(
          setGlobalLoading({
            isLoading: true,
            message: t('cities.uploadingImage') || 'Uploading Image...',
          })
        );

        const uploadResult = (await uploadCityImage(cityId, selectedImage, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (uploadResult.error !== undefined || uploadResult.success === false) {
          console.error('Error uploading image:', uploadResult.error ?? uploadResult);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('cities.imageUploadFailed'),
            message:
              uploadResult.message ??
              uploadResult.error?.message ??
              t('cities.cityCreatedButUploadFailed'),
          });
        }
      }

      // Success
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const params = {
        page: 1,
        limit,
        countryId: selectedCountryId,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        language,
      };

      const refreshResult = (await getCities(params)) as CitiesResponse;
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setCities(refreshResult.data);
        setPagination(refreshResult.pagination);
        setPage(1);
      }
    } catch (error) {
      console.error('Error in city saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter cities by search term
  const filteredCities = cities.filter((city) => {
    const searchLower = searchTerm.toLowerCase();
    const name = language === 'en' ? city.name_en : city.name_es;
    const description = language === 'en' ? city.description_en : city.description_es;

    return (
      name.toLowerCase().includes(searchLower) || description.toLowerCase().includes(searchLower)
    );
  });

  const columns: Column<City>[] = [
    {
      key: 'imageUrl',
      label: t('cities.image'),
      render: (value: unknown, row: City) => (
        <div className="flex-shrink-0">
          <img
            src={value as string}
            alt={language === 'en' ? row.name_en : row.name_es}
            className="w-16 h-16 rounded-xl object-cover shadow-md hover:shadow-lg transition-shadow duration-200"
            loading="lazy"
          />
        </div>
      ),
    },
    {
      key: 'name',
      label: t('cities.city'),
      render: (_: unknown, row: City) => (
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
      label: t('cities.description'),
      render: (_: unknown, row: City) => (
        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">
          {language === 'en' ? row.description_en : row.description_es}
        </div>
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
      render: (_: unknown, row: City) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 group"
            title="Edit City"
            onClick={() => handleOpenEditModal(row)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('cities.allCities')}>
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
                placeholder={t('cities.searchPlaceholder')}
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
                { value: '', label: t('cities.allStatus') },
                { value: 'true', label: t('cities.active') },
                { value: 'false', label: t('cities.inactive') },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder={t('cities.allStatus')}
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
              {t('cities.addNewCity')}
            </span>
          </Button>
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
        {pagination.total > 0 && (
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

      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={isEditMode === true ? t('cities.editCityTitle') : t('cities.createCityTitle')}
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
              {t('cities.cancel')}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveCity()}>
              {isEditMode === true ? t('common.save') : t('cities.save')}
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
            label={t('cities.nameEs')}
            placeholder="Ej: Guadalajara"
            value={newCity.name_es}
            onChange={(e) => {
              setNewCity({ ...newCity, name_es: e.target.value });
              if (errors.name_es !== undefined && errors.name_es !== '')
                setErrors({ ...errors, name_es: '' });
            }}
            error={errors.name_es}
            required
          />
          <Input
            label={t('cities.nameEn')}
            placeholder="Ex: Guadalajara"
            value={newCity.name_en}
            onChange={(e) => {
              const val = e.target.value;
              setNewCity({ ...newCity, name_en: val, slug: generateSlug(val) });
              if (errors.name_en !== undefined && errors.name_en !== '')
                setErrors({ ...errors, name_en: '' });
            }}
            error={errors.name_en}
            required
          />
          {/* Slug is hidden and auto-generated */}

          <Input
            label={t('cities.descriptionEs')}
            placeholder="Descripción en español"
            value={newCity.description_es}
            onChange={(e) => {
              setNewCity({ ...newCity, description_es: e.target.value });
              if (errors.description_es !== undefined && errors.description_es !== '')
                setErrors({ ...errors, description_es: '' });
            }}
            error={errors.description_es}
            required
          />
          <Input
            label={t('cities.descriptionEn')}
            placeholder="Description in English"
            value={newCity.description_en}
            onChange={(e) => {
              setNewCity({ ...newCity, description_en: e.target.value });
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
              id="city-active"
              checked={newCity.isActive}
              onChange={(e) => setNewCity({ ...newCity, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="city-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('cities.active')}
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
              {t('cities.imageUrl')}
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
                  setSelectedImage(files[0] ?? null);
                  if (errors.image !== undefined && errors.image !== '')
                    setErrors({ ...errors, image: '' });
                }
              }}
              onClick={() => {
                const input = document.getElementById('image-upload');
                if (input !== null) input.click();
              }}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files !== null && files.length > 0) {
                    setSelectedImage(files[0] ?? null);
                    if (errors.image !== undefined && errors.image !== '')
                      setErrors({ ...errors, image: '' });
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
                        {t('cities.changeImage')}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-2)',
                backgroundColor: 'var(--color-error-50)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <svg
                style={{ width: 24, height: 24, color: 'var(--color-error-600)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p
              style={{
                margin: 0,
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-900)',
              }}
            >
              {t('common.errorOccurred')}
            </p>
          </div>
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
