import type { JSX } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { data, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/utilities/auth.loader';
import type { Tour, TranslatedTour, Language } from '~/types/PayloadTourDataProps';
import { translateTours } from '~/types/PayloadTourDataProps';
import { TourCard } from '~/components/tours/TourCard';
import { CreateTourModal } from '~/components/tours/CreateTourModal';
import { useAppSelector, useAppDispatch } from '~/store/hooks';
import { selectAuthToken, selectCurrentUser } from '~/store/slices/authSlice';
import { selectCities, translateCities } from '~/store/slices/citiesSlice';
import { selectSelectedCountry, selectSelectedCurrencyCode } from '~/store/slices/countriesSlice';
import {
  selectCategories,
  translateCategories,
  fetchCategoriesSuccess,
  type Category,
} from '~/store/slices/categoriesSlice';
import { fetchCitiesSuccess } from '~/store/slices/citiesSlice';
import { selectLanguage, setGlobalLoading, openModal } from '~/store/slices/uiSlice';
import {
  selectTours,
  selectToursFilters,
  selectToursPagination,
  selectToursFiltersChanged,
  selectToursHasSearched,
  setTours,
  setPagination,
  setFilters,
  setFiltersSilently,
  clearFilters,
  resetFiltersChanged,
  setHasSearched,
  setLoading as setToursLoading,
} from '~/store/slices/toursSlice';
import type { City } from '~/server/cities';
import toursBL from '~/server/businessLogic/toursBusinessLogic';
import { cloneTourBusiness, deleteTourBusiness } from '~/server/businessLogic/toursBusinessLogic';
import categoriesBL from '~/server/businessLogic/categoriesBusinessLogic';
import { priceRangeBL } from '~/server/businessLogic/priceRangeBusinessLogic';
import citiesBL from '~/server/businessLogic/citiesBusinessLogic';
import countriesBL from '~/server/businessLogic/countriesBusinessLogic';
import { getUsersDropdownBusiness } from '~/server/businessLogic/usersBusinessLogic';
import { getActivitiesDropdownBusiness } from '~/server/businessLogic/activitiesBusinessLogic';
import { useTranslation } from '~/lib/i18n/utils';
import { getSession, commitSession } from '~/utilities/sessions';
import Select from '~/components/ui/Select';

// Loader function - runs on server, only loads initial data (categories, cities, users)
export async function loader(args: LoaderFunctionArgs): Promise<ReturnType<typeof data>> {
  await requireAuth(args);

  const session = await getSession(args.request.headers.get('Cookie'));
  let selectedCountryId = session.get('selectedCountryId') as string | undefined;
  const authToken = session.get('authToken') as string | undefined;
  const authUser = session.get('authUser') as
    | { id: string; role: string; firstName?: string; lastName?: string; email?: string }
    | undefined;

  // Get default country if not in session
  if (selectedCountryId === undefined || selectedCountryId === null || selectedCountryId === '') {
    const countriesFormData = new FormData();
    countriesFormData.append('action', 'getCountriesBusiness');
    countriesFormData.append('language', 'es');
    const countriesResult = await countriesBL(countriesFormData);

    const isCountriesResult = (
      result: unknown
    ): result is {
      success: boolean;
      data: { id: string; code: string; name_es?: string; name_en?: string }[] | null;
    } => typeof result === 'object' && result !== null && 'success' in result && 'data' in result;

    if (isCountriesResult(countriesResult) && countriesResult.success && countriesResult.data) {
      const mexicoCountry = countriesResult.data.find(
        (c) =>
          c.code === 'MX' ||
          c.name_es?.toLowerCase() === 'méxico' ||
          c.name_en?.toLowerCase() === 'mexico'
      );
      const defaultCountry = mexicoCountry ?? countriesResult.data[0];
      if (defaultCountry) {
        selectedCountryId = defaultCountry.id;
        session.set('selectedCountryId', defaultCountry.id);
        session.set('selectedCountryCode', defaultCountry.code);
      }
    }
  }

  // Fetch categories
  const categoriesFormData = new FormData();
  categoriesFormData.append('action', 'getCategoriesBusiness');
  categoriesFormData.append('language', 'es');
  const categoriesResult = await categoriesBL(categoriesFormData);
  const isCategoriesResult = (
    result: unknown
  ): result is { success: boolean; data: Category[] | null } =>
    typeof result === 'object' && result !== null && 'success' in result && 'data' in result;
  const categories: Category[] =
    isCategoriesResult(categoriesResult) &&
    categoriesResult.success === true &&
    categoriesResult.data !== null
      ? categoriesResult.data
      : [];

  // Fetch active cities for selected country
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
  let users: Array<{ id: string; firstName: string; email: string }> = [];
  if (authToken !== undefined) {
    if (authUser?.role === 'admin') {
      const usersResult = await getUsersDropdownBusiness(['owner'], 'true', authToken, 'es');
      users =
        usersResult.success === true && usersResult.data !== undefined ? usersResult.data : [];
    } else if (typeof authUser?.id === 'string' && authUser.id.trim() !== '') {
      const firstName = authUser.firstName ?? '';
      const lastName = authUser.lastName ?? '';
      const trimmedName = (firstName + ' ' + lastName).trim();
      const email = authUser.email ?? '';
      const fullName = trimmedName !== '' ? trimmedName : (email ?? 'Usuario');
      users = [{ id: authUser.id, firstName: fullName, email: email ?? 'usuario@ejemplo.com' }];
    }
  }

  // Fetch activities for dropdown
  const activitiesResult = await getActivitiesDropdownBusiness('es');
  const isActivitiesResult = (
    result: unknown
  ): result is {
    success: boolean;
    data?: Array<{ id: string; activityEs: string; activityEn: string }>;
  } => typeof result === 'object' && result !== null && 'success' in result && 'data' in result;
  const activities =
    isActivitiesResult(activitiesResult) &&
    activitiesResult.success === true &&
    activitiesResult.data !== undefined
      ? activitiesResult.data
      : [];

  return data(
    {
      countryId: selectedCountryId,
      categories,
      activeCities,
      users,
      activities,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

interface PriceRange {
  minPrice: number;
  maxPrice: number;
  currency: string;
  count: number;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

interface TourActivity {
  activityId?: string;
  activity_en?: string;
  activity_es?: string;
  hora?: string;
  sortOrder?: number;
}

interface TourDayGroup {
  day: number;
  activities: Array<{
    id?: string;
    activityId?: string;
    activity_es?: string;
    activity_en?: string;
    activity?: string;
    hora?: string;
    sortOrder?: number;
  }>;
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

const convertTo12HourFormat = (time24: string | null | undefined): string => {
  // Handle nullish/empty cases explicitly
  if (time24 === null || time24 === undefined || time24.trim() === '') return '09:00 AM';

  // Now time24 is definitely a string
  const timeStr: string = time24;

  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match?.[1] === undefined) return '09:00 AM';
  let hours = parseInt(match[1], 10);
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours = hours - 12;
  return `${hours.toString().padStart(2, '0')}:00 ${period}`;
};

// Client-only component that uses Redux for all state management
function ToursClient(): JSX.Element {
  const loaderData = useLoaderData<typeof loader>() as {
    data: {
      users?: Array<{ id: string; firstName: string; email: string }>;
      categories?: Category[];
      activeCities?: City[];
      activities?: Array<{ id: string; activityEs: string; activityEn: string }>;
    };
  };
  const dispatch = useAppDispatch();
  const rawCities = useAppSelector(selectCities);
  const users = (loaderData.data?.users ?? []).map((u: { id: string; firstName: string }) => ({
    value: u.id,
    label: u.firstName,
  }));
  const categories = useAppSelector(selectCategories);
  const currentLanguage = useAppSelector(selectLanguage) as Language;
  const authToken = useAppSelector(selectAuthToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const { t } = useTranslation();
  const currencyCode = useAppSelector(selectSelectedCurrencyCode);

  // Tours state from Redux (no longer using URL params)
  const rawTours = useAppSelector(selectTours);
  const filters = useAppSelector(selectToursFilters);
  const pagination = useAppSelector(selectToursPagination);
  const filtersChanged = useAppSelector(selectToursFiltersChanged);
  const hasSearched = useAppSelector(selectToursHasSearched);

  const translatedCities = useMemo(
    () => translateCities(loaderData.data?.activeCities ?? [], currentLanguage),
    [loaderData.data?.activeCities, currentLanguage]
  );
  const translatedCategories = useMemo(
    () => translateCategories(loaderData.data?.categories ?? [], currentLanguage),
    [loaderData.data?.categories, currentLanguage]
  );
  const translatedTours = useMemo(
    () => translateTours(rawTours, currentLanguage),
    [rawTours, currentLanguage]
  );

  const isAdmin = currentUser?.role === 'admin';
  const selectedCountry = useAppSelector(selectSelectedCountry);
  const countryId = selectedCountry?.id ?? null;

  // Local state for modals
  const [isCreateTourModalOpen, setIsCreateTourModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<TranslatedTour | null>(null);
  const [tourToClone, setTourToClone] = useState<TranslatedTour | null>(null);
  const [cloneImagesOption, setCloneImagesOption] = useState(true);
  const [tourToDelete, setTourToDelete] = useState<TranslatedTour | null>(null);
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);

  // Fetcher for loading tour details
  const tourDetailsFetcher = useFetcher<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>();
  const isTourSuccessResult = (r: unknown): r is { success: true; data: Record<string, unknown> } =>
    typeof r === 'object' &&
    r !== null &&
    'success' in r &&
    (r as { success: unknown }).success === true &&
    'data' in r;
  const fullTourData = useMemo(() => {
    if (
      editingTour !== null &&
      tourDetailsFetcher.state === 'idle' &&
      tourDetailsFetcher.data !== undefined &&
      isTourSuccessResult(tourDetailsFetcher.data)
    ) {
      return tourDetailsFetcher.data.data;
    }
    return null;
  }, [editingTour, tourDetailsFetcher.state, tourDetailsFetcher.data]);

  // Cargar datos iniciales del loader en Redux
  useEffect(() => {
    dispatch(setGlobalLoading({ isLoading: true, message: 'Cargando datos...' }));
    if (loaderData.data?.categories && loaderData.data.categories.length > 0)
      dispatch(fetchCategoriesSuccess(loaderData.data.categories));
    if (loaderData.data?.activeCities && loaderData.data.activeCities.length > 0)
      dispatch(fetchCitiesSuccess(loaderData.data.activeCities));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ocultar spinner cuando los datos estén listos
  useEffect(() => {
    if (categories.length > 0 && rawCities.length > 0) {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  }, [categories, rawCities, dispatch]);

  // Auto-select current user as provider for non-admin
  useEffect(() => {
    if (!isAdmin && currentUser?.id !== undefined && filters.userId !== currentUser.id) {
      dispatch(setFilters({ userId: currentUser.id, countryId: countryId ?? '' }));
    }
  }, [isAdmin, currentUser, countryId, dispatch, filters.userId]);

  // Fetch tours when filters are applied
  const fetchTours = async () => {
    if (
      filters.userId === undefined ||
      filters.userId === '' ||
      filters.countryId === undefined ||
      filters.countryId === ''
    )
      return;

    dispatch(setGlobalLoading({ isLoading: true, message: 'Buscando tours...' }));
    dispatch(setToursLoading(true));
    dispatch(setHasSearched(true));

    try {
      const filtersObj: Record<string, string | number | boolean> = {
        userId: filters.userId,
        countryId: filters.countryId,
        page: parseInt(filters.page ?? '1', 10),
      };

      if (filters.cityId !== undefined) filtersObj.cityId = filters.cityId;
      if (filters.difficulty !== undefined) filtersObj.difficulty = filters.difficulty;
      if (filters.minPrice !== undefined) filtersObj.minPrice = parseInt(filters.minPrice, 10);
      if (filters.maxPrice !== undefined) filtersObj.maxPrice = parseInt(filters.maxPrice, 10);
      if (filters.isActive !== undefined) filtersObj.isActive = filters.isActive;

      const formData = new FormData();
      formData.append('action', 'getToursBusiness');
      formData.append('filters', JSON.stringify(filtersObj));
      formData.append('language', 'es');

      const result = await toursBL(formData);

      const isToursResult = (
        toursResult: unknown
      ): toursResult is {
        success: boolean;
        data: Tour[] | null;
        pagination: { page: number; limit: number; total: number; totalPages: number } | null;
      } =>
        typeof toursResult === 'object' &&
        toursResult !== null &&
        'success' in toursResult &&
        typeof (toursResult as { success?: boolean }).success === 'boolean' &&
        'data' in toursResult &&
        'pagination' in toursResult;

      if (isToursResult(result) && result.success === true) {
        dispatch(setTours(result.data ?? []));
        dispatch(
          setPagination(
            result.pagination ?? {
              page: parseInt(filters.page ?? '1', 10),
              limit: 10,
              total: 0,
              totalPages: 1,
            }
          )
        );
      } else {
        dispatch(setTours([]));
        dispatch(setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 }));
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      dispatch(setTours([]));
      dispatch(setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 }));
    } finally {
      dispatch(setToursLoading(false));
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  };

  // Fetch tour details for editing
  useEffect(() => {
    if (editingTour === null) return;

    dispatch(setGlobalLoading({ isLoading: true, message: 'Cargando datos del tour...' }));
    tourDetailsFetcher.load(
      `/api/tours/getById?tourId=${editingTour.id}&language=${currentLanguage ?? 'es'}&currency=MXN`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTour, currentLanguage, dispatch]);

  useEffect(() => {
    if (tourDetailsFetcher.state === 'idle' && tourDetailsFetcher.data !== undefined) {
      dispatch(setGlobalLoading({ isLoading: false }));
    }
  }, [tourDetailsFetcher.state, tourDetailsFetcher.data, dispatch]);

  // Check for success messages
  useEffect(() => {
    const successType = window.sessionStorage.getItem('tours_success_message');
    if (successType !== null) {
      window.sessionStorage.removeItem('tours_success_message');
      let messageKey = '';
      switch (successType) {
        case 'clone':
          messageKey = 'tours.cloneTourSuccess';
          break;
        case 'delete':
          messageKey = 'tours.deleteTourSuccess';
          break;
        case 'create':
          messageKey = 'tours.tourCreatedSuccess';
          break;
        case 'update':
          messageKey = 'tours.tourUpdatedSuccess';
          break;
        default:
          return;
      }
      dispatch(
        openModal({
          id: `${successType}-tour-success`,
          type: 'confirm',
          title: t('common.success'),
          isOpen: true,
          data: { message: t(messageKey), icon: 'success' },
        })
      );
    }
  }, [t, dispatch]);

  // Load price range when filters change
  useEffect(() => {
    const loadPriceRange = async () => {
      if (
        filters.userId === null ||
        filters.userId === undefined ||
        filters.userId === '' ||
        filters.countryId === null ||
        filters.countryId === undefined ||
        filters.countryId === ''
      ) {
        setPriceRange(null);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('action', 'getPriceRangeBusiness');
        formData.append(
          'filters',
          JSON.stringify({
            userId: filters.userId,
            countryId: filters.countryId,
            category: filters.category ?? '',
          })
        );
        formData.append('language', 'es');
        formData.append('currency', 'MXN');
        const result = await priceRangeBL(formData);
        if (result.success === true && result.data) {
          setPriceRange(result.data);
          // Always update filters to match new price range if out of bounds or empty/invalid
          const min = result.data.minPrice;
          const max = result.data.maxPrice;
          let newMin = filters.minPrice;
          let newMax = filters.maxPrice;
          const minNum = parseInt(newMin ?? '', 10);
          const maxNum = parseInt(newMax ?? '', 10);
          let update = false;
          if (
            newMin === undefined ||
            newMin === null ||
            newMin === '' ||
            isNaN(minNum) ||
            minNum < min ||
            minNum > max
          ) {
            newMin = min.toString();
            update = true;
          }
          if (
            newMax === undefined ||
            newMax === null ||
            newMax === '' ||
            isNaN(maxNum) ||
            maxNum > max ||
            maxNum < min
          ) {
            newMax = max.toString();
            update = true;
          }
          if (update) {
            dispatch(setFiltersSilently({ minPrice: newMin, maxPrice: newMax }));
          }
        }
      } catch (error) {
        console.error('Error fetching price range:', error);
        setPriceRange(null);
      }
    };

    void loadPriceRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.countryId, filters.category, dispatch]);

  // Auto-load tours for non-admin users
  useEffect(() => {
    if (
      !isAdmin &&
      filters.userId !== undefined &&
      filters.countryId !== undefined &&
      !hasSearched
    ) {
      void fetchTours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filters.userId, filters.countryId, hasSearched]);

  const isLoadingFullTour = tourDetailsFetcher.state === 'loading';

  const editTourData = useMemo(() => {
    // LOG para depuración de estructura
    // console.log('editTourData: loaderData', loaderData);
    // console.log('editTourData: fullTourData', fullTourData);
    if (editingTour === null) {
      return {
        isOpen: false,
        initialData: undefined,
        tourId: undefined,
        isLoading: false,
        toursInfo: undefined,
      };
    }

    if (isLoadingFullTour) {
      return {
        isOpen: true,
        initialData: undefined,
        tourId: editingTour.id,
        isLoading: true,
        toursInfo: undefined,
      };
    }

    const rawTourForEdit = rawTours.find((t) => t.id === editingTour.id);
    if (!rawTourForEdit) {
      console.warn('rawTourForEdit is undefined for editingTour:', editingTour);
      return {
        isOpen: true,
        initialData: undefined,
        tourId: editingTour.id,
        isLoading: false,
        toursInfo: undefined,
      };
    }

    const rawData = rawTourForEdit as unknown as Record<string, unknown>;
    const fullData = fullTourData && typeof fullTourData === 'object' ? fullTourData : {};

    const getOwnerIdFromArray = (): string => {
      const owners = fullData.owners;
      if (Array.isArray(owners) && owners.length > 0) {
        const firstOwner = owners[0] as { id?: string };
        return firstOwner.id ?? '';
      }
      return '';
    };

    // Defensive: log if any property is undefined
    if (!Array.isArray(fullData.images))
      console.warn('fullData.images is not array', fullData.images);
    if (!Array.isArray(fullData.activities))
      console.warn('fullData.activities is not array', fullData.activities);
    if (!Array.isArray(fullData.days)) console.warn('fullData.days is not array', fullData.days);

    const initialData = {
      userId: getOwnerIdFromArray(),
      categoryId: rawTourForEdit.categoryId ?? rawTourForEdit.category?.id ?? '',
      cityId: rawTourForEdit.cityId ?? rawTourForEdit.city?.id ?? '',
      titleEs: (fullData.title_es as string) ?? (rawData.title_es as string) ?? '',
      titleEn: (fullData.title_en as string) ?? (rawData.title_en as string) ?? '',
      descriptionEs: (fullData.description_es as string) ?? '',
      descriptionEn: (fullData.description_en as string) ?? '',
      shortDescriptionEs:
        (fullData.shortDescription_es as string) ?? (rawData.shortDescription_es as string) ?? '',
      shortDescriptionEn:
        (fullData.shortDescription_en as string) ?? (rawData.shortDescription_en as string) ?? '',
      duration: String(fullData.duration ?? rawTourForEdit.duration ?? 1),
      maxCapacity: (fullData.maxCapacity as number) ?? rawTourForEdit.maxCapacity ?? 1,
      basePrice: (fullData.base_price as number) ?? rawTourForEdit.base_price ?? 0,
      minimumPayment: (fullData.minimumPayment as number) ?? rawTourForEdit.minimumPayment ?? 0,
      currency: (fullData.currency as string) ?? rawTourForEdit.currency ?? 'MXN',
      imageUrl: (fullData.imageUrl as string) ?? rawTourForEdit.imageUrl ?? '',
      images: [] as File[],
      existingImages: Array.isArray(fullData.images)
        ? (
            fullData.images as Array<{
              id?: string;
              url?: string;
              isCover?: boolean;
              sortOrder?: number;
              storageKey?: string;
            }>
          ).map((img) => ({
            id: img.id,
            url: img.url,
            isCover: img.isCover ?? false,
            sortOrder: img.sortOrder ?? 0,
            storageKey: img.storageKey,
          }))
        : [],
      difficulty:
        ((fullData.difficulty ?? rawTourForEdit.difficulty) as 'easy' | 'medium' | 'hard') ??
        'easy',
      language: (fullData.language as string[]) ?? rawTourForEdit.language ?? ['es'],
      isActive: (fullData.isActive as boolean) ?? rawTourForEdit.isActive ?? true,
      activities: Array.isArray(fullData.activities)
        ? fullData.activities.map((act: TourActivity, index: number) => ({
            activityId: act.activityId ?? '',
            activityName:
              currentLanguage === 'en'
                ? (act.activity_en ?? act.activity_es ?? '')
                : (act.activity_es ?? act.activity_en ?? ''),
            hora: convertTo12HourFormat(act.hora ?? '09:00'),
            sortOrder: act.sortOrder ?? index + 1,
          }))
        : [],
      days: Array.isArray(fullData.days)
        ? fullData.days.map((dayGroup: TourDayGroup) => ({
            day: dayGroup.day,
            activities: Array.isArray(dayGroup.activities)
              ? dayGroup.activities.map((act, index: number) => ({
                  id: act.id ?? act.activityId ?? '',
                  activityId: act.activityId ?? act.id ?? '',
                  activity_es: act.activity_es ?? '',
                  activity_en: act.activity_en ?? '',
                  activity:
                    currentLanguage === 'en'
                      ? (act.activity_en ?? act.activity_es ?? act.activity ?? '')
                      : (act.activity_es ?? act.activity_en ?? act.activity ?? ''),
                  hora: act.hora ?? '09:00 AM',
                  sortOrder: act.sortOrder ?? index + 1,
                  day: dayGroup.day,
                  category: 'activity',
                }))
              : [],
          }))
        : [],
      termsConditions: (() => {
        const tc = fullData.termsConditions as
          | { terms_conditions_es?: string; terms_conditions_en?: string }
          | undefined
          | null;
        if (
          tc !== null &&
          tc !== undefined &&
          typeof tc.terms_conditions_es === 'string' &&
          tc.terms_conditions_es !== '' &&
          typeof tc.terms_conditions_en === 'string' &&
          tc.terms_conditions_en !== ''
        ) {
          return {
            terms_conditions_es: tc.terms_conditions_es,
            terms_conditions_en: tc.terms_conditions_en,
          };
        }
        return null;
      })(),
      cancellationPolicies: (() => {
        const rawPolicies = fullData.cancellationPolicies;
        if (!Array.isArray(rawPolicies)) return [];
        return rawPolicies.map((p: Record<string, unknown>) => ({
          daysBeforeTour: typeof p.daysBeforeTour === 'number' ? p.daysBeforeTour : 0,
          refundPercentage: typeof p.refundPercentage === 'number' ? p.refundPercentage : 0,
          administrativeFee:
            typeof p.administrativeFee === 'number'
              ? p.administrativeFee
              : parseFloat(String(p.administrativeFee ?? '0')) || 0,
          appliesToPaymentMethods: Array.isArray(p.appliesToPaymentMethods)
            ? (p.appliesToPaymentMethods as string[])
            : [],
          description_es: typeof p.description_es === 'string' ? p.description_es : '',
          description_en: typeof p.description_en === 'string' ? p.description_en : '',
          isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
        }));
      })(),
    };

    const isToursInfo = (
      data: unknown
    ): data is { lastDateForThisTour: string; toursRelated: number } =>
      typeof data === 'object' &&
      data !== null &&
      'lastDateForThisTour' in data &&
      'toursRelated' in data &&
      typeof (data as { lastDateForThisTour?: unknown }).lastDateForThisTour === 'string' &&
      typeof (data as { toursRelated?: unknown }).toursRelated === 'number';

    const toursInfoRaw = fullData.toursInfo;
    const toursInfo = isToursInfo(toursInfoRaw)
      ? {
          lastDateForThisTour: toursInfoRaw.lastDateForThisTour,
          toursRelated: toursInfoRaw.toursRelated,
        }
      : undefined;

    return { isOpen: true, initialData, tourId: editingTour.id, isLoading: false, toursInfo };
  }, [editingTour, rawTours, fullTourData, isLoadingFullTour, currentLanguage]);

  const handleCloneTour = (tour: TranslatedTour): void => {
    setTourToClone(tour);
    setCloneImagesOption(true);
  };

  const executeCloneTour = async (): Promise<void> => {
    if (tourToClone === null) return;
    const tour = tourToClone;
    setTourToClone(null);

    dispatch(setGlobalLoading({ isLoading: true, message: t('tours.cloningTour') }));

    try {
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

      const rawTour = rawTours.find((rt) => rt.id === tour.id);

      const result = await cloneTourBusiness(
        tour.id,
        {
          targetUserId: currentUser?.id ?? '',
          customTitleEs: `${rawTour?.title_es ?? tour.title}-${dateStr}`,
          customTitleEn: `${rawTour?.title_en ?? tour.title}-${dateStr}`,
          cloneImages: cloneImagesOption,
        },
        authToken ?? ''
      );

      if ('error' in result) {
        dispatch(setGlobalLoading({ isLoading: false }));
        dispatch(
          openModal({
            id: 'clone-tour-error',
            type: 'confirm',
            title: t('common.error'),
            isOpen: true,
            data: { message: t('tours.cloneTourError'), icon: 'alert' },
          })
        );
        return;
      }

      window.sessionStorage.setItem('tours_success_message', 'clone');
      window.location.reload();
    } catch (error) {
      console.error('Error cloning tour:', error);
      dispatch(setGlobalLoading({ isLoading: false }));
      dispatch(
        openModal({
          id: 'clone-tour-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: { message: t('tours.cloneTourError'), icon: 'alert' },
        })
      );
    }
  };

  const handleDeleteTour = (tour: TranslatedTour): void => {
    setTourToDelete(tour);
  };

  const executeDeleteTour = async (): Promise<void> => {
    if (tourToDelete === null) return;
    const tour = tourToDelete;
    setTourToDelete(null);

    dispatch(setGlobalLoading({ isLoading: true, message: t('tours.deletingTour') }));

    try {
      const result = await deleteTourBusiness(tour.id, authToken ?? '');

      if (!result.success) {
        dispatch(setGlobalLoading({ isLoading: false }));
        dispatch(
          openModal({
            id: 'delete-tour-error',
            type: 'confirm',
            title: t('common.error'),
            isOpen: true,
            data: {
              message: typeof result.error === 'string' ? result.error : t('tours.deleteTourError'),
              icon: 'alert',
            },
          })
        );
        return;
      }

      window.sessionStorage.setItem('tours_success_message', 'delete');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting tour:', error);
      dispatch(setGlobalLoading({ isLoading: false }));
      dispatch(
        openModal({
          id: 'delete-tour-error',
          type: 'confirm',
          title: t('common.error'),
          isOpen: true,
          data: { message: t('tours.deleteTourError'), icon: 'alert' },
        })
      );
    }
  };

  const isCityFilterEnabled =
    filters.userId !== '' && countryId !== null && countryId !== undefined && countryId !== '';
  const isCategoryFilterEnabled =
    filters.userId !== '' && countryId !== null && countryId !== undefined && countryId !== '';
  const isPriceFilterEnabled =
    filters.userId !== '' &&
    countryId !== null &&
    countryId !== undefined &&
    countryId !== '' &&
    priceRange !== null &&
    priceRange.count > 0;

  // Defensive: always use valid min/max for price display and slider
  const minPriceValue = priceRange
    ? Math.max(priceRange.minPrice, parseInt(filters.minPrice ?? '', 10) || priceRange.minPrice)
    : 0;
  const maxPriceValue = priceRange
    ? Math.min(priceRange.maxPrice, parseInt(filters.maxPrice ?? '', 10) || priceRange.maxPrice)
    : 0;

  // Filter handlers - update Redux state
  const handleFilter = async (): Promise<void> => {
    if (filters.userId === '') {
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

    if (countryId === null || countryId === undefined || countryId === '') {
      dispatch(
        openModal({
          id: 'validation-select-country',
          type: 'confirm',
          title: t('common.notice'),
          isOpen: true,
          data: { message: 'Por favor seleccionar un país primero', icon: 'alert' },
        })
      );
      return;
    }

    dispatch(resetFiltersChanged());
    await fetchTours();
  };

  const handlePageChange = (newPage: number): void => {
    dispatch(setFilters({ page: newPage.toString() }));
    // FetchTours will be called by the effect that watches filters.page
  };

  const handleClearFilters = (): void => {
    dispatch(setTours([]));
    dispatch(setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 }));
    dispatch(setHasSearched(false));
    setPriceRange(null);

    if (isAdmin) {
      dispatch(setFilters({ userId: '' }));
    } else {
      dispatch(clearFilters());
      // Re-select current user for non-admin
      if (currentUser?.id !== undefined) {
        dispatch(setFiltersSilently({ userId: currentUser.id, countryId: countryId ?? '' }));
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-neutral-50)' }}>
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
            {/* User Filter */}
            {isAdmin ? (
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
                  ].concat(users)}
                  value={filters.userId ?? ''}
                  onChange={(v: string) => {
                    dispatch(
                      setFilters({
                        userId: v,
                        countryId: countryId ?? '',
                        cityId: '',
                        category: '',
                        minPrice: '',
                        maxPrice: '',
                        isActive: undefined,
                      })
                    );
                    setPriceRange(null);
                  }}
                  placeholder={t('common.selectProvider') || 'Seleccionar proveedor'}
                  id="select-provider"
                />
              </div>
            ) : (
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
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-neutral-100)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-neutral-700)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {currentUser?.firstName} {currentUser?.lastName}
                </div>
              </div>
            )}

            {/* City Filter */}
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
                  (translatedCities ?? []).map((c) => ({ value: c.id, label: c.name }))
                )}
                value={filters.cityId ?? ''}
                onChange={(v: string) => {
                  dispatch(setTours([]));
                  dispatch(setFilters({ cityId: v }));
                }}
                placeholder={
                  isCityFilterEnabled
                    ? t('common.selectCity')
                    : t('tours.selectProviderFirst') || 'Seleccione proveedor'
                }
                id="select-city"
                disabled={!isCityFilterEnabled}
              />
            </div>

            {/* Category Filter */}
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
                value={filters.category ?? ''}
                onChange={(v: string) => {
                  dispatch(setTours([]));
                  dispatch(setFilters({ category: v }));
                }}
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
                {t('tours.priceRange')} ({currencyCode})
                {!isPriceFilterEnabled && (
                  <span
                    style={{ fontWeight: 'normal', marginLeft: 'var(--space-1)', fontSize: '10px' }}
                  >
                    ({t('tours.selectCityForPrice')})
                  </span>
                )}
              </label>
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
                <span>${minPriceValue.toLocaleString()}</span>
                <span>${maxPriceValue.toLocaleString()}</span>
              </div>

              <div
                style={{
                  position: 'relative',
                  height: '28px',
                  opacity: isPriceFilterEnabled ? 1 : 0.5,
                }}
              >
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
                      ? `${((minPriceValue - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%`
                      : '0%',
                    right: priceRange
                      ? `${100 - ((maxPriceValue - priceRange.minPrice) / (priceRange.maxPrice - priceRange.minPrice)) * 100}%`
                      : '0%',
                  }}
                />
                <input
                  type="range"
                  min={priceRange?.minPrice ?? 0}
                  max={priceRange?.maxPrice ?? 10000}
                  value={minPriceValue}
                  onChange={(e): void => {
                    const value = parseInt(e.target.value, 10);
                    if (value < maxPriceValue && !Number.isNaN(value)) {
                      dispatch(setTours([]));
                      dispatch(setFilters({ minPrice: value.toString() }));
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
                <input
                  type="range"
                  min={priceRange?.minPrice ?? 0}
                  max={priceRange?.maxPrice ?? 10000}
                  value={maxPriceValue}
                  onChange={(e): void => {
                    const value = parseInt(e.target.value, 10);
                    if (value > minPriceValue && !Number.isNaN(value)) {
                      dispatch(setTours([]));
                      dispatch(setFilters({ maxPrice: value.toString() }));
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

            {/* Active Status Filter */}
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
                {t('common.status')}
              </label>
              <Select
                options={[
                  { value: 'all', label: t('common.all') },
                  { value: 'active', label: t('common.active') },
                  { value: 'inactive', label: t('common.inactive') },
                ]}
                value={
                  filters.isActive === true
                    ? 'active'
                    : filters.isActive === false
                      ? 'inactive'
                      : 'all'
                }
                onChange={(v: string) => {
                  const isActive = v === 'active' ? true : v === 'inactive' ? false : undefined;
                  dispatch(setTours([]));
                  dispatch(setFilters({ isActive }));
                }}
                placeholder={t('common.all')}
                id="select-active-status"
              />
            </div>

            {/* Filter Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  void handleFilter();
                }}
                disabled={false}
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
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  fontSize: '13px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                }}
              >
                {t('common.filter')}
              </button>
            </div>

            {/* Clear Filters Button */}
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

        {/* Filters Changed Warning */}
        {filtersChanged && filters.userId !== '' && (
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
        {false}
        {/*
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
        {translatedTours.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {translatedTours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onEdit={() => setEditingTour(tour)}
                onClone={() => handleCloneTour(tour)}
                onDelete={() => handleDeleteTour(tour)}
              />
            ))}
          </div>
        )}

        {/* Empty State - No tours found */}
        {translatedTours.length === 0 && filters.userId !== '' && hasSearched && (
          <EmptyState
            icon="🏛️"
            title={t('tours.noToursFound')}
            description={t('tours.adjustFilters')}
          />
        )}

        {/* Initial State - No provider selected */}
        {translatedTours.length === 0 && filters.userId === '' && (
          <EmptyState
            icon="👤"
            title={t('tours.selectProviderFirst')}
            description={t('tours.selectCityDescription')}
          />
        )}

        {/* Pagination */}
        {translatedTours.length > 0 && pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <button
              onClick={() => {
                void handlePageChange(pagination.page - 1);
              }}
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
                if (pagination.page !== 1)
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor =
                  pagination.page === 1 ? 'var(--color-neutral-100)' : 'white';
              }}
            >
              {t('pagination.previous')}
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => {
                  void handlePageChange(page);
                }}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  backgroundColor: page === pagination.page ? 'var(--color-primary-500)' : 'white',
                  color: page === pagination.page ? 'white' : 'var(--color-neutral-700)',
                  border: '1px solid var(--color-neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (page !== pagination.page)
                    e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor =
                    page === pagination.page ? 'var(--color-primary-500)' : 'white';
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => {
                void handlePageChange(pagination.page + 1);
              }}
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
                if (pagination.page !== pagination.totalPages)
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
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
          users={loaderData.data?.users ?? []}
          activities={loaderData.data?.activities ?? []}
          onClose={() => setIsCreateTourModalOpen(false)}
          onSuccess={() => {
            window.sessionStorage.setItem('tours_success_message', 'create');
            window.location.reload();
          }}
        />

        {/* Edit Tour Modal */}
        {editTourData.isOpen && !editTourData.isLoading && (
          <CreateTourModal
            isOpen={true}
            mode="edit"
            tourId={editTourData.tourId}
            initialData={
              editTourData.initialData as Partial<{
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
                existingImages: import('~/types/PayloadTourDataProps').TourImage[];
                difficulty: 'easy' | 'medium' | 'hard';
                language: string[];
                activities: Array<{
                  activityId: string;
                  activityName: string;
                  hora: string;
                  sortOrder: number;
                }>;
                days: import('~/types/PayloadTourDataProps').TourDay[];
                isActive: boolean;
                termsConditions: {
                  terms_conditions_es: string;
                  terms_conditions_en: string;
                } | null;
                cancellationPolicies: Array<{
                  daysBeforeTour: number;
                  refundPercentage: number;
                  administrativeFee: number;
                  appliesToPaymentMethods: string[];
                  description_es: string;
                  description_en: string;
                  isActive: boolean;
                }>;
              }>
            }
            users={loaderData.data?.users ?? []}
            activities={loaderData.data?.activities ?? []}
            toursInfo={editTourData.toursInfo}
            onClose={() => setEditingTour(null)}
            onSuccess={() => {
              setEditingTour(null);
              dispatch(
                openModal({
                  id: 'update-tour-success',
                  type: 'confirm',
                  title: t('common.success'),
                  isOpen: true,
                  data: { message: t('tours.tourUpdatedSuccess'), icon: 'success' },
                })
              );
              void fetchTours();
            }}
          />
        )}

        {/* Clone Tour Confirmation Modal */}
        {tourToClone !== null && (
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
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setTourToClone(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                maxWidth: '480px',
                width: '90%',
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'auto',
              }}
              onClick={(e): void => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: 34 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-lg)',
                      fontWeight: '600',
                      color: 'var(--color-neutral-900)',
                    }}
                  >
                    {t('tours.cloneTour')}
                  </h3>
                  <p
                    style={{
                      marginTop: 'var(--space-2)',
                      color: 'var(--color-neutral-700)',
                      lineHeight: 1.5,
                    }}
                  >
                    {t('tours.cloneTourConfirm')}
                  </p>
                  <p
                    style={{
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--color-neutral-100)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: '500',
                      color: 'var(--color-neutral-800)',
                    }}
                  >
                    {tourToClone.title}
                  </p>
                  <p
                    style={{
                      marginTop: 'var(--space-2)',
                      color: 'var(--color-neutral-600)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.5,
                    }}
                  >
                    {t('tours.cloneTourInfo')}
                  </p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginTop: 'var(--space-3)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-neutral-700)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={cloneImagesOption}
                      onChange={(e) => setCloneImagesOption(e.target.checked)}
                      style={{
                        width: 18,
                        height: 18,
                        cursor: 'pointer',
                        accentColor: 'var(--color-primary-500)',
                      }}
                    />
                    {t('tours.cloneImages')}
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setTourToClone(null)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-neutral-200)',
                    color: 'var(--color-neutral-700)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    void executeCloneTour();
                  }}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-primary-500)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {t('tours.cloneTour')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Tour Confirmation Modal */}
        {tourToDelete !== null && (
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
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setTourToDelete(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                maxWidth: '480px',
                width: '90%',
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'auto',
              }}
              onClick={(e): void => e.stopPropagation()}
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
                      fontWeight: '600',
                      color: 'var(--color-error-600)',
                    }}
                  >
                    {t('tours.deleteTour')}
                  </h3>
                  <p
                    style={{
                      marginTop: 'var(--space-2)',
                      color: 'var(--color-neutral-700)',
                      lineHeight: 1.5,
                    }}
                  >
                    {t('tours.deleteTourConfirm')}
                  </p>
                  <p
                    style={{
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--color-neutral-100)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: '500',
                      color: 'var(--color-neutral-800)',
                    }}
                  >
                    {tourToDelete.title}
                  </p>
                  <p
                    style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--color-error-50)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-error-700)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.5,
                      fontWeight: '500',
                    }}
                  >
                    ⛔ {t('tours.deleteTourWarning')}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setTourToDelete(null)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-neutral-200)',
                    color: 'var(--color-neutral-700)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    void executeDeleteTour();
                  }}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    backgroundColor: 'var(--color-error-600)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '500',
                  }}
                >
                  {t('tours.deleteTour')}
                </button>
              </div>
            </div>
          </div>
        )}
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

export default function Tours(): JSX.Element {
  return <ClientOnlyTours />;
}
