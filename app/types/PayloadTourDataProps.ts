// Offer Types (with translations)
export interface Offer {
  id: string;
  tourId: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  discountPercentage: number;
  validFrom: string;
  validTo: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

// Activity/Itinerary Types (with translations)
export interface TourActivity {
  id: string;
  activityId: string;
  activity_es: string;
  activity_en: string;
  activity: string; // Default/fallback
  hora: string;
  sortOrder: number;
  category: string; // pickup, activity, meal, etc.
}

// Amenity Types (with translations)
export interface TourAmenity {
  id: string;
  amenityId: string;
  item_es: string;
  item_en: string;
  item: string; // Default/fallback
  include: boolean;
  sortOrder: number;
  category: string; // food, transportation, guide, insurance, etc.
}

// Requirement Types (with translations)
export interface TourRequirement {
  id: string;
  requirementId: string;
  requirement_es: string;
  requirement_en: string;
  requirement: string; // Default/fallback
  sortOrder: number;
  category: string; // physical, equipment, health, etc.
}

// Included/Excluded Item Types
export interface TourIncludedItem {
  id: string;
  item: string;
  included: boolean;
  sortOrder: number;
}

// Category Types (with translations)
export interface Category {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
}

// Country Types
export interface Country {
  id: string;
  code: string;
  name: string;
  flag?: string;
}

// City Types (with translations)
export interface City {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  description_es?: string;
  description_en?: string;
  imageUrl?: string;
  isActive: boolean;
  countryId: string;
}

// Tour Types (with translations)
export interface Tour {
  id: string;
  categoryId: string;
  cityId: string;
  slug: string;
  // Translated fields
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  shortDescription_es: string;
  shortDescription_en: string;
  // Common fields
  duration: number;
  maxCapacity: number;
  basePrice: string;
  currency: string;
  imageUrl: string;
  images: string[];
  difficulty: string;
  language: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Related entities (with translations)
  category: Category;
  city: City;
  offers: Offer[];
  activities: TourActivity[];
  amenities: TourAmenity[];
  requirements: TourRequirement[];
  included: TourIncludedItem[];
  termsConditions: {
    id: string;
    terms_conditions_es: string;
    terms_conditions_en: string;
  };
  // Converted price
  base_price: number;
  convertedCurrency: string;
}

// Helper type for getting translated value
export type Language = 'es' | 'en';

// Helper function type for translation
export interface TranslatedTour {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  duration: number;
  maxCapacity: number;
  basePrice: string;
  currency: string;
  imageUrl: string;
  images: string[];
  difficulty: string;
  language: string[];
  isActive: boolean;
  category: {
    id: string;
    name: string;
    description?: string;
  };
  city: {
    id: string;
    name: string;
    description?: string;
  };
  offers: Array<{
    id: string;
    title: string;
    description: string;
    discountPercentage: number;
    isActive: boolean;
  }>;
  activities: Array<{
    id: string;
    activity: string;
    hora: string;
    sortOrder: number;
    category: string;
  }>;
  amenities: Array<{
    id: string;
    item: string;
    include: boolean;
    sortOrder: number;
    category: string;
  }>;
  requirements: Array<{
    id: string;
    requirement: string;
    sortOrder: number;
    category: string;
  }>;
  included: TourIncludedItem[];
  termsConditions: {
    id: string;
    terms_conditions: string;
  };
  base_price: number;
  convertedCurrency: string;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Tour Filters
export interface TourFilters {
  cityId?: string;
  category?: string;
  difficulty?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  limit?: string;
}

// API Response Types
export interface PayloadTourDataProps {
  success: boolean;
  data: Tour[];
  pagination: Pagination;
}

export interface ToursResponse {
  success: boolean;
  data: Tour[];
  pagination: Pagination;
}

// Business Logic Payload Types
export interface ToursPayload {
  token: string;
  action: string;
  language: string;
  filters?: TourFilters;
}

export interface PayloadPropertyProps {
  language?: string;
  token?: string;
  filters?: TourFilters;
}

// Service Payload Types
export interface ServicePayload {
  data?: TourFilters;
  token?: string;
  cityId?: string;
  page?: number;
  category?: string;
  difficulty?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  currency?: string;
}

/**
 * Helper function to translate a tour based on language
 */
export function translateTour(tour: Tour, lang: Language): TranslatedTour {
  const getTranslated = (es: string, en: string): string => {
    return lang === 'es' ? es || en : en || es;
  };
  // Sanitize nested properties to avoid runtime errors when fields are missing
  const category: Category = tour.category ?? {};
  const city: City = tour.city ?? {};
  const offers: Offer[] = tour.offers ?? [];
  const activities: TourActivity[] = tour.activities ?? [];
  const amenities: TourAmenity[] = tour.amenities ?? [];
  const requirements: TourRequirement[] = tour.requirements ?? [];
  const included: TourIncludedItem[] = tour.included ?? [];
  const defaultTermsConditions: NonNullable<Tour['termsConditions']> = {
    id: '',
    terms_conditions_es: '',
    terms_conditions_en: '',
  };
  const termsConditions = tour.termsConditions ?? defaultTermsConditions;

  return {
    id: tour.id,
    slug: tour.slug,
    title: getTranslated(tour.title_es || '', tour.title_en || ''),
    description: getTranslated(tour.description_es || '', tour.description_en || ''),
    shortDescription: getTranslated(tour.shortDescription_es || '', tour.shortDescription_en || ''),
    duration: tour.duration || 0,
    maxCapacity: tour.maxCapacity || 0,
    basePrice: tour.basePrice || '',
    currency: tour.currency || 'MXN',
    imageUrl: tour.imageUrl || '',
    images: Array.isArray(tour.images) ? tour.images : [],
    difficulty: tour.difficulty || '',
    language: Array.isArray(tour.language) ? tour.language : [],
    isActive: typeof tour.isActive === 'boolean' ? tour.isActive : false,
    category: {
      id: category.id ?? '',
      name: getTranslated(
        typeof category.name_es === 'string' ? category.name_es : '',
        typeof category.name_en === 'string' ? category.name_en : ''
      ),
      description:
        category.description_es !== undefined &&
        category.description_es !== null &&
        category.description_es.length > 0
          ? getTranslated(category.description_es, category.description_en ?? '')
          : category.description_en !== undefined &&
              category.description_en !== null &&
              category.description_en.length > 0
            ? getTranslated(category.description_es ?? '', category.description_en)
            : undefined,
    },
    city: {
      id: city.id ?? '',
      name: getTranslated(
        typeof city.name_es === 'string' ? city.name_es : '',
        typeof city.name_en === 'string' ? city.name_en : ''
      ),
      description:
        city.description_es !== undefined &&
        city.description_es !== null &&
        city.description_es.length > 0
          ? getTranslated(city.description_es, city.description_en ?? '')
          : city.description_en !== undefined &&
              city.description_en !== null &&
              city.description_en.length > 0
            ? getTranslated(city.description_es ?? '', city.description_en)
            : undefined,
    },
    offers: offers.map((offer) => ({
      id: offer.id || '',
      title: getTranslated(
        ('title_es' in offer ? offer.title_es : '') || '',
        ('title_en' in offer ? offer.title_en : '') || ''
      ),
      description: getTranslated(
        ('description_es' in offer ? offer.description_es : '') || '',
        ('description_en' in offer ? offer.description_en : '') || ''
      ),
      discountPercentage: 'discountPercentage' in offer ? offer.discountPercentage : 0,
      isActive: 'isActive' in offer && typeof offer.isActive === 'boolean' ? offer.isActive : false,
    })),
    activities: activities.map((activity) => ({
      id: activity.id || '',
      activity: getTranslated(
        ('activity_es' in activity ? activity.activity_es : '') || '',
        ('activity_en' in activity ? activity.activity_en : '') || ''
      ),
      hora: activity.hora || '',
      sortOrder: activity.sortOrder || 0,
      category: activity.category || '',
    })),
    amenities: amenities.map((amenity) => ({
      id: amenity.id || '',
      item: getTranslated(
        ('item_es' in amenity ? amenity.item_es : '') || '',
        ('item_en' in amenity ? amenity.item_en : '') || ''
      ),
      include:
        'include' in amenity && typeof amenity.include === 'boolean' ? amenity.include : false,
      sortOrder: amenity.sortOrder || 0,
      category: amenity.category || '',
    })),
    requirements: requirements.map((req) => ({
      id: req.id || '',
      requirement: getTranslated(
        ('requirement_es' in req ? req.requirement_es : '') || '',
        ('requirement_en' in req ? req.requirement_en : '') || ''
      ),
      sortOrder: req.sortOrder || 0,
      category: req.category || '',
    })),
    included,
    termsConditions: {
      id: termsConditions.id || '',
      terms_conditions: getTranslated(
        termsConditions.terms_conditions_es || '',
        termsConditions.terms_conditions_en || ''
      ),
    },
    base_price: tour.base_price || 0,
    convertedCurrency: tour.convertedCurrency || '',
  };
}

/**
 * Helper function to translate an array of tours
 */
export function translateTours(tours: Tour[], lang: Language): TranslatedTour[] {
  return tours.map((tour) => translateTour(tour, lang));
}
