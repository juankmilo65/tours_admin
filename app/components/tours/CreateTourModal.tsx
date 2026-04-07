import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import {
  createTourBusiness,
  updateTourBusiness,
  uploadTourImages,
  setImageAsCover,
  deleteTourImage,
} from '~/server/businessLogic/toursBusinessLogic';
import {
  getLanguagesDropdownBusiness,
  type LanguageOption,
} from '~/server/businessLogic/languagesBusinessLogic';
import { getCancellationPoliciesBusiness } from '~/server/businessLogic/cancellationPoliciesBusinessLogic';
import type { CancellationPolicy as CancellationPolicyType } from '~/types/cancellationPolicy';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { selectCategories, type Category } from '~/store/slices/categoriesSlice';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { selectSelectedCurrencyCode } from '~/store/slices/countriesSlice';
import { openModal, closeModal, setGlobalLoading } from '~/store/slices/uiSlice';
import { getCachedLanguages, setLanguages as setLanguagesCache } from '~/store/slices/cacheSlice';
import Select from '~/components/ui/Select';
import { Dialog } from '~/components/ui/Dialog';
import { Textarea } from '~/components/ui/Textarea';
import { ActivitiesByDay } from '~/components/tours/ActivitiesByDay';
import type {
  TourDay,
  TourActivity as TourActivityType,
  TourImage,
} from '~/types/PayloadTourDataProps';

// Type definitions
interface UserDropdownOption {
  id: string;
  firstName: string;
  email: string;
  ownerKycVerified?: boolean;
}

interface ActivityDropdownOption {
  id: string;
  activityEs: string;
  activityEn: string;
}

interface ToursInfo {
  lastDateForThisTour: string; // ISO date string
  toursRelated: number;
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
  toursInfo?: ToursInfo;
}

interface TourActivity {
  activityId: string;
  activityName: string; // nombre para mostrar en la UI
  hora: string; // formato "09:00" o "09:00 AM"
  sortOrder: number; // orden en el itinerario
}

interface CancellationPolicy {
  daysBeforeTour: number;
  refundPercentage: number;
  administrativeFee: number;
  appliesToPaymentMethods: string[];
  description_es: string;
  description_en: string;
  isActive: boolean;
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
  minimumPayment: number;
  currency: string;
  imageUrl: string;
  images: File[];
  existingImages: TourImage[]; // Image objects from server (for edit mode)
  difficulty: 'easy' | 'medium' | 'hard';
  language: string[];
  activities: TourActivity[];
  days: TourDay[]; // Activities grouped by day
  isActive: boolean;
  termsConditions: { terms_conditions_es: string; terms_conditions_en: string } | null;
  cancellationPolicies: CancellationPolicy[];
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
  toursInfo,
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

  // Calculate if tour has editing restrictions based on toursInfo
  // Restrictions apply if: toursRelated > 0 AND lastDateForThisTour <= current date
  const isTourRestricted = React.useMemo(() => {
    if (!isEditMode || !toursInfo) return false;
    const currentDate = new Date();
    const lastDate = new Date(toursInfo.lastDateForThisTour);
    return toursInfo.toursRelated > 0 && lastDate <= currentDate;
  }, [isEditMode, toursInfo]);

  // Store original max capacity for validation (in edit mode with restrictions)
  const originalMaxCapacity = React.useMemo(
    () =>
      isEditMode && initialData?.maxCapacity !== undefined && initialData?.maxCapacity !== null
        ? initialData.maxCapacity
        : 0,
    [isEditMode, initialData?.maxCapacity]
  );

  // Default form data
  const getDefaultFormData = useCallback(
    (): TourFormData => ({
      userId:
        initialData?.userId !== undefined &&
        initialData?.userId !== null &&
        initialData.userId !== ''
          ? initialData.userId
          : (currentUser?.id ?? ''),
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
      minimumPayment: initialData?.minimumPayment ?? 0,
      currency: initialData?.currency ?? 'MXN',
      imageUrl: initialData?.imageUrl ?? '',
      images: initialData?.images ?? [],
      existingImages: initialData?.existingImages ?? [],
      difficulty: initialData?.difficulty ?? 'easy',
      language: initialData?.language ?? ['es'],
      activities: initialData?.activities ?? [],
      days: initialData?.days ?? [],
      isActive: initialData?.isActive ?? false,
      termsConditions: initialData?.termsConditions ?? null,
      cancellationPolicies: initialData?.cancellationPolicies ?? [],
    }),
    [initialData, currentUser?.id]
  );

