import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { createTourBusiness } from '~/server/businessLogic/toursBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { selectCategories, type Category } from '~/store/slices/categoriesSlice';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { openModal, closeModal } from '~/store/slices/uiSlice';
import Select from '~/components/ui/Select';

// Type definitions
interface UserDropdownOption {
  id: string;
  name: string;
  email: string;
}

interface CreateTourModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
  users?: UserDropdownOption[];
  mode?: 'create' | 'edit';
  initialData?: Partial<TourFormData>;
}

interface TourFormData {
  userId: string;
  categoryId: string;
  cityId: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  shortDescriptionEs: string;
  shortDescriptionEn: string;
  duration: number;
  maxCapacity: number;
  basePrice: number;
  currency: string;
  imageUrl: string;
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  language: string[];
  isActive: boolean;
}

export function CreateTourModal({
  isOpen,
  onSuccess,
  onClose,
  users = [],
  mode = 'create',
  initialData,
}: CreateTourModalProps): JSX.Element | null {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const categories = useAppSelector(selectCategories);
  const rawCities = useAppSelector(selectCities);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Default form data
  const getDefaultFormData = useCallback(
    (): TourFormData => ({
      userId: initialData?.userId ?? currentUser?.id ?? '',
      categoryId: initialData?.categoryId ?? '',
      cityId: initialData?.cityId ?? '',
      titleEs: initialData?.titleEs ?? '',
      titleEn: initialData?.titleEn ?? '',
      descriptionEs: initialData?.descriptionEs ?? '',
      descriptionEn: initialData?.descriptionEn ?? '',
      shortDescriptionEs: initialData?.shortDescriptionEs ?? '',
      shortDescriptionEn: initialData?.shortDescriptionEn ?? '',
      duration: initialData?.duration ?? 1,
      maxCapacity: initialData?.maxCapacity ?? 1,
      basePrice: initialData?.basePrice ?? 0,
      currency: initialData?.currency ?? 'MXN',
      imageUrl: initialData?.imageUrl ?? '',
      images: initialData?.images ?? [''],
      difficulty: initialData?.difficulty ?? 'easy',
      language: initialData?.language ?? ['es'],
      isActive: initialData?.isActive ?? true,
    }),
    [initialData, currentUser?.id]
  );

  const [formData, setFormData] = useState<TourFormData>(getDefaultFormData());

  const [errors, setErrors] = useState<Partial<Record<keyof TourFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInputs, setImageInputs] = useState<string[]>(initialData?.images ?? ['']);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  // Translated cities
  const translatedCities = translateCities(rawCities, 'es');

  // Reset form to initial state
  const resetForm = useCallback((): void => {
    setFormData(getDefaultFormData());
    setErrors({});
    setImageInputs(initialData?.images ?? ['']);
    setShowCloseConfirmation(false);
  }, [getDefaultFormData, initialData?.images]);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultFormData());
      setImageInputs(initialData?.images ?? ['']);
    }
  }, [isOpen, getDefaultFormData, initialData?.images]);

  // Update userId when currentUser changes (only in create mode without initialData)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (currentUser?.id !== undefined && currentUser?.id !== null && !initialData?.userId) {
      setFormData((prev) => ({ ...prev, userId: currentUser.id }));
    }
  }, [currentUser?.id, initialData?.userId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number.parseFloat(value) : value,
    }));

    // Clear error for this field
    if (errors[name as keyof TourFormData] !== undefined) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageChange = (index: number, value: string): void => {
    const newImages = [...imageInputs];
    newImages[index] = value;
    setImageInputs(newImages);
    setFormData((prev) => ({
      ...prev,
      images: newImages.filter((img) => img.trim() !== ''),
    }));
  };

  const addImageInput = (): void => {
    setImageInputs([...imageInputs, '']);
  };

  const removeImageInput = (index: number): void => {
    const newImages = imageInputs.filter((_, i) => i !== index);
    setImageInputs(newImages);
    setFormData((prev) => ({
      ...prev,
      images: newImages.filter((img) => img.trim() !== ''),
    }));
  };

  const handleLanguageToggle = (lang: 'es' | 'en'): void => {
    setFormData((prev) => ({
      ...prev,
      language: prev.language.includes(lang)
        ? prev.language.filter((l) => l !== lang)
        : [...prev.language, lang],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TourFormData, string>> = {};

    if (!formData.userId) newErrors.userId = t('tours.userIdRequired');
    if (!formData.categoryId) newErrors.categoryId = t('tours.categoryIdRequired');
    if (!formData.cityId) newErrors.cityId = t('tours.cityIdRequired');
    if (!formData.titleEs) newErrors.titleEs = t('tours.titleEsRequired');
    if (!formData.titleEn) newErrors.titleEn = t('tours.titleEnRequired');
    if (!formData.descriptionEs) newErrors.descriptionEs = t('tours.descriptionEsRequired');
    if (!formData.descriptionEn) newErrors.descriptionEn = t('tours.descriptionEnRequired');
    if (!formData.shortDescriptionEs)
      newErrors.shortDescriptionEs = t('tours.shortDescriptionEsRequired');
    if (!formData.shortDescriptionEn)
      newErrors.shortDescriptionEn = t('tours.shortDescriptionEnRequired');
    if (formData.duration <= 0) newErrors.duration = t('tours.durationRequired');
    if (formData.maxCapacity <= 0) newErrors.maxCapacity = t('tours.maxCapacityRequired');
    if (formData.basePrice <= 0) newErrors.basePrice = t('tours.basePriceRequired');
    // Validate that at least one image is provided
    const validImages = formData.images.filter((img) => img.trim() !== '');
    if (validImages.length === 0)
      newErrors.images = t('tours.imagesRequired') || 'Al menos una imagen es requerida';
    if (formData.language.length === 0) newErrors.language = t('tours.languageRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const filteredImages = formData.images.filter((img) => img.trim() !== '');
      const payload = {
        userId: formData.userId,
        categoryId: formData.categoryId,
        cityId: formData.cityId,
        titleEs: formData.titleEs,
        titleEn: formData.titleEn,
        descriptionEs: formData.descriptionEs,
        descriptionEn: formData.descriptionEn,
        shortDescriptionEs: formData.shortDescriptionEs,
        shortDescriptionEn: formData.shortDescriptionEn,
        duration: formData.duration,
        maxCapacity: formData.maxCapacity,
        basePrice: formData.basePrice,
        currency: formData.currency,
        imageUrl: filteredImages[0] ?? '', // Use first image as main imageUrl
        images: filteredImages,
        difficulty: formData.difficulty,
        language: formData.language,
        isActive: formData.isActive,
      };

      const result = await createTourBusiness(payload, token ?? '');

      if (result !== null && typeof result === 'object' && 'error' in result) {
        const error = result.error as { message?: string; statusCode?: number };
        dispatch(
          openModal({
            id: 'create-tour-error',
            type: 'confirm',
            title: t('common.error'),
            isOpen: true,
            data: {
              message: error.message ?? t('tours.createTourError'),
              icon: 'alert',
            },
          })
        );
        return;
      }

      // Success
      dispatch(closeModal('create-tour'));
      if (onSuccess !== undefined) {
        onSuccess();
      }

      dispatch(
        openModal({
          id: 'create-tour-success',
          type: 'confirm',
          title: t('common.success'),
          isOpen: true,
          data: {
            message: t('tours.createTourSuccess'),
            icon: 'success',
          },
        })
      );
    } catch (error) {
      console.error('Error creating tour:', error);
      dispatch(
        openModal({
          id: 'create-tour-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: {
            message: t('tours.createTourError'),
            icon: 'alert',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with confirmation
  const handleRequestClose = (): void => {
    // Check if form has been modified
    const defaultData = getDefaultFormData();
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(defaultData);

    if (hasChanges) {
      setShowCloseConfirmation(true);
    } else {
      handleConfirmClose();
    }
  };

  // Confirm close and reset form
  const handleConfirmClose = (): void => {
    resetForm();
    setShowCloseConfirmation(false);
    dispatch(closeModal('create-tour'));
    if (onClose) {
      onClose();
    }
  };

  // Cancel close and return to form
  const handleCancelClose = (): void => {
    setShowCloseConfirmation(false);
  };

  if (!isOpen) {
    return null;
  }

  // Close confirmation modal
  if (showCloseConfirmation) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '450px',
            width: '100%',
            padding: 'var(--space-6)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div style={{ fontSize: 34 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {t('common.confirmClose') || '¿Estás seguro?'}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  color: 'var(--color-neutral-600)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {t('common.unsavedChangesWarning') || 'Los cambios no guardados se perderán.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              onClick={handleCancelClose}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-neutral-200)',
                color: 'var(--color-neutral-700)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              {t('common.continueEditing') || 'Continuar editando'}
            </button>
            <button
              type="button"
              onClick={handleConfirmClose}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-error-500)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              {t('common.discardChanges') || 'Descartar cambios'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.currentTarget === e.target) {
          handleRequestClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--space-8)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header with title and close button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-neutral-900)',
              margin: 0,
            }}
          >
            {mode === 'edit'
              ? t('tours.editTourTitle') || 'Editar Tour'
              : t('tours.createTourTitle')}
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-neutral-500)',
              padding: 'var(--space-1)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s, background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-700)';
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--color-neutral-500)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label={t('common.close') || 'Cerrar'}
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* User/Provider Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.provider')} {isAdmin && <span style={{ color: 'red' }}>*</span>}
              </label>
              {isAdmin ? (
                // Admin: Show user selector dropdown using Select component
                <>
                  <Select
                    options={[
                      { value: '', label: t('common.selectProvider') || 'Seleccionar proveedor' },
                      ...users.map((user) => ({
                        value: user.id,
                        label: `${user.name} (${user.email})`,
                      })),
                    ]}
                    value={formData.userId}
                    onChange={(value: string) => {
                      setFormData((prev) => ({ ...prev, userId: value }));
                      if (errors.userId !== undefined) {
                        setErrors((prev) => ({ ...prev, userId: undefined }));
                      }
                    }}
                    placeholder={t('common.selectProvider') || 'Seleccionar proveedor'}
                    id="select-user-provider"
                  />
                  {errors.userId !== undefined && (
                    <span
                      style={{
                        color: 'red',
                        fontSize: 'var(--text-xs)',
                        marginTop: 'var(--space-1)',
                        display: 'block',
                      }}
                    >
                      {errors.userId}
                    </span>
                  )}
                </>
              ) : (
                // Non-admin: Show current user name (readonly)
                <>
                  <input
                    type="text"
                    value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: 'var(--space-2)',
                      border: '1px solid var(--color-neutral-300)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-neutral-100)',
                      color: 'var(--color-neutral-600)',
                    }}
                  />
                  <input type="hidden" name="userId" value={formData.userId} />
                </>
              )}
            </div>

            {/* Category */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.category')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: t('tours.selectCategory') || 'Seleccionar categoría' },
                  ...categories.map((cat: Category) => ({
                    value: cat.id,
                    label: cat.name_es,
                  })),
                ]}
                value={formData.categoryId}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, categoryId: value }));
                  if (errors.categoryId !== undefined) {
                    setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }
                }}
                placeholder={t('tours.selectCategory') || 'Seleccionar categoría'}
                id="select-category"
              />
              {errors.categoryId !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.categoryId}
                </span>
              )}
            </div>

            {/* City */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.city')} <span style={{ color: 'red' }}>*</span>
              </label>
              <Select
                options={[
                  { value: '', label: t('common.selectCity') || 'Seleccionar ciudad' },
                  ...translatedCities.map((city: TranslatedCity) => ({
                    value: city.id,
                    label: city.name,
                  })),
                ]}
                value={formData.cityId}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, cityId: value }));
                  if (errors.cityId !== undefined) {
                    setErrors((prev) => ({ ...prev, cityId: undefined }));
                  }
                }}
                placeholder={t('common.selectCity') || 'Seleccionar ciudad'}
                id="select-city-modal"
              />
              {errors.cityId !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.cityId}
                </span>
              )}
            </div>

            {/* Grid Layout for Translatable and Numeric Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {/* Title Spanish */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.title')} (ES) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="titleEs"
                  value={formData.titleEs}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.titleEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.titleEs !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.titleEs}</span>
                )}
              </div>

              {/* Title English */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.title')} (EN) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="titleEn"
                  value={formData.titleEn}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.titleEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.titleEn !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.titleEn}</span>
                )}
              </div>

              {/* Short Description Spanish */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.shortDescription')} (ES) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="shortDescriptionEs"
                  value={formData.shortDescriptionEs}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.shortDescriptionEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.shortDescriptionEs !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.shortDescriptionEs}
                  </span>
                )}
              </div>

              {/* Short Description English */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.shortDescription')} (EN) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="shortDescriptionEn"
                  value={formData.shortDescriptionEn}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.shortDescriptionEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.shortDescriptionEn !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.shortDescriptionEn}
                  </span>
                )}
              </div>

              {/* Description Spanish (Full Width within grid but spans 2 columns) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.description')} (ES) <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  name="descriptionEs"
                  value={formData.descriptionEs}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.descriptionEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    resize: 'vertical',
                  }}
                />
                {errors.descriptionEs !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.descriptionEs}
                  </span>
                )}
              </div>

              {/* Description English (Full Width within grid but spans 2 columns) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.description')} (EN) <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  name="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.descriptionEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    resize: 'vertical',
                  }}
                />
                {errors.descriptionEn !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.descriptionEn}
                  </span>
                )}
              </div>

              {/* Duration */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.duration')} (hours) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min={1}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.duration !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.duration !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.duration}
                  </span>
                )}
              </div>

              {/* Max Capacity */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.maxCapacity')} <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="maxCapacity"
                  value={formData.maxCapacity}
                  onChange={handleInputChange}
                  min={1}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.maxCapacity !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.maxCapacity !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.maxCapacity}
                  </span>
                )}
              </div>

              {/* Base Price */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.basePrice')} (MXN) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  min={0}
                  step={0.01}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.basePrice !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.basePrice !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.basePrice}
                  </span>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.difficulty')}
                </label>
                <Select
                  options={[
                    { value: 'easy', label: t('tours.difficultyEasy') || 'Fácil' },
                    { value: 'medium', label: t('tours.difficultyMedium') || 'Media' },
                    { value: 'hard', label: t('tours.difficultyHard') || 'Difícil' },
                  ]}
                  value={formData.difficulty}
                  onChange={(value: string) => {
                    setFormData((prev) => ({
                      ...prev,
                      difficulty: value as 'easy' | 'medium' | 'hard',
                    }));
                  }}
                  placeholder={t('tours.selectDifficulty') || 'Seleccionar dificultad'}
                  id="select-difficulty"
                />
              </div>
            </div>

            {/* Languages */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.languages')} <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <input
                    type="checkbox"
                    checked={formData.language.includes('es')}
                    onChange={() => {
                      handleLanguageToggle('es');
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Español</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <input
                    type="checkbox"
                    checked={formData.language.includes('en')}
                    onChange={() => {
                      handleLanguageToggle('en');
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>English</span>
                </label>
              </div>
              {errors.language !== undefined && (
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.language}</span>
              )}
            </div>

            {/* Images - Upload Style */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.additionalImages')} <span style={{ color: 'red' }}>*</span>
              </label>

              {/* Image URL inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {imageInputs.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, position: 'relative' }}>
                      {img && (
                        <div
                          style={{
                            position: 'relative',
                            display: 'flex',
                            gap: 'var(--space-2)',
                            alignItems: 'center',
                            padding: 'var(--space-2)',
                            backgroundColor: 'var(--color-neutral-50)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-neutral-200)',
                          }}
                        >
                          <img
                            src={img}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '48px',
                              height: '48px',
                              objectFit: 'cover',
                              borderRadius: 'var(--radius-sm)',
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <input
                            type="url"
                            value={img}
                            onChange={(e) => {
                              handleImageChange(index, e.target.value);
                            }}
                            placeholder="https://..."
                            style={{
                              flex: 1,
                              padding: 'var(--space-2)',
                              border: '1px solid var(--color-neutral-300)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-sm)',
                            }}
                          />
                        </div>
                      )}
                      {!img && (
                        <input
                          type="url"
                          value={img}
                          onChange={(e) => {
                            handleImageChange(index, e.target.value);
                          }}
                          placeholder={t('tours.imageUrl') || 'URL de la imagen (https://...)'}
                          style={{
                            width: '100%',
                            padding: 'var(--space-2)',
                            border:
                              errors.images !== undefined
                                ? '1px solid red'
                                : '1px solid var(--color-neutral-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-sm)',
                          }}
                        />
                      )}
                    </div>
                    {imageInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          removeImageInput(index);
                        }}
                        style={{
                          padding: 'var(--space-2)',
                          backgroundColor: 'var(--color-error-50)',
                          color: 'var(--color-error-600)',
                          border: '1px solid var(--color-error-200)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-100)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                        }}
                        title={t('common.delete') || 'Eliminar'}
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add image button */}
              <button
                type="button"
                onClick={() => {
                  addImageInput();
                }}
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-4)',
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-600)',
                  border: '1px dashed var(--color-primary-300)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                }}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t('tours.addImage')}
              </button>

              {errors.images !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.images}
                </span>
              )}
            </div>

            {/* Active */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  style={{ cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.isActive')}
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                justifyContent: 'flex-end',
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--color-neutral-200)',
              }}
            >
              <button
                type="button"
                onClick={handleRequestClose}
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-6)',
                  backgroundColor: 'var(--color-neutral-200)',
                  color: 'var(--color-neutral-700)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-6)',
                  backgroundColor: isSubmitting
                    ? 'var(--color-neutral-400)'
                    : 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {isSubmitting
                  ? t('common.saving')
                  : mode === 'edit'
                    ? t('common.save') || 'Guardar'
                    : t('tours.createTour')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
