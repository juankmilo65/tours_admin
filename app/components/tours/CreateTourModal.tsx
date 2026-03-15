import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import {
  createTourBusiness,
  updateTourBusiness,
  uploadTourImages,
} from '~/server/businessLogic/toursBusinessLogic';
import {
  getLanguagesDropdownBusiness,
  type LanguageOption,
} from '~/server/businessLogic/languagesBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { selectCategories, type Category } from '~/store/slices/categoriesSlice';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { selectSelectedCurrencyCode } from '~/store/slices/countriesSlice';
import { openModal, closeModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { getCachedLanguages, setLanguages as setLanguagesCache } from '~/store/slices/cacheSlice';
import Select from '~/components/ui/Select';
import { ActivitiesByDay } from '~/components/tours/ActivitiesByDay';
import type { TourDay, TourActivity as TourActivityType } from '~/types/PayloadTourDataProps';

// Type definitions
interface UserDropdownOption {
  id: string;
  name: string;
  email: string;
}

interface ActivityDropdownOption {
  id: string;
  activityEs: string;
  activityEn: string;
}

interface CreateTourModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
  users?: UserDropdownOption[];
  activities?: ActivityDropdownOption[];
  mode?: 'create' | 'edit';
  tourId?: string;
  initialData?: Partial<TourFormData>;
}

interface TourActivity {
  activityId: string;
  activityName: string; // nombre para mostrar en la UI
  hora: string; // formato "09:00" o "09:00 AM"
  sortOrder: number; // orden en el itinerario
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
  duration: string;
  maxCapacity: number;
  basePrice: number;
  currency: string;
  imageUrl: string;
  images: File[];
  existingImageUrls: string[]; // URLs of existing images (for edit mode)
  difficulty: 'easy' | 'medium' | 'hard';
  language: string[];
  activities: TourActivity[];
  days: TourDay[]; // Activities grouped by day
  isActive: boolean;
}

// Image file with preview
interface ImageFile extends File {
  preview: string;
  id: string;
}

