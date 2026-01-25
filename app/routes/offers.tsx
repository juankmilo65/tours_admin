/**
 * Offers Route - Offers and Promotions Management
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
  getOffers,
  createOffer,
  uploadOfferImage,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  type Offer,
  type OffersResponse,
  type CreateOfferDto,
} from '~/server/offers';
import type { Column } from '~/components/ui/Table';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';
import { useTranslation } from '~/lib/i18n/utils';
import { Input } from '~/components/ui/Input';
import { Dialog } from '~/components/ui/Dialog';
import { selectAuthToken } from '~/store/slices/authSlice';
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import { useAppSelector } from '~/store/hooks';
import { getToursDropdownBusiness } from '~/server/businessLogic/toursBusinessLogic';

export async function loader(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args);
  return null;
}

export default function Offers(): JSX.Element {
  const { t, language } = useTranslation();

  // Auth token for API calls
  const token = useAppSelector(selectAuthToken);

  // Selected country for filtering tours
  const selectedCountry = useAppSelector(selectSelectedCountry);

  // Local state for offers and pagination
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tours, setTours] = useState<
    Array<{
      id: string;
      title_es: string;
      title_en: string;
    }>
  >([]);

  // Local state for modal and form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState<CreateOfferDto>({
    tourId: '',
    title_es: '',
    title_en: '',
    description_es: '',
    description_en: '',
    discountPercentage: 0,
    validFrom: '',
    validTo: '',
    maxUses: 100,
    isActive: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
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

  // Fetch tours on mount and when selected country changes
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const countryId = selectedCountry !== null ? selectedCountry.id : null;
        const result = (await getToursDropdownBusiness(countryId, language)) as {
          success?: boolean;
          data?: Array<{ id: string; title_es: string; title_en: string }>;
        };

        if (result.success === true && result.data !== undefined) {
          setTours(result.data);
        } else {
          setTours([]);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
        setTours([]);
      }
    };

    void fetchTours();
  }, [language, selectedCountry]);

  // Fetch offers when filters or pagination change (but not on initial mount)
  useEffect(() => {
    // Skip fetch on initial mount
    if (isInitialMount.current === true) {
      isInitialMount.current = false;
      return;
    }

    const fetchOffers = async () => {
      // Show global loader when fetching starts
      dispatch(setGlobalLoading({ isLoading: true, message: t('common.loading') }));

      try {
        const result = (await getOffers({
          page,
          limit,
          isActive: statusFilter === '' ? undefined : statusFilter === 'true',
          language,
        })) as OffersResponse;

        if (result.success === true && result.data !== undefined) {
          setOffers(result.data);
          setPagination(result.pagination);
          // Hide loader after state is updated
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        } else {
          // Hide loader if no success
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        setOffers([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
        // Hide loader on error
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    };

    void fetchOffers();
  }, [page, statusFilter, limit, language, dispatch, t]);

  // Handle image preview
  const imagePreview = useMemo(() => {
    if (selectedImage !== null) {
      return URL.createObjectURL(selectedImage);
    }
    if (isEditMode === true) {
      return existingImageUrl;
    }
    return null;
  }, [selectedImage, isEditMode, existingImageUrl]);

  const resetForm = () => {
    setNewOffer({
      tourId: '',
      title_es: '',
      title_en: '',
      description_es: '',
      description_en: '',
      discountPercentage: 0,
      validFrom: '',
      validTo: '',
      maxUses: 100,
      isActive: true,
    });
    setSelectedImage(null);
    setExistingImageUrl(null);
    setErrors({});
    setIsEditMode(false);
    setEditingOfferId(null);
  };

  const handleOpenEditModal = (offer: Offer) => {
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateTimeForInput = (dateString: string): string => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setNewOffer({
      tourId: offer.tourId,
      title_es: offer.title_es,
      title_en: offer.title_en,
      description_es: offer.description_es,
      description_en: offer.description_en,
      discountPercentage: offer.discountPercentage,
      validFrom: formatDateTimeForInput(offer.validFrom),
      validTo: formatDateTimeForInput(offer.validTo),
      maxUses: offer.maxUses,
      isActive: offer.isActive,
    });
    setExistingImageUrl(offer.imageUrl ?? null);
    setIsEditMode(true);
    setEditingOfferId(offer.id);
    setIsCreateModalOpen(true);
  };

  // Handle status toggle
  const handleToggleStatus = async (offer: Offer) => {
    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: t('offers.updating') ?? 'Updating...',
        })
      );

      const result = (await toggleOfferStatus(offer.id, token, language)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setOffers(offers.map((o) => (o.id === offer.id ? { ...o, isActive: !o.isActive } : o)));
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        setErrorModal({
          isOpen: true,
          title: t('offers.errorUpdateTitle'),
          message: result.message ?? result.error?.message ?? t('offers.errorUpdate'),
        });
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle delete offer
  const handleDeleteOffer = async (offer: Offer) => {
    if (!window.confirm(t('offers.deleteOffer') || 'Delete offer?')) return;

    if (token === null || token === '') return;

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: 'Deleting...',
        })
      );

      const result = (await deleteOffer(offer.id, token)) as {
        success?: boolean;
        message?: string;
        error?: { message?: string };
      };

      if (result.success === true) {
        setOffers(offers.filter((o) => o.id !== offer.id));
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error Deleting',
          message: result.message ?? result.error?.message ?? 'Error deleting offer',
        });
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
    }
  };

  // Handle create or update offer
  const handleSaveOffer = async () => {
    if (token === null || token === '') {
      console.error('No token available');
      return;
    }

    // Validation
    const newErrors: Record<string, string> = {};

    if (!newOffer.tourId.trim())
      newErrors.tourId = t('offers.validation.tourRequired') ?? 'Required';
    if (!newOffer.title_es.trim())
      newErrors.title_es = t('offers.validation.titleRequired') ?? 'Required';
    if (!newOffer.title_en.trim())
      newErrors.title_en = t('offers.validation.titleRequired') ?? 'Required';
    if (!newOffer.description_es.trim())
      newErrors.description_es = t('offers.validation.descriptionRequired') ?? 'Required';
    if (!newOffer.description_en.trim())
      newErrors.description_en = t('offers.validation.descriptionRequired') ?? 'Required';
    if (newOffer.discountPercentage < 0 || newOffer.discountPercentage > 100)
      newErrors.discountPercentage = t('offers.validation.invalidDiscount') ?? 'Invalid discount';
    if (!newOffer.validFrom.trim())
      newErrors.validFrom = t('offers.validation.dateRequired') ?? 'Required';
    if (!newOffer.validTo.trim())
      newErrors.validTo = t('offers.validation.dateRequired') ?? 'Required';
    if (
      newOffer.validFrom.trim() !== '' &&
      newOffer.validTo.trim() !== '' &&
      new Date(newOffer.validTo) <= new Date(newOffer.validFrom)
    )
      newErrors.validTo = t('offers.validation.invalidDateRange') ?? 'Invalid date range';
    if (selectedImage === null && isEditMode === false)
      newErrors.image = t('offers.validation.required') ?? 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      dispatch(
        setGlobalLoading({
          isLoading: true,
          message: isEditMode
            ? (t('offers.updating') ?? 'Updating...')
            : (t('offers.creating') ?? 'Creating...'),
        })
      );

      let offerId = editingOfferId;

      // Step 1: Create or Update Offer Metadata
      if (isEditMode === true && offerId !== null) {
        const result = (await updateOffer(offerId, newOffer, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (result.error !== undefined || result.success === false) {
          console.error('Error updating offer:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('offers.errorUpdateTitle') ?? 'Error',
            message: result.message ?? result.error?.message ?? t('offers.errorUpdate'),
          });
          return;
        }
      } else {
        const offerData: CreateOfferDto = {
          ...newOffer,
        };

        const result = (await createOffer(offerData, token, language)) as {
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
          console.error('Error creating offer:', result.error ?? result);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('offers.errorCreateTitle') ?? 'Error',
            message: result.message ?? result.error?.message ?? t('offers.errorCreate'),
          });
          return;
        }
        offerId = result.data.id;
      }

      // Step 2: Upload Image if selected
      if (selectedImage !== null && offerId !== null && offerId !== '') {
        dispatch(
          setGlobalLoading({
            isLoading: true,
            message: t('offers.uploadingImage') ?? 'Uploading Image...',
          })
        );

        const uploadResult = (await uploadOfferImage(offerId, selectedImage, token, language)) as {
          success?: boolean;
          message?: string;
          error?: { message?: string };
        };

        if (uploadResult.error !== undefined || uploadResult.success === false) {
          console.error('Error uploading image:', uploadResult.error ?? uploadResult);
          dispatch(setGlobalLoading({ isLoading: false, message: '' }));
          setErrorModal({
            isOpen: true,
            title: t('offers.imageUploadFailed') ?? 'Upload Failed',
            message:
              uploadResult.message ??
              uploadResult.error?.message ??
              t('offers.offerCreatedButUploadFailed'),
          });
        }
      }

      // Success
      setIsCreateModalOpen(false);
      resetForm();

      // Refetch
      const params = {
        page: 1,
        limit,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
        language,
      };

      const refreshResult = (await getOffers(params)) as OffersResponse;
      if (refreshResult.success === true && refreshResult.data !== undefined) {
        setOffers(refreshResult.data);
        setPagination(refreshResult.pagination);
        setPage(1);
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      } else {
        dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      }
    } catch (error) {
      console.error('Error in offer saving flow:', error);
      dispatch(setGlobalLoading({ isLoading: false, message: '' }));
      setErrorModal({
        isOpen: true,
        title: 'Unexpected Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Filter offers by search term
  const filteredOffers = offers.filter((offer) => {
    const searchLower = searchTerm.toLowerCase();
    const title = language === 'en' ? offer.title_en : offer.title_es;
    const description = language === 'en' ? offer.description_en : offer.description_es;
    const tourName =
      offer.tour !== undefined
        ? language === 'en'
          ? offer.tour.title_en
          : offer.tour.title_es
        : '';

    return (
      title.toLowerCase().includes(searchLower) ||
      (description?.toLowerCase().includes(searchLower) ?? false) ||
      tourName.toLowerCase().includes(searchLower)
    );
  });

  const columns: Column<Offer>[] = [
    {
      key: 'imageUrl',
      label: t('offers.image') ?? 'Image',
      render: (value: unknown, row: Offer) => (
        <div className="flex-shrink-0">
          {value !== null && value !== undefined && (value as string) !== '' ? (
            <img
              src={value as string}
              alt={language === 'en' ? row.title_en : row.title_es}
              className="w-16 h-16 rounded-xl object-cover shadow-md hover:shadow-lg transition-shadow duration-200 bg-gray-200"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: t('offers.title') ?? 'Title',
      render: (_: unknown, row: Offer) => (
        <div>
          <div className="font-semibold text-gray-900 text-base">
            {language === 'en' ? row.title_en : row.title_es}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {row.tour !== undefined
              ? language === 'en'
                ? row.tour.title_en
                : row.tour.title_es
              : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'discountPercentage',
      label: t('offers.discountPercentage') ?? 'Discount',
      render: (value: unknown) => (
        <div className="text-sm font-semibold text-green-600">{value as number}%</div>
      ),
    },
    {
      key: 'validFrom',
      label: t('offers.validFrom') ?? 'Valid From',
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
      key: 'validTo',
      label: t('offers.validTo') ?? 'Valid To',
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
      key: 'isActive',
      label: t('offers.status') ?? 'Status',
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
          {(value as boolean) ? t('offers.active') : t('offers.inactive')}
        </span>
      ),
    },
    {
      key: 'id',
      label: t('offers.actions') ?? 'Actions',
      render: (_: unknown, row: Offer) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
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
            title={t('offers.editOffer') ?? 'Edit Offer'}
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

          <button
            type="button"
            onClick={() => void handleDeleteOffer(row)}
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
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
            title={t('offers.deleteOffer') ?? 'Delete Offer'}
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
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card title={t('offers.allOffers') ?? 'All Offers'}>
        <div
          style={{
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
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
                placeholder={t('offers.searchPlaceholder') ?? 'Search offers...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div style={{ width: '14rem' }}>
            <Select
              options={[
                { value: '', label: t('offers.allStatus') ?? 'All Status' },
                { value: 'true', label: t('offers.active') ?? 'Active' },
                { value: 'false', label: t('offers.inactive') ?? 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(v: string) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder={t('offers.allStatus') ?? 'All Status'}
              className="w-full"
            />
          </div>

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
              {t('offers.addNewOffer') ?? 'Add New Offer'}
            </span>
          </Button>
        </div>

        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
            <p className="text-lg font-medium">{t('offers.noOffersFound') ?? 'No offers found'}</p>
            <p className="text-sm">
              {t('offers.noOffersDescription') ?? 'Try adjusting your filters or add a new offer'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data={filteredOffers} columns={columns} />
          </div>
        )}

        {pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-gray-600">
              {t('offers.showing') ?? 'Showing'}{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span> {t('offers.to') ?? 'to'}{' '}
              <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
              {t('offers.of') ?? 'of'} <span className="font-medium">{pagination.total}</span>{' '}
              {t('offers.results') ?? 'results'}
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
                {t('offers.previous') ?? 'Previous'}
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
                {t('offers.next') ?? 'Next'}
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
        title={isEditMode === true ? t('offers.editOfferTitle') : t('offers.createOfferTitle')}
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
              {t('offers.cancel') ?? 'Cancel'}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveOffer()}>
              {isEditMode === true ? t('common.save') : t('offers.save')}
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
          <div style={{ gridColumn: '1 / -1' }}>
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
              {t('offers.tourRequired') ?? 'Tour'}
            </label>
            <Select
              options={[
                { value: '', label: t('offers.tour') ?? 'Select Tour' },
                ...tours.map((tour) => ({
                  value: tour.id,
                  label: language === 'en' ? tour.title_en : tour.title_es,
                })),
              ]}
              value={newOffer.tourId}
              onChange={(v: string) => {
                setNewOffer({ ...newOffer, tourId: v });
                if (errors.tourId !== undefined && errors.tourId !== '')
                  setErrors({ ...errors, tourId: '' });
              }}
              placeholder={t('offers.tour') ?? 'Select Tour'}
              className="w-full"
            />
          </div>

          <Input
            label={t('offers.titleEs') ?? 'Title (Spanish)'}
            placeholder="Oferta Especial"
            value={newOffer.title_es}
            onChange={(e) => {
              setNewOffer({ ...newOffer, title_es: e.target.value });
              if (errors.title_es !== undefined && errors.title_es !== '')
                setErrors({ ...errors, title_es: '' });
            }}
            error={errors.title_es}
            required
          />
          <Input
            label={t('offers.titleEn') ?? 'Title (English)'}
            placeholder="Special Offer"
            value={newOffer.title_en}
            onChange={(e) => {
              setNewOffer({ ...newOffer, title_en: e.target.value });
              if (errors.title_en !== undefined && errors.title_en !== '')
                setErrors({ ...errors, title_en: '' });
            }}
            error={errors.title_en}
            required
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('offers.descriptionEs') ?? 'Description (Spanish)'}
            </label>
            <textarea
              value={newOffer.description_es}
              onChange={(e) => {
                setNewOffer({ ...newOffer, description_es: e.target.value });
                if (errors.description_es !== undefined && errors.description_es !== '')
                  setErrors({ ...errors, description_es: '' });
              }}
              placeholder="Descripción de la oferta en español..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: 'var(--space-3)',
                border: `1px solid ${errors.description_es !== undefined && errors.description_es !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
            {errors.description_es !== undefined && errors.description_es !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.description_es}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              gridColumn: '1 / -1',
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('offers.descriptionEn') ?? 'Description (English)'}
            </label>
            <textarea
              value={newOffer.description_en}
              onChange={(e) => {
                setNewOffer({ ...newOffer, description_en: e.target.value });
                if (errors.description_en !== undefined && errors.description_en !== '')
                  setErrors({ ...errors, description_en: '' });
              }}
              placeholder="Offer description in English..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: 'var(--space-3)',
                border: `1px solid ${errors.description_en !== undefined && errors.description_en !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-base)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
            {errors.description_en !== undefined && errors.description_en !== '' && (
              <p
                style={{
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error-500)',
                }}
              >
                {errors.description_en}
              </p>
            )}
          </div>

          <Input
            label={t('offers.discountPercentage') ?? 'Discount %'}
            type="number"
            min="0"
            max="100"
            placeholder="20"
            value={newOffer.discountPercentage}
            onChange={(e) => {
              setNewOffer({ ...newOffer, discountPercentage: parseInt(e.target.value) || 0 });
              if (errors.discountPercentage !== undefined && errors.discountPercentage !== '')
                setErrors({ ...errors, discountPercentage: '' });
            }}
            error={errors.discountPercentage}
            required
          />
          <Input
            label={t('offers.maxUses') ?? 'Max Uses'}
            type="number"
            min="1"
            placeholder="100"
            value={newOffer.maxUses}
            onChange={(e) => {
              setNewOffer({ ...newOffer, maxUses: parseInt(e.target.value) || 100 });
            }}
            required
          />

          <Input
            label={t('offers.validFrom') ?? 'Valid From'}
            type="datetime-local"
            value={newOffer.validFrom}
            onChange={(e) => {
              setNewOffer({ ...newOffer, validFrom: e.target.value });
              if (errors.validFrom !== undefined && errors.validFrom !== '')
                setErrors({ ...errors, validFrom: '' });
            }}
            error={errors.validFrom}
            required
          />
          <Input
            label={t('offers.validTo') ?? 'Valid To'}
            type="datetime-local"
            value={newOffer.validTo}
            onChange={(e) => {
              setNewOffer({ ...newOffer, validTo: e.target.value });
              if (errors.validTo !== undefined && errors.validTo !== '')
                setErrors({ ...errors, validTo: '' });
            }}
            error={errors.validTo}
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
              id="offer-active"
              checked={newOffer.isActive}
              onChange={(e) => setNewOffer({ ...newOffer, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: 'var(--color-primary-600)',
              }}
            />
            <label
              htmlFor="offer-active"
              style={{
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-neutral-700)',
              }}
            >
              {t('offers.isActive') ?? 'Active'}
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
              {t('offers.imageUrl') ?? 'Image URL'}
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
                        image: t('offers.validation.invalidFormat') ?? 'Invalid format',
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
                const input = document.getElementById('offer-image-upload');
                if (input !== null) input.click();
              }}
            >
              <input
                id="offer-image-upload"
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
                          image: t('offers.validation.invalidFormat') ?? 'Invalid format',
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
                        {t('offers.changeImage') ?? 'Change Image'}
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