  const [formData, setFormData] = useState<TourFormData>(getDefaultFormData());
  const [errors, setErrors] = useState<Partial<Record<keyof TourFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showLanguageWarningModal, setShowLanguageWarningModal] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsInputEs, setTermsInputEs] = useState('');
  const [termsInputEn, setTermsInputEn] = useState('');
  const [termsInputErrors, setTermsInputErrors] = useState<{ es?: string; en?: string }>({});
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  // Policy form state removed — will be re-added when the add-policy form is repurposed
  // Remote cancellation policies fetched from API
  const [remotePolicies, setRemotePolicies] = useState<CancellationPolicyType[]>([]);
  const [remotePoliciesLoading, setRemotePoliciesLoading] = useState(false);
  const [remotePoliciesError, setRemotePoliciesError] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    ((initialData as Record<string, unknown>)?.cancellationPolicyId as string) ?? ''
  );
  // Cover image tracking: store the image ID that should be cover
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(() => {
    const coverImage = initialData?.existingImages?.find((img: TourImage) => img.isCover);
    return coverImage?.id ?? null;
  });
  const [originalCoverId, setOriginalCoverId] = useState<string | null>(() => {
    const coverImage = initialData?.existingImages?.find((img: TourImage) => img.isCover);
    return coverImage?.id ?? null;
  });

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

  // Fetch cancellation policies when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchPolicies = async () => {
      setRemotePoliciesLoading(true);
      setRemotePoliciesError(null);
      try {
        const result = await getCancellationPoliciesBusiness(token ?? '', currentLanguage);
        if (result.success) {
          setRemotePolicies(result.data);
        } else {
          setRemotePoliciesError(result.error ?? null);
        }
      } catch (error) {
        console.error('Error fetching cancellation policies:', error);
        setRemotePoliciesError(
          currentLanguage === 'en'
            ? 'Error loading cancellation policies'
            : 'Error al cargar las políticas de cancelación'
        );
      } finally {
        setRemotePoliciesLoading(false);
      }
    };

    void fetchPolicies();
  }, [isOpen, token, currentLanguage]);

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
    setSelectedCoverId(null);
    setOriginalCoverId(null);
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
      (initialData?.userId === undefined ||
        initialData?.userId === null ||
        initialData?.userId === '')
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
    const totalImages = formData.images.length + formData.existingImages.length + files.length;
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

  // Remove existing image (calls API to delete from backend)
  const handleRemoveExistingImage = (index: number): void => {
    const removedImage = formData.existingImages[index];
    if (removedImage === undefined) return;

    // If the removed image was the selected cover, clear cover selection
    if (removedImage.id === selectedCoverId) {
      setSelectedCoverId(null);
    }

    // Remove from local state immediately for responsive UI
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
    }));

    // Call API to delete from backend
    if (tourId !== undefined && tourId !== '' && removedImage.id !== '') {
      console.warn(`🗑️ [DELETE IMAGE] tourId: ${tourId} | imageId: ${removedImage.id}`);
      console.warn(
        `🗑️ [DELETE IMAGE] curl equivalent: curl -X DELETE "BACKEND_URL/api/tours/${tourId}/images/${removedImage.id}" -H "Authorization: Bearer TOKEN"`
      );
      void deleteTourImage(tourId, removedImage.id, token ?? '').then((result) => {
        console.warn('🗑️ [DELETE IMAGE] Result:', JSON.stringify(result, null, 2));
        if (result !== null && typeof result === 'object' && 'error' in result) {
          console.error('❌ [DELETE IMAGE] Failed to delete image:', result);
          // Re-add image to state since deletion failed
          setFormData((prev) => ({
            ...prev,
            existingImages: [...prev.existingImages, removedImage],
          }));
          dispatch(
            openModal({
              id: 'delete-image-error',
              type: 'confirm',
              title: t('common.error'),
              isOpen: true,
              data: {
                message:
                  currentLanguage === 'en'
                    ? 'Failed to delete image. Please try again.'
                    : 'Error al eliminar la imagen. Intente nuevamente.',
                icon: 'alert',
              },
            })
          );
        }
      });
    }
  };

  // Handle drop zone
  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;

    // Check if adding would exceed maximum (including existing images)
    const totalImages = formData.images.length + formData.existingImages.length + files.length;
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
    // Check if removing the last language
    if (formData.language.includes(lang) && formData.language.length === 1) {
      // Show warning modal instead of removing
      setShowLanguageWarningModal(true);
      return;
    }

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
    if (formData.maxCapacity <= 0) {
      newErrors.maxCapacity = t('tours.maxCapacityRequired') ?? 'Max capacity is required';
    }
    // Validate max capacity >= original when tour is restricted
    if (isTourRestricted && formData.maxCapacity < originalMaxCapacity) {
      newErrors.maxCapacity =
        t('tours.maxCapacityCannotBeReduced') ??
        `La capacidad máxima no puede ser menor a ${originalMaxCapacity}`;
    }
    if (formData.basePrice <= 0)
      newErrors.basePrice = t('tours.basePriceRequired') ?? 'Base price is required';
    if (
      formData.minimumPayment === undefined ||
      formData.minimumPayment === null ||
      formData.minimumPayment <= 0
    )
      newErrors.minimumPayment =
        t('tours.minimumPaymentRequired') ?? 'El pago mínimo es obligatorio';
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
    const totalImages = formData.images.length + formData.existingImages.length;
    if (totalImages === 0) {
      const imagesRequiredMsg = t('tours.imagesRequired');
      newErrors.images = imagesRequiredMsg ?? 'Al menos una imagen es requerida';
    }
    if (formData.language.length === 0)
      newErrors.language = t('tours.languageRequired') ?? 'Language is required';
    if (!isEditMode && formData.termsConditions === null)
      newErrors.termsConditions =
        t('tours.tourTermsRequired') ?? 'Terms and Conditions are required';
    if (!isEditMode && selectedPolicyId === '')
      newErrors.cancellationPolicies =
        t('tours.cancellationPolicyRequired') ?? 'Cancellation policy is required';

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
        minimumPayment: formData.minimumPayment,
        currency: formData.currency,
        difficulty: formData.difficulty,
        language: formData.language,
        isActive: formData.isActive,
        ...(!isEditMode && {
          termsConditions: formData.termsConditions ?? undefined,
          cancellationPolicyId: selectedPolicyId !== '' ? selectedPolicyId : undefined,
        }),
        activities: formData.days.map((day) => ({
          day: day.day,
          activities: day.activities.map((activity) => ({
            activityId: activity.activityId,
            hora: activity.hora,
            sortOrder: activity.sortOrder,
          })),
        })),
      };

      console.warn('🚀 [SUBMIT] Step 1 — Mode:', isEditMode ? 'EDIT' : 'CREATE');
      console.warn('🚀 [SUBMIT] Payload:', JSON.stringify(payload, null, 2));
      console.warn('🚀 [SUBMIT] Images count (new):', formData.images.length);
      console.warn('🚀 [SUBMIT] Images count (existing):', formData.existingImages.length);
      console.warn('🚀 [SUBMIT] tourId:', tourId);

      let result: unknown;
      let currentTourId = tourId ?? '';

      if (isEditMode && tourId !== undefined) {
        // Update existing tour
        console.warn('📝 [SUBMIT] Calling updateTourBusiness with tourId:', tourId);
        result = await updateTourBusiness(tourId, payload, token ?? '');
        console.warn('📝 [SUBMIT] updateTourBusiness result:', JSON.stringify(result, null, 2));
      } else {
        // Create new tour
        console.warn('🆕 [SUBMIT] Calling createTourBusiness');
        result = await createTourBusiness(payload, token ?? '');
        console.warn('🆕 [SUBMIT] createTourBusiness result:', JSON.stringify(result, null, 2));
      }

      if (result !== null && typeof result === 'object' && 'error' in result) {
        const error = result.error as { message?: string; statusCode?: number };
        console.error('❌ [SUBMIT] Tour create/update returned error:', error);
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
        console.warn('🆕 [SUBMIT] New tour ID extracted:', currentTourId);

        if (currentTourId === '') {
          console.error('❌ [SUBMIT] Tour ID not returned! Full result:', result);
          throw new Error('Tour ID not returned from server');
        }
      }

      // Step 2: Upload images (only new images for edit mode)
      console.warn(
        '🖼️ [SUBMIT] Step 2 — Images check. New images:',
        formData.images.length,
        '| tourId for upload:',
        currentTourId
      );

      interface FailedImage {
        fileName: string;
        error: string;
      }
      let failedImages: FailedImage[] = [];

      if (formData.images.length > 0) {
        console.warn(
          '🖼️ [SUBMIT] Uploading',
          formData.images.length,
          'images to tour:',
          currentTourId
        );
        console.warn(
          '🖼️ [SUBMIT] Image files:',
          formData.images.map((f) => ({ name: f.name, size: f.size, type: f.type }))
        );
        // For new uploads, don't auto-set cover — let the radio button handle it
        const uploadResult = await uploadTourImages(
          currentTourId,
          formData.images,
          false,
          token ?? '',
          (progress) => {
            setUploadProgress(progress);
          }
        );

        console.warn('🖼️ [SUBMIT] Upload result:', JSON.stringify(uploadResult, null, 2));

        // Extract failed images from response
        const uploadData = uploadResult as {
          success?: boolean;
          data?: { failed?: FailedImage[] };
          error?: unknown;
        } | null;

        if (uploadData !== null && typeof uploadData === 'object') {
          // Case 1: Backend returned partial success with failed array
          if (Array.isArray(uploadData.data?.failed) && uploadData.data.failed.length > 0) {
            failedImages = uploadData.data.failed;
          }
          // Case 2: Axios error wrapper from catch block
          if ('error' in uploadData) {
            const axiosErr = uploadData.error as {
              response?: { data?: { data?: { failed?: FailedImage[] }; message?: string } };
            } | null;
            if (
              axiosErr?.response?.data?.data?.failed !== undefined &&
              Array.isArray(axiosErr.response.data.data.failed)
            ) {
              failedImages = axiosErr.response.data.data.failed;
            } else if (failedImages.length === 0) {
              // Generic upload error — no specific failed list
              const errMsg =
                axiosErr?.response?.data?.message ??
                (currentLanguage === 'en' ? 'Image upload failed' : 'Error al subir las imágenes');
              failedImages = [{ fileName: '-', error: errMsg }];
            }
          }
        }

        if (failedImages.length > 0) {
          console.error('❌ [SUBMIT] Failed images:', failedImages);
        }
      } else {
        console.warn('🖼️ [SUBMIT] No new images to upload — skipping step 2');
      }

      // Step 3: Set cover image if changed (edit mode only)
      console.warn(
        '🎨 [SUBMIT] Step 3 — Cover check. isEditMode:',
        isEditMode,
        '| selectedCoverId:',
        selectedCoverId,
        '| originalCoverId:',
        originalCoverId
      );
      if (
        isEditMode &&
        selectedCoverId !== null &&
        selectedCoverId !== originalCoverId &&
        currentTourId !== ''
      ) {
        console.warn(
          '🎨 [SUBMIT] Setting cover image:',
          selectedCoverId,
          'for tour:',
          currentTourId
        );
        const coverResult = await setImageAsCover(currentTourId, selectedCoverId, token ?? '');
        console.warn('🎨 [SUBMIT] Cover result:', JSON.stringify(coverResult, null, 2));
        if (coverResult !== null && typeof coverResult === 'object' && 'error' in coverResult) {
          console.error('❌ [SUBMIT] Cover set error:', coverResult);
        }
      }

      // Done — close modal and show result
      console.warn('✅ [SUBMIT] All steps completed. Failed images:', failedImages.length);
      dispatch(setGlobalLoading({ isLoading: false }));
      if (onClose !== undefined) {
        onClose();
      }
      if (onSuccess !== undefined) {
        onSuccess();
      }

      // Show failed images modal if any uploads failed
      if (failedImages.length > 0) {
        const failedList = failedImages.map((f) => `• ${f.fileName}: ${f.error}`).join('\n');
        dispatch(
          openModal({
            id: 'upload-images-partial-error',
            type: 'confirm',
            title:
              currentLanguage === 'en'
                ? '⚠️ Some images could not be uploaded'
                : '⚠️ Algunas imágenes no se pudieron subir',
            isOpen: true,
            data: {
              message:
                (currentLanguage === 'en'
                  ? 'The tour was saved successfully, but the following images failed:\n\n'
                  : 'El tour se guardó correctamente, pero las siguientes imágenes fallaron:\n\n') +
                failedList,
              icon: 'alert',
            },
          })
        );
      } else {
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
      }
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

  // Language warning modal
  if (showLanguageWarningModal) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10002,
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
              alignItems: 'flex-start',
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
                  color: 'var(--color-neutral-900)',
                }}
              >
                {t('common.warning') ?? 'Advertencia'}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  color: 'var(--color-neutral-600)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.5,
                }}
              >
                {t('tours.minimumOneLanguageRequired') ??
                  'No es posible dejar el tour sin un idioma seleccionado.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowLanguageWarningModal(false)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-primary-500)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'var(--font-weight-medium)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {t('common.accept') ?? 'Aceptar'}
            </button>
          </div>
        </div>
      </div>
    );
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
                        label: `${user.firstName} (${user.email})`,
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
                disabled={isTourRestricted}
              />
              {isTourRestricted && (
                <span
                  style={{
                    color: 'var(--color-neutral-500)',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                    fontStyle: 'italic',
                  }}
                >
                  {t('tours.fieldCannotBeChangedDueToBookings') ??
                    'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                </span>
              )}
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
                disabled={isTourRestricted}
              />
              {isTourRestricted && (
                <span
                  style={{
                    color: 'var(--color-neutral-500)',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                    fontStyle: 'italic',
                  }}
                >
                  {t('tours.fieldCannotBeChangedDueToBookings') ??
                    'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                </span>
              )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.titleEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.titleEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.shortDescriptionEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.shortDescriptionEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.descriptionEs !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    resize: 'vertical',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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
                  disabled={isTourRestricted}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.descriptionEn !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    resize: 'vertical',
                    backgroundColor: isTourRestricted ? 'var(--color-neutral-100)' : 'white',
                  }}
                />
                {isTourRestricted && (
                  <span
                    style={{
                      color: 'var(--color-neutral-500)',
                      fontSize: 'var(--text-xs)',
                      marginTop: 'var(--space-1)',
                      display: 'block',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('tours.fieldCannotBeChangedDueToBookings') ??
                      'Este campo no se puede modificar porque el tour tiene reservas asociadas'}
                  </span>
                )}
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

              {/* Minimum Payment */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {t('tours.minimumPayment')} ({currencyCode}){' '}
                  <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="minimumPayment"
                  value={formData.minimumPayment}
                  onChange={handleInputChange}
                  min={0}
                  step={0.01}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border:
                      errors.minimumPayment !== undefined
                        ? '1px solid red'
                        : '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                {errors.minimumPayment !== undefined && (
                  <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
                    {errors.minimumPayment}
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
                  {`(${formData.existingImages.length + formData.images.length}/${MAX_IMAGES} - ${t('tours.maxFileSize')}, ${t('tours.imageFormats')})`}
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

              {/* Existing Image previews (from server) */}
              {formData.existingImages.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <p
                    style={{
                      margin: '0 0 var(--space-2) 0',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-neutral-600)',
                    }}
                  >
                    {currentLanguage === 'es' ? 'Imágenes existentes:' : 'Existing images:'}
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {formData.existingImages.map((image, index) => {
                      const isCover = image.id === selectedCoverId;
                      return (
                        <div
                          key={`existing-${image.id}`}
                          style={{
                            position: 'relative',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            border: isCover
                              ? '2px solid var(--color-primary-500)'
                              : '2px solid var(--color-neutral-200)',
                            transition: 'border-color 0.2s ease',
                          }}
                        >
                          <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
                            <img
                              src={image.url}
                              alt={`Existing ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
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
                          {isCover && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 4,
                                left: 4,
                                backgroundColor: 'var(--color-primary-500)',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {currentLanguage === 'es' ? 'Portada' : 'Cover'}
                            </div>
                          )}
                          {/* Radio button for cover selection */}
                          <div
                            style={{
                              padding: '6px 8px',
                              backgroundColor: isCover
                                ? 'var(--color-primary-50)'
                                : 'var(--color-neutral-100)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setSelectedCoverId(image.id)}
                          >
                            <input
                              type="radio"
                              name="coverImage"
                              checked={isCover}
                              onChange={() => setSelectedCoverId(image.id)}
                              style={{ cursor: 'pointer', accentColor: 'var(--color-primary-500)' }}
                            />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: isCover ? 600 : 400,
                                color: isCover
                                  ? 'var(--color-primary-700)'
                                  : 'var(--color-neutral-600)',
                              }}
                            >
                              {currentLanguage === 'es' ? 'Portada' : 'Cover'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Image previews */}
              {formData.images.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  {formData.existingImages.length > 0 && (
                    <p
                      style={{
                        margin: '0 0 var(--space-2) 0',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-neutral-600)',
                      }}
                    >
                      {currentLanguage === 'es' ? 'Nuevas imágenes:' : 'New images:'}
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
                      const displayIndex = formData.existingImages.length + index;
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
                            #{displayIndex + 1}
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

            {/* Terms & Conditions */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                {isEditMode ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        color:
                          formData.termsConditions !== null
                            ? 'var(--color-success-600, #16a34a)'
                            : 'var(--color-neutral-500)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {formData.termsConditions !== null
                        ? `✓ ${t('tours.termsConditionsAdded') ?? 'Términos y condiciones registrados'}`
                        : (t('tours.noTermsConditions') ?? 'Sin términos y condiciones')}
                    </span>
                    {formData.termsConditions !== null && (
                      <button
                        type="button"
                        title={t('tours.viewTermsConditions') ?? 'Ver términos y condiciones'}
                        onClick={() => {
                          setTermsInputEs(formData.termsConditions?.terms_conditions_es ?? '');
                          setTermsInputEn(formData.termsConditions?.terms_conditions_en ?? '');
                          setIsTermsModalOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'none',
                          border: '1px solid var(--color-neutral-300)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          padding: '4px 10px',
                          color: 'var(--color-neutral-600)',
                          fontSize: 'var(--text-sm)',
                          gap: '4px',
                        }}
                      >
                        👁️
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTermsInputEs(formData.termsConditions?.terms_conditions_es ?? '');
                      setTermsInputEn(formData.termsConditions?.terms_conditions_en ?? '');
                      setTermsInputErrors({});
                      setIsTermsModalOpen(true);
                    }}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      backgroundColor:
                        formData.termsConditions !== null
                          ? 'var(--color-neutral-100)'
                          : 'var(--color-primary-600)',
                      color:
                        formData.termsConditions !== null ? 'var(--color-neutral-700)' : 'white',
                      border:
                        formData.termsConditions !== null
                          ? '1px solid var(--color-neutral-300)'
                          : 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {formData.termsConditions !== null
                      ? t('tours.editTermsConditions')
                      : t('tours.addTermsConditions')}
                  </button>
                )}
                {!isEditMode && formData.termsConditions !== null && (
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-success-600, #16a34a)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    ✓ {t('tours.termsConditionsAdded')}
                  </span>
                )}
              </div>
              {errors.termsConditions !== undefined && (
                <span
                  style={{
                    color: 'red',
                    fontSize: 'var(--text-xs)',
                    marginTop: 'var(--space-1)',
                    display: 'block',
                  }}
                >
                  {errors.termsConditions}
                </span>
              )}
            </div>

            {/* Active */}
            {(() => {
              const selectedUser = users.find((u) => u.id === formData.userId);
              const kycNotVerified =
                selectedUser?.ownerKycVerified !== true && formData.userId !== '';
              const isActiveDisabled =
                formData.termsConditions === null ||
                (!isEditMode && selectedPolicyId === '') ||
                kycNotVerified;
              return (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      disabled={isActiveDisabled}
                      style={{
                        cursor: isActiveDisabled ? 'not-allowed' : 'pointer',
                        opacity: isActiveDisabled ? 0.5 : 1,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-medium)',
                        color: isActiveDisabled
                          ? 'var(--color-neutral-400)'
                          : 'var(--color-neutral-700)',
                      }}
                    >
                      {t('tours.isActive')}
                    </span>
                  </label>
                  {kycNotVerified && (
                    <p
                      style={{
                        margin: 'var(--space-1) 0 0 var(--space-6)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-warning-600)',
                        lineHeight: '1.4',
                      }}
                    >
                      {t('tours.kycActiveNote')}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Terms & Conditions Dialog */}
            <Dialog
              isOpen={isTermsModalOpen}
              onClose={() => setIsTermsModalOpen(false)}
              title={
                isEditMode
                  ? (t('tours.viewTermsConditions') ?? 'Términos y Condiciones')
                  : formData.termsConditions !== null
                    ? (t('tours.editTermsConditions') ?? 'Edit Terms and Conditions')
                    : (t('tours.addTermsConditions') ?? 'Add Terms and Conditions')
              }
              size="lg"
              closeOnOverlayClick={false}
              closeOnEscape={false}
              footer={
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(false)}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      backgroundColor: 'var(--color-neutral-100)',
                      color: 'var(--color-neutral-700)',
                      border: '1px solid var(--color-neutral-300)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {t('tours.cancelTermsConditions') ?? 'Cancel'}
                  </button>
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        const newErrors: { es?: string; en?: string } = {};
                        if (termsInputEs.trim() === '') {
                          newErrors.es =
                            t('tours.termsConditionsEsRequired') ?? 'Spanish terms are required';
                        }
                        if (termsInputEn.trim() === '') {
                          newErrors.en =
                            t('tours.termsConditionsEnRequired') ?? 'English terms are required';
                        }
                        if (Object.keys(newErrors).length > 0) {
                          setTermsInputErrors(newErrors);
                          return;
                        }
                        setFormData((prev) => ({
                          ...prev,
                          termsConditions: {
                            terms_conditions_es: termsInputEs.trim(),
                            terms_conditions_en: termsInputEn.trim(),
                          },
                          isActive: prev.termsConditions === null ? false : prev.isActive,
                        }));
                        setIsTermsModalOpen(false);
                      }}
                      style={{
                        padding: 'var(--space-2) var(--space-4)',
                        backgroundColor: 'var(--color-primary-600)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {t('tours.saveTermsConditions') ?? 'Save'}
                    </button>
                  )}
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Textarea
                  label={t('tours.termsConditionsEs') ?? 'Terms and Conditions (Spanish)'}
                  rows={6}
                  value={termsInputEs}
                  onChange={(e) => {
                    if (isEditMode) return;
                    setTermsInputEs(e.target.value);
                    if (termsInputErrors.es !== undefined) {
                      setTermsInputErrors((prev) => ({ ...prev, es: undefined }));
                    }
                  }}
                  readOnly={isEditMode}
                  error={termsInputErrors.es}
                  placeholder="Escribe los términos y condiciones en español..."
                />
                <Textarea
                  label={t('tours.termsConditionsEn') ?? 'Terms and Conditions (English)'}
                  rows={6}
                  value={termsInputEn}
                  onChange={(e) => {
                    if (isEditMode) return;
                    setTermsInputEn(e.target.value);
                    if (termsInputErrors.en !== undefined) {
                      setTermsInputErrors((prev) => ({ ...prev, en: undefined }));
                    }
                  }}
                  readOnly={isEditMode}
                  error={termsInputErrors.en}
                  placeholder="Write the terms and conditions in English..."
                />
              </div>
            </Dialog>

            {/* Cancellation Policies Accordion */}
            <div
              style={{
                border: '1px solid var(--color-neutral-200)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setIsPoliciesOpen((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-neutral-50)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span
                    style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-neutral-800)',
                    }}
                  >
                    {t('tours.cancellationPolicies') ?? 'Cancellation Policies'}
                  </span>
                  {remotePolicies.length > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--color-primary-100)',
                        color: 'var(--color-primary-700)',
                        borderRadius: '9999px',
                        padding: '1px 8px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {remotePolicies.length}
                    </span>
                  )}
                  {selectedPolicyId !== '' && (
                    <span
                      style={{
                        backgroundColor: 'var(--color-success-100, #dcfce7)',
                        color: 'var(--color-success-700, #15803d)',
                        borderRadius: '9999px',
                        padding: '1px 8px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-neutral-500)' }}>
                  {isPoliciesOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Accordion Body — read-only list of remote policies */}
              {isPoliciesOpen && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    borderTop: '1px solid var(--color-neutral-200)',
                  }}
                >
                  {/* Legal immutability warning — create mode only */}
                  {!isEditMode && (
                    <div
                      role="alert"
                      style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #f59e0b',
                        borderLeft: '4px solid #d97706',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <span style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1.4 }}>⚖️</span>
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: '#92400e',
                              fontWeight: 'var(--font-weight-semibold)',
                            }}
                          >
                            {t('tours.cancellationPoliciesImmutableTitle') ??
                              'Cancellation policies are final and cannot be changed'}
                          </strong>
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-weight-semibold)',
                              color: '#92400e',
                              backgroundColor: '#fde68a',
                              border: '1px solid #f59e0b',
                              borderRadius: '9999px',
                              padding: '1px 10px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t('tours.cancellationPoliciesImmutableBadge') ??
                              'Permanent & irrevocable'}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 'var(--text-xs)',
                            color: '#78350f',
                            lineHeight: '1.6',
                          }}
                        >
                          {t('tours.cancellationPoliciesImmutableBody') ??
                            'Once the tour is created, the cancellation policies will be permanently recorded and cannot be modified or removed.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loading state */}
                  {remotePoliciesLoading && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-6)',
                        color: 'var(--color-neutral-500)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {currentLanguage === 'en'
                        ? 'Loading cancellation policies...'
                        : 'Cargando políticas de cancelación...'}
                    </div>
                  )}

                  {/* Error state */}
                  {remotePoliciesError !== null && !remotePoliciesLoading && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-4)',
                        color: 'var(--color-error-600, #dc2626)',
                        fontSize: 'var(--text-sm)',
                        backgroundColor: 'var(--color-error-50, #fef2f2)',
                        border: '1px solid var(--color-error-200, #fecaca)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {remotePoliciesError}
                    </div>
                  )}

                  {/* Empty state */}
                  {!remotePoliciesLoading &&
                    remotePoliciesError === null &&
                    remotePolicies.length === 0 && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: 'var(--space-6)',
                          color: 'var(--color-neutral-400)',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        <div style={{ marginBottom: 'var(--space-1)' }}>
                          {currentLanguage === 'en'
                            ? 'No cancellation policies configured'
                            : 'No hay políticas de cancelación configuradas'}
                        </div>
                      </div>
                    )}

                  {/* Policy dropdown selector */}
                  {!remotePoliciesLoading &&
                    remotePoliciesError === null &&
                    remotePolicies.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <label
                          htmlFor="cancellation-policy-select"
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-neutral-700)',
                          }}
                        >
                          {currentLanguage === 'en'
                            ? 'Select cancellation policy'
                            : 'Seleccionar política de cancelación'}
                        </label>
                        <select
                          id="cancellation-policy-select"
                          value={selectedPolicyId}
                          onChange={(e) => {
                            const newPolicyId = e.target.value;
                            setSelectedPolicyId(newPolicyId);
                            setErrors((prev) => ({ ...prev, cancellationPolicies: undefined }));
                            if (newPolicyId === '') {
                              setFormData((prev) => ({ ...prev, isActive: false }));
                            }
                          }}
                          disabled={isEditMode}
                          style={{
                            width: '100%',
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-neutral-300)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-neutral-800)',
                            backgroundColor: isEditMode ? 'var(--color-neutral-100)' : 'white',
                            cursor: isEditMode ? 'not-allowed' : 'pointer',
                            outline: 'none',
                            opacity: isEditMode ? 0.7 : 1,
                          }}
                        >
                          <option value="">
                            {currentLanguage === 'en'
                              ? '-- Select a policy --'
                              : '-- Seleccionar una política --'}
                          </option>
                          {remotePolicies
                            .filter((p) => p.isActive)
                            .map((policy) => (
                              <option key={policy.id} value={policy.id}>
                                {policy.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                  {/* Selected policy description */}
                  {(() => {
                    const selected = remotePolicies.find((p) => p.id === selectedPolicyId);
                    if (selected === undefined) return null;
                    return (
                      <>
                        {selected.description !== undefined && selected.description !== '' && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-neutral-600)',
                              fontStyle: 'italic',
                              padding: '0 var(--space-1)',
                            }}
                          >
                            {selected.description}
                          </p>
                        )}

                        {/* Tiers list */}
                        {selected.tiers.length > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-neutral-600)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {currentLanguage === 'en' ? 'Refund tiers' : 'Niveles de reembolso'}
                            </span>
                            {selected.tiers.map((tier) => (
                              <div
                                key={tier.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-2)',
                                  padding: 'var(--space-2) var(--space-3)',
                                  backgroundColor: 'var(--color-neutral-50)',
                                  border: '1px solid var(--color-neutral-200)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--text-xs)',
                                }}
                              >
                                <span
                                  style={{
                                    backgroundColor: 'var(--color-neutral-200)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '2px 8px',
                                    fontWeight: 'var(--font-weight-medium)',
                                    color: 'var(--color-neutral-700)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {tier.hoursBeforeTour >= 24
                                    ? `${Math.floor(tier.hoursBeforeTour / 24)} ${currentLanguage === 'en' ? 'days' : 'días'}`
                                    : `${tier.hoursBeforeTour} ${currentLanguage === 'en' ? 'hours' : 'horas'}`}{' '}
                                  {currentLanguage === 'en' ? 'before' : 'antes'}
                                </span>
                                <span style={{ color: 'var(--color-neutral-400)' }}>→</span>
                                <span
                                  style={{
                                    backgroundColor:
                                      tier.refundPercentage > 50
                                        ? 'var(--color-success-100, #dcfce7)'
                                        : tier.refundPercentage > 0
                                          ? 'var(--color-warning-100, #fef9c3)'
                                          : 'var(--color-error-100, #fef2f2)',
                                    color:
                                      tier.refundPercentage > 50
                                        ? 'var(--color-success-700, #15803d)'
                                        : tier.refundPercentage > 0
                                          ? 'var(--color-warning-700, #a16207)'
                                          : 'var(--color-error-700, #b91c1c)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '2px 8px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                  }}
                                >
                                  {tier.refundPercentage}%{' '}
                                  {currentLanguage === 'en' ? 'refund' : 'reembolso'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: 'var(--space-3)',
                              backgroundColor: 'var(--color-error-50, #fef2f2)',
                              border: '1px solid var(--color-error-200, #fecaca)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-error-700, #b91c1c)',
                              fontWeight: 'var(--font-weight-medium)',
                              textAlign: 'center',
                            }}
                          >
                            {currentLanguage === 'en'
                              ? 'No refund — non-refundable policy'
                              : 'Sin reembolso — política no reembolsable'}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
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
            {Object.values(errors).some((v) => v !== undefined && v !== '') && (
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
