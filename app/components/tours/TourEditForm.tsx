/**
 * Tour Edit Form Component
 * Complete form for editing all tour information
 */

import React, { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import type { Tour, Language } from '~/types/PayloadTourDataProps';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { selectCategories, type Category } from '~/store/slices/categoriesSlice';
import { selectLanguage } from '~/store/slices/uiSlice';
import { selectSelectedCurrencyCode } from '~/store/slices/countriesSlice';
import { setGlobalLoading, openModal } from '~/store/slices/uiSlice';
import Select from '~/components/ui/Select';
import { Button } from '~/components/ui/Button';

// Translation API function using LibreTranslate (free)
async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string
): Promise<string> {
  try {
    // Using LibreTranslate API (free and open source)
    const response = await window.fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = (await response.json()) as { translatedText: string };
    return data.translatedText;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Translation error:', error.message);
    } else {
      console.error('Translation error:', error);
    }
    return text; // Return original text if translation fails
  }
}

// Generate time slots from 12:00 AM to 11:00 PM

// Hardcoded options (will be replaced with API calls later)
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

interface TourEditFormProps {
  tourId: string;
  initialTourData?: Partial<Tour> | null;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function TourEditForm({
  tourId,
  initialTourData,
  onSave,
  onCancel,
}: TourEditFormProps): JSX.Element {
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector(selectLanguage) as Language;
  const currencyCode = useAppSelector(selectSelectedCurrencyCode);
  const rawCities = useAppSelector(selectCities);
  const cities = translateCities(
    rawCities.filter((city) => city.isActive === true),
    currentLanguage
  );
  const categories = useAppSelector(selectCategories);

  // State for tour data
  const [tourData, setTourData] = useState<Partial<Tour>>({});
  const [originalData, setOriginalData] = useState<Partial<Tour>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Multi-select states
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [selectedIncluded, setSelectedIncluded] = useState<Record<string, boolean>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['es']);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);

  // Images state
  const [newImages, setNewImages] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Time slots
  const [activityTimes, setActivityTimes] = useState<Record<string, string>>({});

  // Track if data has been initialized to prevent re-runs
  const dataInitialized = useRef(false);

  // Load tour data - only runs once on mount if initialTourData is provided
  useEffect(() => {
    // Skip if already initialized
    if (dataInitialized.current) {
      return;
    }

    // If initialTourData is provided by loader, use it
    if (initialTourData !== null && initialTourData !== undefined) {
      const data = initialTourData;
      setTourData(data);
      setOriginalData(JSON.parse(JSON.stringify(data)) as Partial<Tour>); // Deep copy

      // Set multi-select states
      setSelectedActivities(
        Array.isArray(data.activities) ? data.activities.map((a) => a.activityId ?? '') : []
      );
      setSelectedAmenities(
        Array.isArray(data.amenities) ? data.amenities.map((a) => a.amenityId ?? '') : []
      );
      setSelectedRequirements(
        Array.isArray(data.requirements) ? data.requirements.map((r) => r.requirementId ?? '') : []
      );
      setSelectedOffers(Array.isArray(data.offers) ? data.offers.map((o) => o.id ?? '') : []);
      setSelectedLanguages(Array.isArray(data.language) ? data.language : ['es']);

      // Set included items
      const included: Record<string, boolean> = {};
      if (Array.isArray(data.included)) {
        data.included.forEach((item) => {
          if (item.id) included[item.id] = !!item.included;
        });
      }
      setSelectedIncluded(included);

      // Set activity times
      const times: Record<string, string> = {};
      if (Array.isArray(data.activities)) {
        data.activities.forEach((activity) => {
          if (activity.id) {
            times[activity.id] = activity.hora ?? '09:00';
          }
        });
      }
      setActivityTimes(times);
      setLoading(false);
      dataInitialized.current = true;
      return;
    }

    // Otherwise, load data directly from API (only if no initialTourData)
    async function loadTourData(): Promise<void> {
      dispatch(setGlobalLoading({ isLoading: true, message: 'Cargando tour...' }));
      try {
        const response = await window.fetch(`http://localhost:3000/api/tours/${tourId}`, {
          headers: {
            'X-Language': currentLanguage,
            'X-Currency': 'MXN',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load tour');
        }

        const result = (await response.json()) as { success: boolean; data: Partial<Tour> };
        if (result.success === true && result.data !== undefined) {
          const data = result.data;
          setTourData(data);
          setOriginalData(JSON.parse(JSON.stringify(data)) as Partial<Tour>); // Deep copy

          // Set multi-select states
          setSelectedActivities(
            Array.isArray(data.activities) ? data.activities.map((a) => a.activityId ?? '') : []
          );
          setSelectedAmenities(
            Array.isArray(data.amenities) ? data.amenities.map((a) => a.amenityId ?? '') : []
          );
          setSelectedRequirements(
            Array.isArray(data.requirements)
              ? data.requirements.map((r) => r.requirementId ?? '')
              : []
          );
          setSelectedOffers(Array.isArray(data.offers) ? data.offers.map((o) => o.id ?? '') : []);
          setSelectedLanguages(Array.isArray(data.language) ? data.language : ['es']);

          // Set included items
          const included: Record<string, boolean> = {};
          if (Array.isArray(data.included)) {
            data.included.forEach((item) => {
              if (item.id) included[item.id] = !!item.included;
            });
          }
          setSelectedIncluded(included);

          // Set activity times
          const times: Record<string, string> = {};
          if (Array.isArray(data.activities)) {
            data.activities.forEach((activity) => {
              if (activity.id) {
                times[activity.id] = activity.hora ?? '09:00';
              }
            });
          }
          setActivityTimes(times);
          dataInitialized.current = true;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error loading tour:', error.message);
        } else {
          console.error('Error loading tour:', error);
        }
        dispatch(
          openModal({
            id: 'error-load-tour',
            type: 'confirm',
            title: 'Error',
            isOpen: true,
            data: { message: 'Failed to load tour data', icon: 'error' },
          })
        );
      } finally {
        setLoading(false);
        dispatch(setGlobalLoading({ isLoading: false }));
      }
    }

    void loadTourData();
  }, []); // Empty deps - only run once on mount

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (newImages.length + files.length > 10) {
      dispatch(
        openModal({
          id: 'max-images',
          type: 'confirm',
          title: 'Error',
          isOpen: true,
          data: { message: 'Maximum 10 images allowed', icon: 'error' },
        })
      );
      return;
    }
    setNewImages([...newImages, ...files]);
  };

  // Auto-translate function
  const autoTranslate = async (
    field: 'title' | 'description' | 'shortDescription',
    value: string
  ) => {
    const sourceLang = currentLanguage;
    const targetLang = currentLanguage === 'es' ? 'en' : 'es';

    try {
      const translated = await translateText(value, targetLang, sourceLang);
      const fieldKey = `${field}_${targetLang}` as keyof Tour;
      setTourData({
        ...tourData,
        [fieldKey]: translated,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Translation failed:', error.message);
      } else {
        console.error('Translation failed:', error);
      }
    }
  };

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'number'
        ? Number(value)
        : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value;

    setTourData({
      ...tourData,
      [name]: newValue,
    });

    // Auto-translate text fields
    if ((name === 'title_es' || name === 'title_en') && value !== originalData[name]) {
      const field = name.replace('_es', '').replace('_en', '') as 'title';
      void autoTranslate(field, value);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (tourData.cityId === undefined || tourData.cityId === '') {
      newErrors.cityId = 'City is required';
    }
    if (tourData.categoryId === undefined || tourData.categoryId === '') {
      newErrors.categoryId = 'Category is required';
    }
    if (tourData.title_es === undefined || tourData.title_es === '') {
      newErrors.title_es = 'Title (ES) is required';
    }
    if (tourData.title_en === undefined || tourData.title_en === '') {
      newErrors.title_en = 'Title (EN) is required';
    }
    if (tourData.description_es === undefined || tourData.description_es === '') {
      newErrors.description_es = 'Description (ES) is required';
    }
    if (tourData.description_en === undefined || tourData.description_en === '') {
      newErrors.description_en = 'Description (EN) is required';
    }
    if (tourData.shortDescription_es === undefined || tourData.shortDescription_es === '') {
      newErrors.shortDescription_es = 'Short description (ES) is required';
    }
    if (tourData.shortDescription_en === undefined || tourData.shortDescription_en === '') {
      newErrors.shortDescription_en = 'Short description (EN) is required';
    }
    if (tourData.duration === undefined || Number(tourData.duration) < 1) {
      newErrors.duration = 'Duration is required';
    }
    if (tourData.maxCapacity === undefined || Number(tourData.maxCapacity) < 1) {
      newErrors.maxCapacity = 'Max capacity is required';
    }
    if (tourData.basePrice === undefined || Number(tourData.basePrice) <= 0) {
      newErrors.basePrice = 'Base price is required';
    }

    // Validate images (minimum 2)
    const totalImages = (tourData.images?.length ?? 0) + newImages.length;
    if (totalImages < 2) {
      newErrors.images = 'Minimum 2 images required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save tour
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    dispatch(setGlobalLoading({ isLoading: true, message: 'Guardando tour...' }));

    try {
      // Prepare data for API
      const formData = new FormData();
      formData.append('action', 'updateTourBusiness');
      formData.append('tourId', tourId);
      formData.append(
        'data',
        JSON.stringify({
          ...tourData,
          activities: selectedActivities.map((id) => ({
            activityId: id,
            hora: activityTimes[id] ?? '09:00',
          })),
          amenities: selectedAmenities,
          requirements: selectedRequirements,
          offers: selectedOffers,
          included: Object.entries(selectedIncluded).map(([id, included]) => ({ id, included })),
          language: selectedLanguages,
        })
      );

      // Add new images
      newImages.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
      });

      await onSave();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error saving tour:', error.message);
      } else {
        console.error('Error saving tour:', error);
      }
      dispatch(
        openModal({
          id: 'error-load-tour',
          type: 'confirm',
          title: 'Error',
          isOpen: true,
          data: { message: 'Failed to load tour data', icon: 'error' },
        })
      );
      dispatch(
        openModal({
          id: 'error-save-tour',
          type: 'confirm',
          title: 'Error',
          isOpen: true,
          data: { message: 'Failed to save tour', icon: 'error' },
        })
      );
    } finally {
      setSaving(false);
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-neutral-600)' }}>
          Loading tour data...
        </div>
      </div>
    );
  }

  const allImages = [
    ...(tourData.images ?? []),
    ...newImages.map((file) => URL.createObjectURL(file)),
  ];

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Edit Tour
        </h2>
        <p style={{ color: 'var(--color-neutral-600)' }}>
          All fields are required. Minimum 2 images.
        </p>
      </div>

      {/* Image Carousel */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Images ({allImages.length} - Minimum 2)
        </label>

        {allImages.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
            <img
              src={allImages[currentImageIndex]}
              alt={`Tour image ${currentImageIndex + 1}`}
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover',
                borderRadius: 'var(--radius-lg)',
              }}
            />

            {/* Navigation arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
                  }
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: 'var(--space-3)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
                  }
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: 'var(--space-3)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                >
                  →
                </button>
              </>
            )}

            {/* Image indicators */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
              }}
            >
              {allImages.map((_, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor:
                      index === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Image upload */}
        <div>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="image-upload"
            style={{
              display: 'inline-block',
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: 'var(--color-primary-500)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            + Upload Images
          </label>
          <span
            style={{
              marginLeft: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-neutral-600)',
            }}
          >
            {newImages.length} new images selected
          </span>
        </div>

        {errors.images !== undefined && errors.images !== '' && (
          <p
            style={{
              color: 'var(--color-error-600)',
              fontSize: 'var(--text-sm)',
              marginTop: 'var(--space-1)',
            }}
          >
            {errors.images}
          </p>
        )}
      </div>

      {/* Basic Info */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Basic Information
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* City */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              City *
            </label>
            <Select
              options={[{ value: '', label: 'Select city' }].concat(
                cities.map((c: TranslatedCity) => ({ value: c.id, label: c.name }))
              )}
              value={tourData.cityId}
              onChange={(v: string) => setTourData({ ...tourData, cityId: v })}
              placeholder="Select city"
            />
            {errors.cityId !== undefined && errors.cityId !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.cityId}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Category *
            </label>
            <Select
              options={[{ value: '', label: 'Select category' }].concat(
                categories.map((c: Category) => ({ value: c.id, label: c.slug }))
              )}
              value={tourData.categoryId}
              onChange={(v: string) => setTourData({ ...tourData, categoryId: v })}
              placeholder="Select category"
            />
            {errors.categoryId !== undefined && errors.categoryId !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.categoryId}
              </p>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Difficulty
            </label>
            <Select
              options={DIFFICULTY_OPTIONS}
              value={tourData.difficulty}
              onChange={(v: string) => setTourData({ ...tourData, difficulty: v })}
            />
          </div>

          {/* Languages */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Languages
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <label
                  key={lang.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLanguages([...selectedLanguages, lang.value]);
                      } else {
                        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang.value));
                      }
                    }}
                  />
                  {lang.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Title (Auto-translated)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Spanish *
            </label>
            <input
              type="text"
              name="title_es"
              value={tourData.title_es}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.title_es !== undefined && errors.title_es !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
              placeholder="Enter title in Spanish"
            />
            {errors.title_es !== undefined && errors.title_es !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.title_es}
              </p>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              English * (Auto-translated)
            </label>
            <input
              type="text"
              name="title_en"
              value={tourData.title_en}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.title_en !== undefined && errors.title_en !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
              placeholder="Auto-translated from Spanish"
            />
            {errors.title_en !== undefined && errors.title_en !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.title_en}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Short Description */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Short Description (Auto-translated)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Spanish *
            </label>
            <input
              type="text"
              name="shortDescription_es"
              value={tourData.shortDescription_es}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.shortDescription_es !== undefined && errors.shortDescription_es !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
              placeholder="Enter short description in Spanish"
            />
            {errors.shortDescription_es !== undefined && errors.shortDescription_es !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.shortDescription_es}
              </p>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              English * (Auto-translated)
            </label>
            <input
              type="text"
              name="shortDescription_en"
              value={tourData.shortDescription_en}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.shortDescription_en !== undefined && errors.shortDescription_en !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
              placeholder="Auto-translated from Spanish"
            />
            {errors.shortDescription_en !== undefined && errors.shortDescription_en !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.shortDescription_en}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full Description */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Full Description (Auto-translated)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Spanish *
            </label>
            <textarea
              name="description_es"
              value={tourData.description_es}
              onChange={handleChange}
              rows={6}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.description_es !== undefined && errors.description_es !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                resize: 'vertical',
              }}
              placeholder="Enter full description in Spanish"
            />
            {errors.description_es !== undefined && errors.description_es !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.description_es}
              </p>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              English * (Auto-translated)
            </label>
            <textarea
              name="description_en"
              value={tourData.description_en}
              onChange={handleChange}
              rows={6}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.description_en !== undefined && errors.description_en !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
                resize: 'vertical',
              }}
              placeholder="Auto-translated from Spanish"
            />
            {errors.description_en !== undefined && errors.description_en !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.description_en}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Duration and Capacity */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Tour Details
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Duration (hours) *
            </label>
            <input
              type="number"
              name="duration"
              value={tourData.duration}
              onChange={handleChange}
              min="1"
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.duration !== undefined && errors.duration !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
            />
            {errors.duration !== undefined && errors.duration !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.duration}
              </p>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Max Capacity *
            </label>
            <input
              type="number"
              name="maxCapacity"
              value={tourData.maxCapacity}
              onChange={handleChange}
              min="1"
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.maxCapacity !== undefined && errors.maxCapacity !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
            />
            {errors.maxCapacity !== undefined && errors.maxCapacity !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.maxCapacity}
              </p>
            )}
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Base Price ({currencyCode}) *
            </label>
            <input
              type="number"
              name="basePrice"
              value={tourData.basePrice}
              onChange={handleChange}
              min="0"
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                border: `1px solid ${errors.basePrice !== undefined && errors.basePrice !== '' ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
            />
            {errors.basePrice !== undefined && errors.basePrice !== '' && (
              <p
                style={{
                  color: 'var(--color-error-600)',
                  fontSize: 'var(--text-sm)',
                  marginTop: '4px',
                }}
              >
                {errors.basePrice}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          justifyContent: 'flex-end',
          marginTop: 'var(--space-6)',
        }}
      >
        <Button onClick={onCancel} variant="secondary" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} variant="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Tour'}
        </Button>
      </div>
    </div>
  );
}
