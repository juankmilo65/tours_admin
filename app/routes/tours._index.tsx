import type { JSX } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { data, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import type { Tour, TranslatedTour, Language } from '~/types/PayloadTourDataProps';
import { translateTours } from '~/types/PayloadTourDataProps';
import { TourCard } from '~/components/tours/TourCard';
import { CreateTourModal } from '~/components/tours/CreateTourModal';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectCities, translateCities, type TranslatedCity } from '~/store/slices/citiesSlice';
import { selectSelectedCountry } from '~/store/slices/countriesSlice';
import {
  selectCategories,
  translateCategories,
  fetchCategoriesSuccess,
  type Category,
} from '~/store/slices/categoriesSlice';
import { selectLanguage, setGlobalLoading, openModal } from '~/store/slices/uiSlice';
import type { City } from '~/server/cities';
import toursBL from '~/server/businessLogic/toursBusinessLogic';
import categoriesBL from '~/server/businessLogic/categoriesBusinessLogic';
import { priceRangeBL } from '~/server/businessLogic/priceRangeBusinessLogic';
import citiesBL from '~/server/businessLogic/citiesBusinessLogic';
import countriesBL from '~/server/businessLogic/countriesBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { useTranslation } from '~/lib/i18n/utils';
import { getSession, commitSession } from '~/utilities/sessions';
import Select from '~/components/ui/Select';

