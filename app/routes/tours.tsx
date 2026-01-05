import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { data, type LoaderFunctionArgs } from '@remix-run/node';
import type { Tour, TranslatedTour, Language } from '~/types/PayloadTourDataProps';
import { translateTours } from '~/types/PayloadTourDataProps';
import { TourCard } from '~/components/tours/TourCard';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { selectCategories, translateCategories, fetchCategoriesSuccess, type Category } from '~/store/slices/categoriesSlice';
import { selectLanguage, selectCurrency, setGlobalLoading, openModal } from '~/store/slices/uiSlice';
import toursBL from '~/server/businessLogic/toursBusinessLogic';
import categoriesBL from '~/server/businessLogic/categoriesBusinessLogic';
import { priceRangeBL } from '~/server/businessLogic/priceRangeBusinessLogic';
import { useTranslation } from '~/lib/i18n/utils';

// Loader function - runs on server
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const cityId = url.searchParams.get('cityId');
  const page = url.searchParams.get('page') || '1';
  const category = url.searchParams.get('category') || '';
  const minPrice = url.searchParams.get('minPrice') || '';
  const maxPrice = url.searchParams.get('maxPrice') || '';

  // Fetch categories
  const categoriesFormData = new FormData();
  categoriesFormData.append('action', 'getCategoriesBusiness');
  categoriesFormData.append('language', 'es');
  const categoriesResult = await categoriesBL(categoriesFormData);
  const categories = categoriesResult.success ? categoriesResult.data : [];

  // Fetch price range (based on current filters)
  const priceRangeFormData = new FormData();
  priceRangeFormData.append('action', 'getPriceRangeBusiness');
  priceRangeFormData.append('filters', JSON.stringify({
    city: cityId || '',
    category: category || '',
  }));
  priceRangeFormData.append('language', 'es');
  priceRangeFormData.append('currency', 'MXN');
  const priceRangeResult = await priceRangeBL(priceRangeFormData);
  const priceRange = priceRangeResult.success ? priceRangeResult.data : null;

  // If no cityId, return empty state with categories and price range
  if (!cityId) {
    return data({
      cityId: null,
      categories,
      priceRange,
      tours: {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      },
    });
  }

  // Build filters object
  const filters: Record<string, string | number> = {
    cityId,
    page: parseInt(page, 10),
  };

  if (category) filters.category = category;
  if (minPrice) filters.minPrice = parseInt(minPrice, 10);
  if (maxPrice) filters.maxPrice = parseInt(maxPrice, 10);

  // Call business logic to get tours
  const formData = new FormData();
  formData.append('action', 'getToursBusiness');
  formData.append('filters', JSON.stringify(filters));
  formData.append('language', 'es');

  const result = await toursBL(formData);

  if (result.success) {
    return data({
      cityId,
      categories,
      priceRange,
      tours: {
        data: result.data || [],
        pagination: result.pagination || {
          page: parseInt(page, 10),
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      },
    });
  }

  // Return empty on error
  return data({
    cityId,
    categories,
    priceRange,
    tours: {
      data: [],
      pagination: {
        page: parseInt(page, 10),
        limit: 10,
        total: 0,
        totalPages: 1,
      }
    },
  });
}

// Price range type
interface PriceRange {
  minPrice: number;
  maxPrice: number;
  currency: string;
  count: number;
}

// Helper to extract data from loader response (data() wraps differently than json())
function extractLoaderData(loaderData: unknown) {
  const raw = loaderData as { 
    data?: { 
      cityId?: string | null; 
      categories?: Category[];
      priceRange?: PriceRange | null;
      tours?: { data: Tour[]; pagination: unknown } 
    }; 
    cityId?: string | null; 
    categories?: Category[];
    priceRange?: PriceRange | null;
    tours?: { data: Tour[]; pagination: unknown } 
  };
  // data() may wrap the response in a 'data' property, or it may be direct
  return {
    cityId: raw?.data?.cityId ?? raw?.cityId ?? null,
    categories: raw?.data?.categories ?? raw?.categories ?? [],
    priceRange: raw?.data?.priceRange ?? raw?.priceRange ?? null,
    tours: raw?.data?.tours ?? raw?.tours ?? { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } }
  };
}

// Internal reusable EmptyState component
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-12)',
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-neutral-200)',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>
        {icon}
      </div>
      <h3
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-neutral-900)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h3>
      <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-4)' }}>
        {description}
      </p>
    </div>
  );
}