// Constants
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export function CreateTourModal({
  isOpen,
  onSuccess,
  onClose,
  users = [],
  activities = [],
  mode = 'create',
  tourId,
  initialData,
}: CreateTourModalProps): JSX.Element | null {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const categories = useAppSelector(selectCategories);
  const rawCities = useAppSelector(selectCities);
  const currentLanguage = useAppSelector((state) => state.ui.language);
  const currencyCode = useAppSelector(selectSelectedCurrencyCode);

  // Get cached languages for current language
  const cachedLanguages = useAppSelector(getCachedLanguages(currentLanguage));

  // Determine if we're in edit mode
  const isEditMode = mode === 'edit';

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
      duration: initialData?.duration ?? '1 hour',
      maxCapacity: initialData?.maxCapacity ?? 1,
      basePrice: initialData?.basePrice ?? 0,
      currency: initialData?.currency ?? 'MXN',
      imageUrl: initialData?.imageUrl ?? '',
      images: initialData?.images ?? [],
      existingImageUrls: initialData?.existingImageUrls ?? [],
      difficulty: initialData?.difficulty ?? 'easy',
      language: initialData?.language ?? ['es'],
      activities: initialData?.activities ?? [],
      days: initialData?.days ?? [],
      isActive: initialData?.isActive ?? true,
    }),
    [initialData, currentUser?.id]
  );

  const [formData, setFormData] = useState<TourFormData>(getDefaultFormData());
  const [errors, setErrors] = useState<Partial<Record<keyof TourFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [setFirstImageAsCover, setSetFirstImageAsCover] = useState(true);

  // Drag and drop state
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Available activities for ActivitiesByDay component
  const availableActivitiesForDays: TourActivityType[] = activities.map((a) => ({
    id: a.id,
    activityId: a.id,
    activity_es: a.activityEs,
    activity_en: a.activityEn,
    activity: currentLanguage === 'en' ? a.activityEn : a.activityEs,
    hora: '09:00 AM',
    sortOrder: 0,
    category: 'activity',
  }));

  // Auto-update duration based on days count
  useEffect(() => {
    const daysCount = formData.days.length;
    const newDuration = daysCount <= 1 ? `${daysCount} day` : `${daysCount} days`;
    if (formData.days.length > 0 && newDuration !== formData.duration) {
      setFormData((prev) => ({ ...prev, duration: newDuration }));
    }
  }, [formData.days, formData.duration]);

  // Fetch languages on mount with caching
  useEffect(() => {
    // If already cached, set languages immediately
    if (cachedLanguages !== undefined) {
      setLanguages(cachedLanguages);
      return;
    }

    // If not in cache, fetch from API
    const fetchLanguages = async () => {
      try {
        const result = await getLanguagesDropdownBusiness(currentLanguage);
        if (result.success === true && result.data !== undefined) {
          setLanguages(result.data);
          // Save to Redux cache
          dispatch(setLanguagesCache({ language: currentLanguage, data: result.data }));
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };

    void fetchLanguages();
  }, [currentLanguage, dispatch, cachedLanguages]);

  // Translated cities
  const translatedCities = translateCities(rawCities, 'es');

  // Languages state
  const [languages, setLanguages] = useState<LanguageOption[]>([]);

  // Reset form to initial state
  const resetForm = useCallback((): void => {
    setFormData(getDefaultFormData());
    setErrors({});
    setImageErrors([]);
    setUploadProgress(0);
    setSetFirstImageAsCover(true);
    setShowCloseConfirmation(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [getDefaultFormData]);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultFormData());
    }
  }, [isOpen, getDefaultFormData]);

  // Update userId when currentUser changes (only in create mode without initialData)
  useEffect(() => {
    if (
      currentUser?.id !== undefined &&
      currentUser?.id !== null &&
      initialData?.userId === undefined
    ) {
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

  // Validate image file
  const validateImageFile = (file: File): string | null => {
    // Check format
    if (!ALLOWED_FORMATS.includes(file.type)) {
      return t('tours.invalidImageFormat') ?? 'Formato inválido. Solo se permiten JPEG, PNG y WebP';
    }

    // Check size
    if (file.size > MAX_FILE_SIZE) {
      return t('tours.imageTooLarge') ?? 'La imagen es muy grande. Máximo 5MB';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Check if adding would exceed maximum (including existing images)
    const totalImages = formData.images.length + formData.existingImageUrls.length + files.length;
    if (totalImages > MAX_IMAGES) {
      setImageErrors([t('tours.maxImagesExceeded') ?? `Máximo ${MAX_IMAGES} imágenes permitidas`]);
      return;
    }

    const newImages: ImageFile[] = [];
    const newErrors: string[] = [];

    files.forEach((file) => {
      const error = validateImageFile(file);
      if (error !== null) {
        newErrors.push(`${file.name}: ${error}`);
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      newImages.push(Object.assign(file, { preview, id: Math.random().toString(36).substr(2, 9) }));
    });

    setImageErrors(newErrors);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));

    // Clear errors.images if we have valid images
    if (newErrors.length === 0 && formData.images.length + newImages.length > 0) {
      setErrors((prev) => ({ ...prev, images: undefined }));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drag start for reordering
  const handleDragStart = (index: number): void => {
    setDraggedImageIndex(index);
  };

  // Handle drag over for reordering
  const handleDragOverImage = (e: React.DragEvent<HTMLDivElement>, index: number): void => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) return;

    const reorderedImages = [...formData.images];
    const [draggedImage] = reorderedImages.splice(draggedImageIndex, 1);

    // Ensure draggedImage exists before inserting
    if (draggedImage === undefined) return;

    reorderedImages.splice(index, 0, draggedImage);

    setFormData((prev) => ({ ...prev, images: reorderedImages }));
    setDraggedImageIndex(index);
  };

  // Handle drag end
  const handleDragEnd = (): void => {
    setDraggedImageIndex(null);
  };

  // Remove new image
  const handleRemoveImage = (index: number): void => {
    const imageToRemove = formData.images[index] as ImageFile | undefined;
    const newImages = formData.images.filter((_, i) => i !== index);

    // Revoke preview URL to avoid memory leak
    if (imageToRemove?.preview !== undefined) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  // Remove existing image URL
  const handleRemoveExistingImage = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      existingImageUrls: prev.existingImageUrls.filter((_, i) => i !== index),
    }));
  };

  // Handle drop zone
  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;

    // Check if adding would exceed maximum (including existing images)
    const totalImages = formData.images.length + formData.existingImageUrls.length + files.length;
    if (totalImages > MAX_IMAGES) {
      setImageErrors([t('tours.maxImagesExceeded') ?? `Máximo ${MAX_IMAGES} imágenes permitidas`]);
      return;
    }

    const newImages: ImageFile[] = [];
    const newErrors: string[] = [];

    files.forEach((file) => {
      const error = validateImageFile(file);
      if (error !== null) {
        newErrors.push(`${file.name}: ${error}`);
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      newImages.push(Object.assign(file, { preview, id: Math.random().toString(36).substr(2, 9) }));
    });

    setImageErrors(newErrors);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  // Activity handlers are now managed by ActivitiesByDay component

  const handleLanguageToggle = (lang: string): void => {
    setFormData((prev) => ({
      ...prev,
      language: prev.language.includes(lang)
        ? prev.language.filter((l) => l !== lang)
        : [...prev.language, lang],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TourFormData, string>> = {};

    if (!formData.userId) newErrors.userId = t('tours.userIdRequired') ?? 'User ID is required';
    if (!formData.categoryId)
      newErrors.categoryId = t('tours.categoryIdRequired') ?? 'Category is required';
    if (!formData.cityId) newErrors.cityId = t('tours.cityIdRequired') ?? 'City is required';
    if (!formData.titleEs)
      newErrors.titleEs = t('tours.titleEsRequired') ?? 'Title (ES) is required';
    if (!formData.titleEn)
      newErrors.titleEn = t('tours.titleEnRequired') ?? 'Title (EN) is required';
    if (!formData.descriptionEs)
      newErrors.descriptionEs = t('tours.descriptionEsRequired') ?? 'Description (ES) is required';
    if (!formData.descriptionEn)
      newErrors.descriptionEn = t('tours.descriptionEnRequired') ?? 'Description (EN) is required';
    if (!formData.shortDescriptionEs)
      newErrors.shortDescriptionEs =
        t('tours.shortDescriptionEsRequired') ?? 'Short description (ES) is required';
    if (!formData.shortDescriptionEn)
      newErrors.shortDescriptionEn =
        t('tours.shortDescriptionEnRequired') ?? 'Short description (EN) is required';
    if (formData.maxCapacity <= 0)
      newErrors.maxCapacity = t('tours.maxCapacityRequired') ?? 'Max capacity is required';
    if (formData.basePrice <= 0)
      newErrors.basePrice = t('tours.basePriceRequired') ?? 'Base price is required';
    // Validate that at least 1 day exists
    if (formData.days.length === 0) {
      newErrors.activities = t('tours.daysMinRequired') ?? 'Se requiere al menos un día';
    } else {
      // Validate that at least 1 activity is provided across all days
      const totalActivities = formData.days.reduce((sum, day) => sum + day.activities.length, 0);
      if (totalActivities < 1) {
        newErrors.activities =
          t('tours.activitiesMinRequired') ?? 'Se requiere al menos una actividad';
      } else {
        // Validate that NO day is empty (all days must have at least 1 activity)
        const emptyDay = formData.days.find((day) => day.activities.length === 0);
        if (emptyDay) {
          const msg =
            t('tours.emptyDaysNotAllowed') ??
            `All days must have at least one activity. Day ${emptyDay.day} is empty.`;
          newErrors.activities = msg.replace('{day}', String(emptyDay.day));
        }
      }
    }
    // Validate that at least one image is provided (new or existing)
    const totalImages = formData.images.length + formData.existingImageUrls.length;
    if (totalImages === 0) {
      const imagesRequiredMsg = t('tours.imagesRequired');
      newErrors.images = imagesRequiredMsg ?? 'Al menos una imagen es requerida';
    }
    if (formData.language.length === 0)
      newErrors.language = t('tours.languageRequired') ?? 'Language is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      window.setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    // Show global spinner
    dispatch(
      setGlobalLoading({
        isLoading: true,
        message: isEditMode ? t('tours.updatingTour') : t('tours.creatingTour'),
      })
    );

    try {
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
        maxCapacity: formData.maxCapacity,
        basePrice: formData.basePrice,
        currency: formData.currency,
        difficulty: formData.difficulty,
        language: formData.language,
        isActive: formData.isActive,
        activities: formData.days.map((day) => ({
          day: day.day,
          activities: day.activities.map((activity) => ({
            activityId: activity.activityId,
            hora: activity.hora,
            sortOrder: activity.sortOrder,
          })),
        })),
      };

      let result: unknown;
      let currentTourId = tourId ?? '';

      if (isEditMode && tourId !== undefined) {
        // Update existing tour
        result = await updateTourBusiness(tourId, payload, token ?? '');
      } else {
        // Create new tour
        result = await createTourBusiness(payload, token ?? '');
      }

      if (result !== null && typeof result === 'object' && 'error' in result) {
        const error = result.error as { message?: string; statusCode?: number };
        // Hide global spinner on error
        dispatch(setGlobalLoading({ isLoading: false }));
        dispatch(
          openModal({
            id: isEditMode ? 'update-tour-error' : 'create-tour-error',
            type: 'confirm',
            title: t('common.error'),
            isOpen: true,
            data: {
              message:
                error.message ??
                (isEditMode ? t('tours.updateTourError') : t('tours.createTourError')),
              icon: 'alert',
            },
          })
        );
        setIsSubmitting(false);
        return;
      }

      // For create mode, get the new tour ID
      if (!isEditMode) {
        const tourData = result as { data: { id: string } };
        currentTourId = tourData.data?.id ?? '';

        if (currentTourId === '') {
          throw new Error('Tour ID not returned from server');
        }
      }

      // Step 2: Upload images (only new images for edit mode)
      if (formData.images.length > 0) {
        const uploadResult = await uploadTourImages(
          currentTourId,
          formData.images,
          setFirstImageAsCover,
          token ?? '',
          (progress) => {
            setUploadProgress(progress);
          }
        );

        if (uploadResult !== null && typeof uploadResult === 'object' && 'error' in uploadResult) {
          const error = uploadResult.error as { message?: string };
          console.error('Error uploading images:', error);
          // Continue even if image upload fails, but warn user
        }
      }

      // Success
      dispatch(closeModal(isEditMode ? 'edit-tour' : 'create-tour'));
      if (onSuccess !== undefined) {
        onSuccess();
      }

      dispatch(
        openModal({
          id: isEditMode ? 'update-tour-success' : 'create-tour-success',
          type: 'confirm',
          title: t('common.success'),
          isOpen: true,
          data: {
            message: isEditMode ? t('tours.updateTourSuccess') : t('tours.createTourSuccess'),
            icon: 'success',
          },
        })
      );
    } catch (error) {
      console.error(isEditMode ? 'Error updating tour:' : 'Error creating tour:', error);
      // Hide global spinner on error
      dispatch(setGlobalLoading({ isLoading: false }));
      dispatch(
        openModal({
          id: isEditMode ? 'update-tour-error' : 'create-tour-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: {
            message: isEditMode ? t('tours.updateTourError') : t('tours.createTourError'),
            icon: 'alert',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      // Note: Don't hide global spinner here - on success, page reloads and handles it
      // On error, spinner is already hidden in catch block
    }
  };

  // Handle close with confirmation
  const handleRequestClose = (): void => {
    // Check if form has been modified
    // Also allow closing if form is empty (no user input)
    // Note: userId is auto-filled and not considered user input
    const isFormEmpty =
      !formData.titleEs &&
      !formData.titleEn &&
      !formData.descriptionEs &&
      !formData.descriptionEn &&
      !formData.shortDescriptionEs &&
      !formData.shortDescriptionEn &&
      formData.images.length === 0;

    const defaultData = getDefaultFormData();
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(defaultData);

    // Allow closing without confirmation if form is empty OR no changes
    if (isFormEmpty || !hasChanges) {
      handleConfirmClose();
      return;
    }

    // Show confirmation only if there are actual changes
    setShowCloseConfirmation(true);
  };

  // Confirm close and reset form
  const handleConfirmClose = (): void => {
    resetForm();
    setShowCloseConfirmation(false);
    dispatch(closeModal('create-tour'));
    if (onClose !== undefined) {
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
                {t('common.confirmClose') ?? '¿Estás seguro?'}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  color: 'var(--color-neutral-600)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {t('common.unsavedChangesWarning') ?? 'Los cambios no guardados se perderán.'}
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
              {t('common.continueEditing') ?? 'Continuar editando'}
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
              {t('common.discardChanges') ?? 'Descartar cambios'}
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
              ? (t('tours.editTourTitle') ?? 'Editar Tour')
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
            aria-label={t('common.close') ?? 'Cerrar'}
          >
            ✕
          </button>
        </div>

        <form noValidate onSubmit={(e) => void handleSubmit(e)}>
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
                      { value: '', label: t('common.selectProvider') ?? 'Seleccionar proveedor' },
                      ...users.map((user) => ({
                        value: user.id,
                        label: `${user.name} (${user.email})`,
                      })),
                    ]}
                    value={formData.userId}
                    onChange={(value: string) => {
                      if (!isEditMode) {
                        setFormData((prev) => ({ ...prev, userId: value }));
                        if (errors.userId !== undefined) {
                          setErrors((prev) => ({ ...prev, userId: undefined }));
                        }
                      }
                    }}
                    placeholder={t('common.selectProvider') ?? 'Seleccionar proveedor'}
                    id="select-user-provider"
                    disabled={isEditMode}
                  />
                  {isEditMode && (
                    <span
                      style={{
                        color: 'var(--color-neutral-500)',
                        fontSize: 'var(--text-xs)',
                        marginTop: 'var(--space-1)',
                        display: 'block',
                        fontStyle: 'italic',
                      }}
                    >
                      {t('tours.providerCannotBeChanged') ?? 'El proveedor no puede ser modificado'}
                    </span>
                  )}
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
                  { value: '', label: t('tours.selectCategory') ?? 'Seleccionar categoría' },
                  ...categories.map((cat: Category) => ({
                    value: cat.id,
                    label: currentLanguage === 'en' ? cat.name_en : cat.name_es,
                  })),
                ]}
                value={formData.categoryId}
                onChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, categoryId: value }));
                  if (errors.categoryId !== undefined) {
                    setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }
                }}
                placeholder={t('tours.selectCategory') ?? 'Seleccionar categoría'}
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
                  { value: '', label: t('common.selectCity') ?? 'Seleccionar ciudad' },
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
                placeholder={t('common.selectCity') ?? 'Seleccionar ciudad'}
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

            {/* Activities by Day */}
            <div>
              <ActivitiesByDay
                days={formData.days}
                availableActivities={availableActivitiesForDays}
                translations={{
                  activitiesByDay: t('tours.activitiesByDay'),
                  addDay: t('tours.addDay'),
                  noDaysAdded: t('tours.noDaysAdded'),
                  noDaysDescription: t('tours.noDaysDescription'),
                  dayLabel: t('tours.dayLabel'),
                  removeDay: t('tours.removeDay'),
                  addActivity: t('tours.addActivity'),
                  selectActivity: t('tours.selectActivity'),
                  noActivitiesInDay: t('tours.noActivitiesInDay'),
                  timeLabel: t('tours.timeLabel'),
                }}
                onDaysChange={(newDays) => {
                  setFormData((prev) => ({ ...prev, days: newDays }));
                  if (errors.activities !== undefined) {
                    setErrors((prev) => ({ ...prev, activities: undefined }));
                  }
                }}
                onActivityTimeChange={(dayIndex, activityId, time) => {
                  const newDays = [...formData.days];
                  const day = newDays[dayIndex];
                  if (day) {
                    const activity = day.activities.find((a) => a.id === activityId);
                    if (activity) {
                      activity.hora = time;
                    }
                  }
                  setFormData((prev) => ({ ...prev, days: newDays }));
                }}
                onRemoveActivity={(dayIndex, activityId) => {
                  const newDays = [...formData.days];
                  const day = newDays[dayIndex];
                  if (day) {
                    day.activities = day.activities.filter((a) => a.id !== activityId);
                  }
                  setFormData((prev) => ({ ...prev, days: newDays }));
                }}
                onAddDay={() => {
                  const newDay: TourDay = {
                    day: formData.days.length + 1,
                    activities: [],
                  };
                  setFormData((prev) => ({ ...prev, days: [...prev.days, newDay] }));
                }}
                onRemoveDay={(dayIndex) => {
                  const newDays = formData.days
                    .filter((_, i) => i !== dayIndex)
                    .map((d, i) => ({ ...d, day: i + 1 }));
                  setFormData((prev) => ({ ...prev, days: newDays }));
                }}
              />
              {errors.activities !== undefined && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'var(--color-error-50, #fef2f2)',
                    border: '1px solid var(--color-error-200, #fecaca)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color: 'var(--color-error-700, #b91c1c)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                  }}
                >
                  <span>⚠</span>
                  {errors.activities}
                </div>
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

              {/* Duration - Auto calculated from activities */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.duration')} <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-neutral-100)',
                    color: 'var(--color-neutral-600)',
                    cursor: 'not-allowed',
                  }}
                />
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                    fontStyle: 'italic',
                  }}
                >
                  {t('tours.durationAutoCalculated') ??
                    'Calculado automáticamente desde las actividades'}
                </span>
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
                  {t('tours.basePrice')} ({currencyCode}) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  min={0}
                  step={0.01}
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
                    { value: 'easy', label: t('tours.difficultyEasy') ?? 'Fácil' },
                    { value: 'medium', label: t('tours.difficultyMedium') ?? 'Media' },
                    { value: 'hard', label: t('tours.difficultyHard') ?? 'Difícil' },
                  ]}
                  value={formData.difficulty}
                  onChange={(value: string) => {
                    setFormData((prev) => ({
                      ...prev,
                      difficulty: value as 'easy' | 'medium' | 'hard',
                    }));
                  }}
                  placeholder={t('tours.selectDifficulty') ?? 'Seleccionar dificultad'}
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
                {languages.map((lang) => (
                  <label
                    key={lang.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.language.includes(lang.code)}
                      onChange={() => {
                        handleLanguageToggle(lang.code);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{currentLanguage === 'en' ? lang.name_en : lang.name_es}</span>
                  </label>
                ))}
              </div>
              {errors.language !== undefined && (
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.language}</span>
              )}
            </div>

            {/* Images - File Upload Style */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.images')} <span style={{ color: 'red' }}>*</span>
                <span
                  style={{
                    fontWeight: 'normal',
                    color: 'var(--color-neutral-600)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {`(${formData.existingImageUrls.length + formData.images.length}/${MAX_IMAGES} - ${t('tours.maxFileSize')}, ${t('tours.imageFormats')})`}
                </span>
              </label>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-neutral-50)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '48px', marginBottom: 'var(--space-2)' }}>📷</div>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--color-neutral-700)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {t('tours.clickOrDragImages')}
                </p>
                <p
                  style={{
                    margin: 'var(--space-1) 0 0 0',
                    color: 'var(--color-neutral-600)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {t('tours.imageFormats')}
                </p>
              </div>

              {/* Image errors */}
              {imageErrors.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2)',
                    backgroundColor: 'var(--color-error-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-error-200)',
                  }}
                >
                  {imageErrors.map((error, index) => (
                    <div
                      key={index}
                      style={{ color: 'var(--color-error-700)', fontSize: 'var(--text-sm)' }}
                    >
                      • {error}
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Image previews (from URLs) */}
              {formData.existingImageUrls.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <p
                    style={{
                      margin: '0 0 var(--space-2) 0',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-neutral-600)',
                    }}
                  >
                    Imágenes existentes:
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {formData.existingImageUrls.map((imageUrl, index) => (
                      <div
                        key={`existing-${index}`}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '2px solid var(--color-success-300)',
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`Existing ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExistingImage(index);
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                          }}
                        >
                          ×
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(34, 197, 94, 0.9)',
                            color: 'white',
                            padding: '4px 8px',
                            fontSize: '12px',
                            textAlign: 'center',
                          }}
                        >
                          {index === 0 && formData.images.length === 0
                            ? 'Portada'
                            : `#${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Image previews */}
              {formData.images.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  {formData.existingImageUrls.length > 0 && (
                    <p
                      style={{
                        margin: '0 0 var(--space-2) 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-neutral-600)',
                      }}
                    >
                      Nuevas imágenes:
                    </p>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {formData.images.map((image, index) => {
                      const displayIndex = formData.existingImageUrls.length + index;
                      return (
                        <div
                          key={(image as ImageFile).id || index}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOverImage(e, index)}
                          onDragEnd={handleDragEnd}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            border: '2px solid var(--color-neutral-200)',
                            cursor: 'move',
                          }}
                        >
                          <img
                            src={(image as ImageFile).preview}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(239, 68, 68, 0.9)',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                            }}
                          >
                            ×
                          </button>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              padding: '4px 8px',
                              fontSize: '12px',
                              textAlign: 'center',
                            }}
                          >
                            {displayIndex === 0 ? 'Portada' : `#${displayIndex + 1}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

            {/* Set first image as cover option */}
            {(formData.images.length > 0 || formData.existingImageUrls.length > 0) && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="checkbox"
                    checked={setFirstImageAsCover}
                    onChange={(e) => setSetFirstImageAsCover(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    {t('tours.setFirstImageAsCover') ?? 'Establecer primera imagen como portada'}
                  </span>
                </label>
              </div>
            )}

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

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-1)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  <span>{t('tours.uploadingImages') ?? 'Subiendo imágenes...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--color-neutral-200)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary-500)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <div
                ref={errorSummaryRef}
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-error-50, #fef2f2)',
                  border: '1px solid var(--color-error-300, #fca5a5)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 var(--space-2) 0',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-error-700, #b91c1c)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  ⚠{' '}
                  {t('tours.validationErrorsTitle') ?? 'Por favor corrige los siguientes errores:'}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 'var(--space-4)',
                    listStyleType: 'disc',
                  }}
                >
                  {Object.entries(errors).map(
                    ([key, message]) =>
                      message !== undefined && (
                        <li
                          key={key}
                          style={{
                            color: 'var(--color-error-700, #b91c1c)',
                            fontSize: 'var(--text-sm)',
                            marginBottom: 'var(--space-1)',
                          }}
                        >
                          {message}
                        </li>
                      )
                  )}
                </ul>
              </div>
            )}

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
                    ? (t('common.save') ?? 'Guardar')
                    : t('tours.createTour')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