// Loader function - runs on server
export async function loader(args: LoaderFunctionArgs): Promise<ReturnType<typeof data>> {
  // Verificar autenticación
  await requireAuth(args);

  // Load session to get selected countryId
  const session = await getSession(args.request.headers.get('Cookie'));
  let selectedCountryId = session.get('selectedCountryId') as string | undefined;

  // Si no hay countryId en sesión, obtener el default (México) de los países
  // Esto sincroniza con la lógica del root.tsx loader
  if (selectedCountryId === undefined || selectedCountryId === null || selectedCountryId === '') {
    // Fetch countries to get default (Mexico)
    const countriesFormData = new FormData();
    countriesFormData.append('action', 'getCountriesBusiness');
    countriesFormData.append('language', 'es');
    const countriesResult = await countriesBL(countriesFormData);

    interface CountryData {
      id: string;
      code: string;
      name_es?: string;
      name_en?: string;
    }

    const isCountriesResult = (
      result: unknown
    ): result is { success: boolean; data: CountryData[] | null } =>
      typeof result === 'object' && result !== null && 'success' in result && 'data' in result;

    if (isCountriesResult(countriesResult) && countriesResult.success && countriesResult.data) {
      const countries = countriesResult.data;
      // Buscar México como default
      const mexicoCountry = countries.find(
        (c: CountryData) =>
          c.code === 'MX' ||
          c.name_es?.toLowerCase() === 'méxico' ||
          c.name_en?.toLowerCase() === 'mexico'
      );
      const defaultCountry = mexicoCountry ?? countries[0];

      if (defaultCountry) {
        selectedCountryId = defaultCountry.id;
        // Guardar en sesión para futuras requests
        session.set('selectedCountryId', defaultCountry.id);
        session.set('selectedCountryCode', defaultCountry.code);
      }
    }
  }

  const url = new URL(args.request.url);
  const userId = url.searchParams.get('userId') ?? null;
  const countryId = selectedCountryId ?? null; // countryId is mandatory from session
  const cityId = url.searchParams.get('cityId') ?? null; // cityId is optional filter
  const page = url.searchParams.get('page') ?? '1';
  const category = url.searchParams.get('category') ?? '';
  const minPrice = url.searchParams.get('minPrice') ?? '';
  const maxPrice = url.searchParams.get('maxPrice') ?? '';

  // Fetch categories
  const categoriesFormData = new FormData();
  categoriesFormData.append('action', 'getCategoriesBusiness');
  categoriesFormData.append('language', 'es');
  const categoriesResult = await categoriesBL(categoriesFormData);
  // Type guard for categoriesResult
  const isCategoriesResult = (
    result: unknown
  ): result is { success: boolean; data: Category[] | null } =>
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    typeof (result as { success?: boolean }).success === 'boolean' &&
    'data' in result;

  const categories: Category[] =
    isCategoriesResult(categoriesResult) &&
    categoriesResult.success === true &&
    categoriesResult.data !== null
      ? categoriesResult.data
      : [];

  // Fetch active cities - SOLO si tenemos un countryId válido
  let activeCities: City[] = [];

  if (selectedCountryId !== undefined && selectedCountryId !== null && selectedCountryId !== '') {
    const citiesFormData = new FormData();
    citiesFormData.append('action', 'getCitiesBusiness');
    citiesFormData.append(
      'filters',
      JSON.stringify({ isActive: true, countryId: selectedCountryId })
    );
    citiesFormData.append('language', 'es');
    const citiesResult = await citiesBL(citiesFormData);

    const isCitiesResult = (result: unknown): result is { success: boolean; data: City[] | null } =>
      typeof result === 'object' && result !== null && 'success' in result && 'data' in result;

    activeCities =
      isCitiesResult(citiesResult) && citiesResult.success === true && citiesResult.data !== null
        ? citiesResult.data
        : [];
  }

  // Fetch users for dropdown
  const usersResult = await getUsersDropdownBusiness(
    session.get('authToken') as string | undefined,
    'es'
  );
  const users =
    usersResult.success === true && usersResult.data !== undefined ? usersResult.data : [];

  // Fetch price range (based on current filters)
  const priceRangeFormData = new FormData();
  priceRangeFormData.append('action', 'getPriceRangeBusiness');
  priceRangeFormData.append(
    'filters',
    JSON.stringify({
      userId: userId ?? '',
      countryId: countryId ?? '',
      category: category ?? '',
    })
  );
  priceRangeFormData.append('language', 'es');
  priceRangeFormData.append('currency', 'MXN');
  const priceRangeResult = await priceRangeBL(priceRangeFormData);
  const priceRange = priceRangeResult.success === true ? priceRangeResult.data : null;

  // If no userId or countryId, return empty state with categories and price range
  if (userId === null || userId === undefined || countryId === null || countryId === undefined) {
    return data(
      {
        userId: null,
        countryId: countryId,
        cityId: null,
        categories,
        activeCities,
        users,
        priceRange,
        tours: {
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        },
      },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      }
    );
  }

  // Build filters object - userId and countryId are mandatory
  const filters: Record<string, string | number> = {
    userId: userId ?? '',
    countryId: countryId ?? '',
    page: parseInt(page, 10),
  };

  if (cityId !== null && cityId !== undefined && cityId !== '') {
    filters.cityId = cityId;
  }
  if (category !== null && category !== undefined && category !== '') {
    filters.category = category;
  }
  if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
    filters.minPrice = parseInt(minPrice, 10);
  }
  if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
    filters.maxPrice = parseInt(maxPrice, 10);
  }

  // Call business logic to get tours
  const formData = new FormData();
  formData.append('action', 'getToursBusiness');
  formData.append('filters', JSON.stringify(filters));
  formData.append('language', 'es');

  const result = await toursBL(formData);

  // Type guard for tours result
  const isToursResult = (
    toursResult: unknown
  ): toursResult is {
    success: boolean;
    data: Tour[] | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    } | null;
  } =>
    typeof toursResult === 'object' &&
    toursResult !== null &&
    'success' in toursResult &&
    typeof (toursResult as { success?: boolean }).success === 'boolean' &&
    'data' in toursResult &&
    'pagination' in toursResult;

  if (isToursResult(result) && result.success === true) {
    return data(
      {
        userId: userId,
        countryId: countryId,
        cityId: cityId,
        categories,
        activeCities,
        users,
        priceRange,
        tours: {
          data: result.data ?? [],
          pagination: result.pagination ?? {
            page: parseInt(page, 10),
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        },
      },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      }
    );
  }

  // Return empty on error
  return data(
    {
      userId,
      countryId,
      cityId,
      categories,
      activeCities,
      users,
      priceRange,
      tours: {
        data: [],
        pagination: {
          page: parseInt(page, 10),
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      },
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

// Price range type
interface PriceRange {
  minPrice: number;
  maxPrice: number;
  currency: string;
  count: number;
}

// Helper to extract data from loader response (data() wraps differently than json())
function extractLoaderData(loaderData: unknown): {
  userId: string | null;
  countryId: string | null;
  cityId: string | null;
  categories: Category[];
  activeCities: City[];
  users: Array<{ id: string; name: string; email: string }>;
  priceRange: PriceRange | null;
  tours: { data: Tour[]; pagination: unknown };
} {
  const raw = loaderData as {
    type?: string;
    data?: {
      userId?: string | null;
      countryId?: string | null;
      cityId?: string | null;
      categories?: Category[];
      activeCities?: City[];
      users?: Array<{ id: string; name: string; email: string }>;
      priceRange?: PriceRange | null;
      tours?: { data: Tour[]; pagination: unknown };
    };
    userId?: string | null;
    countryId?: string | null;
    cityId?: string | null;
    categories?: Category[];
    activeCities?: City[];
    users?: Array<{ id: string; name: string; email: string }>;
    priceRange?: PriceRange | null;
    tours?: { data: Tour[]; pagination: unknown };
  };

  const innerData = raw?.type === 'DataWithResponseInit' ? raw?.data : raw;

  return {
    userId: innerData?.userId ?? null,
    countryId: innerData?.countryId ?? null,
    cityId: innerData?.cityId ?? null,
    categories: innerData?.categories ?? [],
    activeCities: innerData?.activeCities ?? [],
    users: innerData?.users ?? [],
    priceRange: innerData?.priceRange ?? null,
    tours: innerData?.tours ?? {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    },
  };
}

// Internal reusable EmptyState component
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps): JSX.Element {
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
      <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>{icon}</div>
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
function ToursClient(): JSX.Element {
  const rawLoaderData = useLoaderData<typeof loader>();
  const loaderData = extractLoaderData(rawLoaderData);
  const dispatch = useAppDispatch();
  const rawCities = useAppSelector(selectCities);
  const categories = useAppSelector(selectCategories);
  const currentLanguage = useAppSelector(selectLanguage) as Language;
  const { t } = useTranslation();

  // Translated active cities from loader
  const translatedCities = useMemo(() => {
    return translateCities(loaderData.activeCities, currentLanguage);
  }, [loaderData.activeCities, currentLanguage]);

  // Translated categories - computed from categories based on language
  const translatedCategories = useMemo(() => {
    return translateCategories(categories, currentLanguage);
  }, [categories, currentLanguage]);

  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  // State for selected filters (only sent on "Filtrar" click)
  const [selectedUserId, setSelectedUserId] = useState<string>(searchParams.get('userId') ?? '');
  const [selectedCityId, setSelectedCityId] = useState<string>(searchParams.get('cityId') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') ?? ''
  );

  // Raw tours data (with both languages) - only updated on filter/pagination
  const [rawTours, setRawTours] = useState<Tour[]>(loaderData.tours?.data ?? []);

  // Translated tours - computed from rawTours based on language
  const translatedTours = useMemo(() => {
    return translateTours(rawTours, currentLanguage);
  }, [rawTours, currentLanguage]);

  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>(
    loaderData.tours?.pagination !== null && loaderData.tours?.pagination !== undefined
      ? (loaderData.tours.pagination as {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        })
      : {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
  );
  // Track if user has made a search (to show "no results" state)
  const [hasSearched, setHasSearched] = useState(false);

  // Track if filters have been changed but not applied
  const [filtersChanged, setFiltersChanged] = useState(false);

  // Country ID from Redux (selected from Header)
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const countryId = selectedCountry?.id ?? null;

  // Create tour modal state
  const [isCreateTourModalOpen, setIsCreateTourModalOpen] = useState(false);

  // Price range state
  const [priceRange, setPriceRange] = useState<PriceRange | null>(loaderData.priceRange);
  const [selectedMinPrice, setSelectedMinPrice] = useState<number>(
    searchParams.get('minPrice') !== null && searchParams.get('minPrice') !== ''
      ? parseInt(searchParams.get('minPrice') ?? '0', 10)
      : (loaderData.priceRange?.minPrice ?? 0)
  );
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(
    searchParams.get('maxPrice') !== null && searchParams.get('maxPrice') !== ''
      ? parseInt(searchParams.get('maxPrice') ?? '10000', 10)
      : (loaderData.priceRange?.maxPrice ?? 10000)
  );

  // City filter: enabled only if provider selected AND country exists
  const isCityFilterEnabled = selectedUserId !== '' && countryId !== null && countryId !== '';

  // Category filter: enabled only if provider selected AND country exists
  const isCategoryFilterEnabled = selectedUserId !== '' && countryId !== null && countryId !== '';

  // Price filter: enabled only if provider selected AND country exists AND price range exists
  const isPriceFilterEnabled =
    selectedUserId !== '' &&
    countryId !== null &&
    countryId !== '' &&
    priceRange !== null &&
    priceRange.count > 0;

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
    if (loaderData.categories !== undefined && loaderData.categories.length > 0) {
      dispatch(fetchCategoriesSuccess(loaderData.categories));
    }
  }, [loaderData.categories, dispatch]);

  // Update price range when loader data changes
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (loaderData.priceRange !== null) {
        setPriceRange(loaderData.priceRange);
        // Only reset price values if they haven't been set by URL params
        const minPriceParam = searchParams.get('minPrice');
        if (minPriceParam === null || minPriceParam === '') {
          setSelectedMinPrice(loaderData.priceRange.minPrice);
        }
        const maxPriceParam = searchParams.get('maxPrice');
        if (maxPriceParam === null || maxPriceParam === '') {
          setSelectedMaxPrice(loaderData.priceRange.maxPrice);
        }
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loaderData.priceRange, searchParams]);

  // Update tours and pagination when loader data changes (after navigation/filter)
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      // Only update tours if we have data and navigation was triggered (user clicked Filter or pagination)
      const urlUserId = searchParams.get('userId');
      if (urlUserId !== null && urlUserId !== undefined && urlUserId !== '') {
        if (loaderData.tours?.data !== undefined && loaderData.tours.data !== null) {
          setRawTours(loaderData.tours.data);
        }
        if (loaderData.tours?.pagination !== undefined && loaderData.tours.pagination !== null) {
          setPagination(
            loaderData.tours.pagination as {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            }
          );
        }
        setHasSearched(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loaderData.tours, searchParams]);

  // Handle city selection change - clear tours
  const handleCityChange = (newCityId: string): void => {
    setSelectedCityId(newCityId);
    // Mark filters as changed
    setFiltersChanged(true);
    // Clear tours when city changes (before clicking Filter)
    setRawTours([]);
    setHasSearched(false);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 } as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    });
    // Reset price range when city changes
    if (priceRange !== null) {
      setSelectedMinPrice(priceRange.minPrice);
      setSelectedMaxPrice(priceRange.maxPrice);
    }
  };

  // Handle category selection change - clear tours
  const handleCategoryChange = (newCategory: string): void => {
    setSelectedCategory(newCategory);
    // Mark filters as changed
    setFiltersChanged(true);
    // Clear tours when category changes (before clicking Filter)
    setRawTours([]);
    setHasSearched(false);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 } as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    });
  };

  // Handle price range change - clear tours
  const handlePriceChange = (minPrice: number, maxPrice: number): void => {
    setSelectedMinPrice(minPrice);
    setSelectedMaxPrice(maxPrice);
    // Mark filters as changed
    setFiltersChanged(true);
    // Clear tours when price changes (before clicking Filter)
    setRawTours([]);
    setHasSearched(false);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 } as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    });
  };

  // Check if navigation is loading
  const isLoading = navigation.state === 'loading';

  // Handle filter button click - update URL with all selected filters
  const handleFilter = (): void => {
    if (selectedUserId === '') {
      dispatch(
        openModal({
          id: 'validation-select-provider',
          type: 'confirm',
          title: t('common.notice'),
          isOpen: true,
          data: {
            message: t('tours.selectProviderFirst') || 'Por favor seleccionar un proveedor',
            icon: 'alert',
          },
        })
      );
      return;
    }

    // Validate that countryId is available from session
    if (countryId === null || countryId === undefined || countryId === '') {
      dispatch(
        openModal({
          id: 'validation-select-country',
          type: 'confirm',
          title: t('common.notice'),
          isOpen: true,
          data: {
            message: 'Por favor seleccionar un país primero',
            icon: 'alert',
          },
        })
      );
      return;
    }

    const params: Record<string, string> = {
      userId: selectedUserId,
      countryId: countryId,
      page: '1',
      category: selectedCategory,
    };

    // Include cityId if selected (optional filter)
    if (selectedCityId !== '') {
      params.cityId = selectedCityId;
    }

    // Only include price filters if they differ from default range
    if (priceRange !== null) {
      if (selectedMinPrice !== priceRange.minPrice) {
        params.minPrice = selectedMinPrice.toString();
      }
      if (selectedMaxPrice !== priceRange.maxPrice) {
        params.maxPrice = selectedMaxPrice.toString();
      }
    }
    // Reset filters changed flag
    setFiltersChanged(false);
    setSearchParams(params);
  };

  // Handle page change - updates URL params
  const handlePageChange = (newPage: number): void => {
    setSearchParams((prev) => ({
      ...Object.fromEntries(prev.entries()),
      page: newPage.toString(),
    }));
  };

  // Clear all filters
  const handleClearFilters = (): void => {
    setSelectedUserId('');
    setSelectedCityId('');
    setSelectedCategory('');
    // Reset filters changed flag
    setFiltersChanged(false);
    // Reset price to default range
    if (priceRange !== null) {
      setSelectedMinPrice(priceRange.minPrice);
      setSelectedMaxPrice(priceRange.maxPrice);
    }
    // Clear results
    setRawTours([]);
    setHasSearched(false);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 } as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    });
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div>
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
          <button
            onClick={() => setIsCreateTourModalOpen(true)}
            style={{
              backgroundColor: 'var(--color-primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-6)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              fontSize: 'var(--text-base)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
            }}
          >
            {t('tours.createTour')}
          </button>
        </div>

        {/* Filters Section */}
        <div
          style={{
            backgroundColor: 'white',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-neutral-200)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-3)',
              alignItems: 'center',
            }}
          >
            {/* User Filter - Cascading: enables city filter after selection + filter click */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-neutral-700)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {t('tours.provider')}
              </label>
              <Select
                options={[
                  { value: '', label: t('common.selectProvider') || 'Seleccionar proveedor' },
                ].concat(loaderData.users.map((u) => ({ value: u.id, label: u.name })))}
                value={selectedUserId}
                onChange={(v: string) => {
                  setSelectedUserId(v);
                  // Clear search results when provider changes
                  setRawTours([]);
                  setHasSearched(false);
                  setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 } as {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                  });
                  // Clear city, category and price filters when provider changes
                  setSelectedCityId('');
                  setSelectedCategory('');
                  if (priceRange !== null) {
                    setSelectedMinPrice(priceRange.minPrice);
                    setSelectedMaxPrice(priceRange.maxPrice);
                  }
                }}
                placeholder={t('common.selectProvider') || 'Seleccionar proveedor'}
                id="select-provider"
              />
            </div>

            {/* City Filter - Optional, disabled until user is selected and filter is clicked */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: isCityFilterEnabled
                    ? 'var(--color-neutral-700)'
                    : 'var(--color-neutral-400)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {t('tours.city')}
                {!isCityFilterEnabled && (
                  <span
                    style={{ fontWeight: 'normal', marginLeft: 'var(--space-1)', fontSize: '10px' }}
                  >
                    ({t('tours.selectProviderFirst') || 'Seleccionar proveedor primero'})
                  </span>
                )}
              </label>
              <Select
                options={[{ value: '', label: t('common.selectCity') }].concat(
                  translatedCities.map((c: TranslatedCity) => ({ value: c.id, label: c.name }))
                )}
                value={selectedCityId ?? ''}
                onChange={(v: string): void => handleCityChange(v)}
                placeholder={
                  isCityFilterEnabled
                    ? t('common.selectCity')
                    : t('tours.selectProviderFirst') || 'Seleccione proveedor'
                }
                id="select-city"
                disabled={!isCityFilterEnabled}
              />
            </div>

            {/* Category Filter - Enabled only if provider selected AND country exists AND tours loaded */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: isCategoryFilterEnabled
                    ? 'var(--color-neutral-700)'
                    : 'var(--color-neutral-400)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {t('tours.category')}
                {!isCategoryFilterEnabled && (
                  <span
                    style={{ fontWeight: 'normal', marginLeft: 'var(--space-1)', fontSize: '10px' }}
                  >
                    ({t('tours.selectProviderFirst') || 'Seleccionar proveedor primero'})
                  </span>
                )}
              </label>
              <Select
                options={[{ value: '', label: t('common.allCategories') }].concat(
                  translatedCategories.map((c) => ({ value: c.id, label: c.name }))
                )}
                value={selectedCategory ?? ''}
                onChange={(v: string) => handleCategoryChange(v)}
                placeholder={
                  isCategoryFilterEnabled
                    ? t('common.allCategories')
                    : t('tours.selectProviderFirst') || 'Seleccione proveedor'
                }
                id="select-category"
                disabled={!isCategoryFilterEnabled}
              />
            </div>

            {/* Price Range Slider Filter */}
            <div style={{ gridColumn: 'span 2' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: isPriceFilterEnabled
                    ? 'var(--color-neutral-700)'
                    : 'var(--color-neutral-400)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                {t('tours.priceRange')} ({priceRange?.currency ?? 'MXN'})
                {!isPriceFilterEnabled && (
                  <span
                    style={{ fontWeight: 'normal', marginLeft: 'var(--space-1)', fontSize: '10px' }}
                  >
                    ({t('tours.selectCityForPrice')})
                  </span>
                )}
              </label>
              {/* Price display label */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-1)',
                  fontSize: 'var(--text-xs)',
                  color: isPriceFilterEnabled
                    ? 'var(--color-neutral-900)'
                    : 'var(--color-neutral-400)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                <span>${selectedMinPrice.toLocaleString()}</span>
                <span>${selectedMaxPrice.toLocaleString()}</span>
              </div>

              {/* Dual Range Slider Container - Smaller */}
              <div
                style={{
                  position: 'relative',
                  height: '28px',
                  opacity: isPriceFilterEnabled === true ? 1 : 0.5,
                }}
              >
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
                    backgroundColor: isPriceFilterEnabled
                      ? 'var(--color-primary-500)'
                      : 'var(--color-neutral-300)',
                    borderRadius: '3px',
                    transform: 'translateY(-50%)',
                    left: priceRange
                      ? `${((selectedMinPrice - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%`
                      : '0%',
                    right: priceRange
                      ? `${100 - ((selectedMaxPrice - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%`
                      : '0%',
                  }}
                />

                {/* Min price slider */}
                <input
                  type="range"
                  min={priceRange?.minPrice ?? 0}
                  max={priceRange?.maxPrice ?? 10000}
                  value={selectedMinPrice}
                  onChange={(e): void => {
                    const value = parseInt(e.target.value, 10);
                    if (value < selectedMaxPrice && Number.isNaN(value) === false && value !== 0) {
                      handlePriceChange(value, selectedMaxPrice);
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
                    cursor: isPriceFilterEnabled === true ? 'pointer' : 'not-allowed',
                    zIndex: 2,
                  }}
                />

                {/* Max price slider */}
                <input
                  type="range"
                  min={priceRange?.minPrice ?? 0}
                  max={priceRange?.maxPrice ?? 10000}
                  value={selectedMaxPrice}
                  onChange={(e): void => {
                    const value = parseInt(e.target.value, 10);
                    if (value > selectedMinPrice && Number.isNaN(value) === false && value !== 0) {
                      handlePriceChange(selectedMinPrice, value);
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
                    cursor: isPriceFilterEnabled === true ? 'pointer' : 'not-allowed',
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
                    fontSize: '10px',
                    color: 'var(--color-neutral-500)',
                  }}
                >
                  <span>
                    {t('tours.minPrice')}: ${priceRange.minPrice.toLocaleString()}
                  </span>
                  <span>
                    {t('tours.maxPrice')}: ${priceRange.maxPrice.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Filter Button (primary) - Smaller */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={handleFilter}
                disabled={isLoading}
                style={{
                  width: 'auto',
                  minWidth: '80px',
                  height: '32px',
                  padding: '0 var(--space-3)',
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                  fontSize: '13px',
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

            {/* Clear Filters Button (secondary) - Smaller */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={handleClearFilters}
                style={{
                  width: 'auto',
                  minWidth: '80px',
                  height: '32px',
                  padding: '0 var(--space-3)',
                  backgroundColor: 'var(--color-neutral-100)',
                  color: 'var(--color-neutral-700)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  fontSize: '13px',
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

        {/* Filters Changed Warning Message */}
        {filtersChanged && selectedUserId !== '' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              backgroundColor: 'var(--color-warning-50)',
              border: '1px solid var(--color-warning-200)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-warning-700)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>
              {t('tours.filtersChangedMessage') ||
                'Los filtros han cambiado. Presiona "Filtrar" para aplicar los nuevos criterios de búsqueda.'}
            </span>
          </div>
        )}

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
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}

        {/* Empty State - No tours found after search */}
        {!isLoading &&
          translatedTours.length === 0 &&
          selectedUserId !== '' &&
          (hasSearched === true ||
            (selectedCityId === '' &&
              selectedCategory === '' &&
              selectedMinPrice === priceRange?.minPrice &&
              selectedMaxPrice === priceRange?.maxPrice)) && (
            <EmptyState
              icon="🏛️"
              title={t('tours.noToursFound')}
              description={t('tours.adjustFilters')}
            />
          )}

        {/* Initial State - No provider selected or filters cleared */}
        {!isLoading && translatedTours.length === 0 && selectedUserId === '' && (
          <EmptyState
            icon="👤"
            title={t('tours.selectProviderFirst')}
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
                color:
                  pagination.page === 1 ? 'var(--color-neutral-400)' : 'var(--color-neutral-700)',
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
              (page): JSX.Element => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor:
                      page === pagination.page ? 'var(--color-primary-500)' : 'white',
                    color: page === pagination.page ? 'white' : 'var(--color-neutral-700)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-medium)',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseOver={(e): void => {
                    if (page !== pagination.page) {
                      e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor =
                      page === pagination.page ? 'var(--color-primary-500)' : 'white';
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
                  pagination.page === pagination.totalPages ? 'var(--color-neutral-100)' : 'white',
                color:
                  pagination.page === pagination.totalPages
                    ? 'var(--color-neutral-400)'
                    : 'var(--color-neutral-700)',
                border: '1px solid var(--color-neutral-300)',
                borderRadius: 'var(--radius-md)',
                cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (pagination.page !== pagination.totalPages) {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor =
                  pagination.page === pagination.totalPages ? 'var(--color-neutral-100)' : 'white';
              }}
            >
              {t('pagination.next')}
            </button>
          </div>
        )}

        {/* Create Tour Modal */}
        <CreateTourModal
          isOpen={isCreateTourModalOpen}
          users={loaderData.users}
          onClose={() => setIsCreateTourModalOpen(false)}
          onSuccess={() => {
            // Reload page to fetch updated tours
            window.location.reload();
          }}
        />
      </main>
    </div>
  );
}

// Client-only wrapper component
function ClientOnlyTours(): JSX.Element {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isClient === false) {
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

export default function Tours(): JSX.Element {
  return <ClientOnlyTours />;
}