// Client-only component that uses Redux
function ToursClient() {
  const rawLoaderData = useLoaderData<typeof loader>();
  const loaderData = extractLoaderData(rawLoaderData);
  const dispatch = useAppDispatch();
  const rawCities = useAppSelector(selectCities);
  const categories = useAppSelector(selectCategories);
  const currentLanguage = useAppSelector(selectLanguage) as Language;
  const currentCurrency = useAppSelector(selectCurrency);
  const { t } = useTranslation();

  // Translated cities - computed from rawCities based on language
  const translatedCities = useMemo(() => {
    return translateCities(rawCities, currentLanguage);
  }, [rawCities, currentLanguage]);

  // Translated categories - computed from categories based on language
  const translatedCategories = useMemo(() => {
    return translateCategories(categories, currentLanguage);
  }, [categories, currentLanguage]);

  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State for selected filters (only sent on "Filtrar" click)
  const [selectedCityId, setSelectedCityId] = useState(searchParams.get('cityId') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  
  // Raw tours data (with both languages) - only updated on filter/pagination
  const [rawTours, setRawTours] = useState<Tour[]>(loaderData.tours?.data || []);
  
  // Translated tours - computed from rawTours based on language
  const translatedTours = useMemo(() => {
    return translateTours(rawTours, currentLanguage);
  }, [rawTours, currentLanguage]);
  
  const [pagination, setPagination] = useState(loaderData.tours?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  // Track if user changed city (to show "ready to search" state)
  const [hasCityChanged, setHasCityChanged] = useState(false);

  // Price range state
  const [priceRange, setPriceRange] = useState<PriceRange | null>(loaderData.priceRange);
  const [selectedMinPrice, setSelectedMinPrice] = useState<number>(
    searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : (loaderData.priceRange?.minPrice || 0)
  );
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(
    searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : (loaderData.priceRange?.maxPrice || 10000)
  );

  // Check if price filter should be enabled (has tours and at least city filter is applied)
  const isPriceFilterEnabled = priceRange !== null && priceRange.count > 0 && selectedCityId !== '';

  // Activate global loading on component mount, deactivate when data is ready
  useEffect(() => {
    // Activate loading on mount
    dispatch(setGlobalLoading({ isLoading: true, message: 'Cargando datos...' }));

    // Deactivate loading when categories and cities are loaded
    if (categories.length > 0 && rawCities.length > 0) {
      dispatch(setGlobalLoading({ isLoading: false }));
    }

    // Cleanup: deactivate loading on unmount
    return () => {
      dispatch(setGlobalLoading({ isLoading: false }));
    };
  }, [categories, rawCities, dispatch]);

  // Dispatch categories to Redux when loaded from server
  useEffect(() => {
    if (loaderData.categories && loaderData.categories.length > 0) {
      dispatch(fetchCategoriesSuccess(loaderData.categories));
    }
  }, [loaderData.categories, dispatch]);

  // Update price range when loader data changes
  useEffect(() => {
    if (loaderData.priceRange) {
      setPriceRange(loaderData.priceRange);
      // Only reset price values if they haven't been set by URL params
      if (!searchParams.get('minPrice')) {
        setSelectedMinPrice(loaderData.priceRange.minPrice);
      }
      if (!searchParams.get('maxPrice')) {
        setSelectedMaxPrice(loaderData.priceRange.maxPrice);
      }
    }
  }, [loaderData.priceRange, searchParams]);

  // Handle city selection change - clear tours and mark as changed
  const handleCityChange = (newCityId: string) => {
    setSelectedCityId(newCityId);
    // Clear tours when city changes (before clicking Filter)
    setRawTours([]);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    setHasCityChanged(true);
    // Reset price range when city changes
    if (priceRange) {
      setSelectedMinPrice(priceRange.minPrice);
      setSelectedMaxPrice(priceRange.maxPrice);
    }
  };

  // Update state when loaderData changes (after navigation)
  useEffect(() => {
    const extracted = extractLoaderData(rawLoaderData);
    if (extracted.tours?.data) {
      setRawTours(extracted.tours.data);
      // Reset hasCityChanged when we get new data from server
      setHasCityChanged(false);
    }
    if (extracted.tours?.pagination) {
      setPagination(extracted.tours.pagination);
    }
  }, [rawLoaderData]);

  // Check if navigation is loading
  const isLoading = navigation.state === 'loading';

  // Handle filter button click - update URL with all selected filters
  const handleFilter = () => {
    if (!selectedCityId) {
      dispatch(openModal({
        id: 'validation-select-city',
        type: 'confirm',
        title: t('validation.selectCityTitle') || t('common.notice'),
        isOpen: true,
        data: { message: t('validation.selectCity'), icon: 'alert' },
      }));
      return;
    }

    const params: Record<string, string> = {
      cityId: selectedCityId,
      page: '1',
      category: selectedCategory,
    };

    // Only include price filters if they differ from the default range
    if (priceRange) {
      if (selectedMinPrice !== priceRange.minPrice) {
        params.minPrice = selectedMinPrice.toString();
      }
      if (selectedMaxPrice !== priceRange.maxPrice) {
        params.maxPrice = selectedMaxPrice.toString();
      }
    }

    setSearchParams(params);
  };

  // Handle page change - updates URL params
  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev.entries()),
      page: newPage.toString(),
    }));
  };

  // Handle filter changes - updates URL params
  const handleFilterChange = (key: string, value: string) => {
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev.entries()),
      [key]: value,
      page: '1', // Reset to first page
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCityId('');
    setSelectedCategory('');
    // Reset price to default range
    if (priceRange) {
      setSelectedMinPrice(priceRange.minPrice);
      setSelectedMaxPrice(priceRange.maxPrice);
    }
    setSearchParams({
      cityId: '',
      page: '1',
      category: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  // Handle tour actions
  const handleViewDetails = (id: string) => {
    console.log('View tour:', id);
    // TODO: Navigate to tour details page
  };

  const handleEdit = (id: string) => {
    console.log('Edit tour:', id);
    // TODO: Navigate to edit tour page
  };

  const handleDelete = (id: string) => {
    console.log('Delete tour:', id);
    // TODO: Implement delete action
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-neutral-50)' }}>
      {/* Header and content will be rendered by Layout in root.tsx */}
      
      <main
        style={{
          paddingTop: 'var(--header-height)',
          paddingBottom: '80px',
          paddingLeft: 'var(--space-6)',
          paddingRight: 'var(--space-6)',
        }}
      >
        {/* Page Title and Stats */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('tours.sectionTitle')}
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-neutral-600)' }}>
            {t('common.total')}: {pagination.total} tours
          </p>
        </div>

        {/* Filters Section */}
        <div
          style={{
            backgroundColor: 'white',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-neutral-200)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              alignItems: 'end',
            }}
          >
            {/* City Filter - Required */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {t('tours.cityRequired')}
              </label>
              <select
                value={selectedCityId}
                onChange={(e) => handleCityChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">{t('common.selectCity')}</option>
                {translatedCities.map((city: TranslatedCity) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {t('tours.category')}
              </label>
              <select
                name="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-neutral-300)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">{t('common.allCategories')}</option>
                {translatedCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Slider Filter */}
            <div style={{ gridColumn: 'span 2' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: isPriceFilterEnabled ? 'var(--color-neutral-700)' : 'var(--color-neutral-400)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {t('tours.priceRange')} ({priceRange?.currency || 'MXN'})
                {!isPriceFilterEnabled && (
                  <span style={{ fontWeight: 'normal', marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                    ({t('tours.selectCityForPrice')})
                  </span>
                )}
              </label>
              
              {/* Price display label */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  color: isPriceFilterEnabled ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                <span>${selectedMinPrice.toLocaleString()}</span>
                <span>${selectedMaxPrice.toLocaleString()}</span>
              </div>

              {/* Dual Range Slider Container */}
              <div style={{ position: 'relative', height: '40px', opacity: isPriceFilterEnabled ? 1 : 0.5 }}>
                {/* Track background */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '6px',
                    backgroundColor: 'var(--color-neutral-200)',
                    borderRadius: '3px',
                    transform: 'translateY(-50%)',
                  }}
                />
                
                {/* Active track (highlighted range) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    height: '6px',
                    backgroundColor: isPriceFilterEnabled ? 'var(--color-primary-500)' : 'var(--color-neutral-300)',
                    borderRadius: '3px',
                    transform: 'translateY(-50%)',
                    left: priceRange ? `${((selectedMinPrice - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%` : '0%',
                    right: priceRange ? `${100 - ((selectedMaxPrice - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%` : '0%',
                  }}
                />

                {/* Min price slider */}
                <input
                  type="range"
                  min={priceRange?.minPrice || 0}
                  max={priceRange?.maxPrice || 10000}
                  value={selectedMinPrice}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (value < selectedMaxPrice) {
                      setSelectedMinPrice(value);
                    }
                  }}
                  disabled={!isPriceFilterEnabled}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: '100%',
                    height: '6px',
                    transform: 'translateY(-50%)',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'transparent',
                    pointerEvents: 'auto',
                    cursor: isPriceFilterEnabled ? 'pointer' : 'not-allowed',
                    zIndex: 2,
                  }}
                />

                {/* Max price slider */}
                <input
                  type="range"
                  min={priceRange?.minPrice || 0}
                  max={priceRange?.maxPrice || 10000}
                  value={selectedMaxPrice}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (value > selectedMinPrice) {
                      setSelectedMaxPrice(value);
                    }
                  }}
                  disabled={!isPriceFilterEnabled}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    width: '100%',
                    height: '6px',
                    transform: 'translateY(-50%)',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'transparent',
                    pointerEvents: 'auto',
                    cursor: isPriceFilterEnabled ? 'pointer' : 'not-allowed',
                    zIndex: 3,
                  }}
                />
              </div>

              {/* Min/Max values display */}
              {priceRange && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 'var(--space-1)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  <span>{t('tours.minPrice')}: ${priceRange.minPrice.toLocaleString()}</span>
                  <span>{t('tours.maxPrice')}: ${priceRange.maxPrice.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Filter Button */}
            <div>
              <button
                onClick={handleFilter}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                }}
              >
                {t('common.filter')}
              </button>
            </div>

            {/* Clear Filters Button */}
            <div>
              <button
                onClick={handleClearFilters}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-neutral-100)',
                  color: 'var(--color-neutral-700)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                }}
              >
                {t('common.clearFilters')}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 'var(--space-12)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid var(--color-neutral-200)',
                borderTopColor: 'var(--color-primary-500)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            ></div>
          </div>
        )}

        {/* Tours Grid */}
        {!isLoading && translatedTours.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {translatedTours.map((tour: TranslatedTour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Ready to search state - City selected but user changed it */}
        {!isLoading && translatedTours.length === 0 && selectedCityId && hasCityChanged && (
          <EmptyState
            icon="🔍"
            title={t('tours.readyToSearch')}
            description={t('tours.readyToSearchDescription')}
          />
        )}

        {/* Empty State - No tours found after search */}
        {!isLoading && translatedTours.length === 0 && selectedCityId && !hasCityChanged && (
          <EmptyState
            icon="🏛️"
            title={t('tours.noToursFound')}
            description={t('tours.adjustFilters')}
          />
        )}

        {/* Initial State - No city selected */}
        {!isLoading && translatedTours.length === 0 && !selectedCityId && (
          <EmptyState
            icon="🌍"
            title={t('tours.selectCityFirst')}
            description={t('tours.selectCityDescription')}
          />
        )}

        {/* Pagination */}
        {!isLoading && translatedTours.length > 0 && pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: pagination.page === 1 ? 'var(--color-neutral-100)' : 'white',
                color: pagination.page === 1 ? 'var(--color-neutral-400)' : 'var(--color-neutral-700)',
                border: '1px solid var(--color-neutral-300)',
                borderRadius: 'var(--radius-md)',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (pagination.page !== 1) {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor =
                  pagination.page === 1 ? 'var(--color-neutral-100)' : 'white';
              }}
            >
              {t('pagination.previous')}
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor:
                      page === pagination.page
                        ? 'var(--color-primary-500)'
                        : 'white',
                    color:
                      page === pagination.page
                        ? 'white'
                        : 'var(--color-neutral-700)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-medium)',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (page !== pagination.page) {
                      e.currentTarget.style.backgroundColor =
                        'var(--color-neutral-100)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor =
                      page === pagination.page
                        ? 'var(--color-primary-500)'
                        : 'white';
                  }}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor:
                  pagination.page === pagination.totalPages
                    ? 'var(--color-neutral-100)'
                    : 'white',
                color:
                  pagination.page === pagination.totalPages
                    ? 'var(--color-neutral-400)'
                    : 'var(--color-neutral-700)',
                border: '1px solid var(--color-neutral-300)',
                borderRadius: 'var(--radius-md)',
                cursor:
                  pagination.page === pagination.totalPages
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (pagination.page !== pagination.totalPages) {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-neutral-100)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor =
                  pagination.page === pagination.totalPages
                    ? 'var(--color-neutral-100)'
                    : 'white';
              }}
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Client-only wrapper component
function ClientOnlyTours() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return <ToursClient />;
}

export default function Tours() {
  return <ClientOnlyTours />;
}
