import React from 'react';
import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { createTourBusiness } from '~/server/businessLogic/toursBusinessLogic';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { selectCategories, type Category } from '~/store/slices/categoriesSlice';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { openModal, closeModal } from '~/store/slices/uiSlice';

// Type definitions
interface CreateTourModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
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

export function CreateTourModal({ isOpen, onSuccess }: CreateTourModalProps): JSX.Element | null {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const categories = useAppSelector(selectCategories);
  const rawCities = useAppSelector(selectCities);

  const [formData, setFormData] = useState<TourFormData>({
    userId: currentUser?.id ?? '',
    categoryId: '',
    cityId: '',
    titleEs: '',
    titleEn: '',
    descriptionEs: '',
    descriptionEn: '',
    shortDescriptionEs: '',
    shortDescriptionEn: '',
    duration: 1,
    maxCapacity: 1,
    basePrice: 0,
    currency: 'MXN',
    imageUrl: '',
    images: [''],
    difficulty: 'easy',
    language: ['es'],
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TourFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInputs, setImageInputs] = useState<string[]>(['']);

  // Translated cities
  const translatedCities = translateCities(rawCities, 'es');

  // Update userId when currentUser changes
  useEffect(() => {
    if (currentUser?.id !== undefined && currentUser?.id !== null) {
      setFormData((prev) => ({ ...prev, userId: currentUser.id }));
    }
  }, [currentUser?.id]);

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
    if (!formData.imageUrl) newErrors.imageUrl = t('tours.imageUrlRequired');
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
        imageUrl: formData.imageUrl,
        images: formData.images.filter((img) => img.trim() !== ''),
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.currentTarget === e.target) {
          dispatch(closeModal('create-tour'));
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--space-6)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-6)',
            color: 'var(--color-neutral-900)',
          }}
        >
          {t('tours.createTourTitle')}
        </h2>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* User ID - Read-only */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.userId')}
              </label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
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
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  border:
                    errors.categoryId !== undefined
                      ? '1px solid red'
                      : '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <option value="">{t('tours.selectCategory')}</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_es}
                  </option>
                ))}
              </select>
              {errors.categoryId !== undefined && (
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>
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
              <select
                name="cityId"
                value={formData.cityId}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  border:
                    errors.cityId !== undefined
                      ? '1px solid red'
                      : '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <option value="">{t('common.selectCity')}</option>
                {translatedCities.map((city: TranslatedCity) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.cityId !== undefined && (
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.cityId}</span>
              )}
            </div>

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

            {/* Description Spanish */}
            <div>
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

            {/* Description English */}
            <div>
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
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.duration}</span>
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
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.basePrice}</span>
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
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  border: '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <option value="easy">{t('tours.difficultyEasy')}</option>
                <option value="medium">{t('tours.difficultyMedium')}</option>
                <option value="hard">{t('tours.difficultyHard')}</option>
              </select>
            </div>

            {/* Languages */}
            <div>
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

            {/* Image URL */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.imageUrl')} <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  border:
                    errors.imageUrl !== undefined
                      ? '1px solid red'
                      : '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              {errors.imageUrl !== undefined && (
                <span style={{ color: 'red', fontSize: 'var(--text-xs)' }}>{errors.imageUrl}</span>
              )}
            </div>

            {/* Additional Images */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                }}
              >
                {t('tours.additionalImages')}
              </label>
              {imageInputs.map((img, index) => (
                <div
                  key={index}
                  style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input
                    type="url"
                    value={img}
                    onChange={(e) => {
                      handleImageChange(index, e.target.value);
                    }}
                    style={{
                      flex: 1,
                      padding: 'var(--space-2)',
                      border: '1px solid var(--color-neutral-300)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                  {imageInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeImageInput(index);
                      }}
                      style={{
                        padding: 'var(--space-2) var(--space-4)',
                        backgroundColor: 'var(--color-error-500)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      {t('common.remove')}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  addImageInput();
                }}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                {t('tours.addImage')}
              </button>
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
              }}
            >
              <button
                type="button"
                onClick={() => {
                  dispatch(closeModal('create-tour'));
                }}
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  backgroundColor: 'var(--color-neutral-200)',
                  color: 'var(--color-neutral-700)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  backgroundColor: isSubmitting
                    ? 'var(--color-neutral-400)'
                    : 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {isSubmitting ? t('common.saving') : t('tours.createTour')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
