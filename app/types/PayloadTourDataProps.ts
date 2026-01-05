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
    return lang === 'es' ? (es || en) : (en || es);
  };

  return {
    id: tour.id,
    slug: tour.slug,
    title: getTranslated(tour.title_es, tour.title_en),
    description: getTranslated(tour.description_es, tour.description_en),
    shortDescription: getTranslated(tour.shortDescription_es, tour.shortDescription_en),
    duration: tour.duration,
    maxCapacity: tour.maxCapacity,
    basePrice: tour.basePrice,
    currency: tour.currency,
    imageUrl: tour.imageUrl,
    images: tour.images,
    difficulty: tour.difficulty,
    language: tour.language,
    isActive: tour.isActive,
    category: {
      id: tour.category.id,
      name: getTranslated(tour.category.name_es, tour.category.name_en),
      description: tour.category.description_es || tour.category.description_en 
        ? getTranslated(tour.category.description_es || '', tour.category.description_en || '')
        : undefined,
    },
    city: {
      id: tour.city.id,
      name: getTranslated(tour.city.name_es, tour.city.name_en),
      description: tour.city.description_es || tour.city.description_en
        ? getTranslated(tour.city.description_es || '', tour.city.description_en || '')
        : undefined,
    },
    offers: (tour.offers || []).map(offer => ({
      id: offer.id,
      title: getTranslated(offer.title_es, offer.title_en),
      description: getTranslated(offer.description_es, offer.description_en),
      discountPercentage: offer.discountPercentage,
      isActive: offer.isActive,
    })),
    activities: (tour.activities || []).map(activity => ({
      id: activity.id,
      activity: getTranslated(activity.activity_es, activity.activity_en),
      hora: activity.hora,
      sortOrder: activity.sortOrder,
      category: activity.category,
    })),
    amenities: (tour.amenities || []).map(amenity => ({
      id: amenity.id,
      item: getTranslated(amenity.item_es, amenity.item_en),
      include: amenity.include,
      sortOrder: amenity.sortOrder,
      category: amenity.category,
    })),
    requirements: (tour.requirements || []).map(req => ({
      id: req.id,
      requirement: getTranslated(req.requirement_es, req.requirement_en),
      sortOrder: req.sortOrder,
      category: req.category,
    })),
    included: tour.included,
    termsConditions: {
      id: tour.termsConditions.id,
      terms_conditions: getTranslated(tour.termsConditions.terms_conditions_es, tour.termsConditions.terms_conditions_en),
    },
    base_price: tour.base_price,
    convertedCurrency: tour.convertedCurrency,
  };
}

/**
 * Helper function to translate an array of tours
 */
export function translateTours(tours: Tour[], lang: Language): TranslatedTour[] {
  return tours.map(tour => translateTour(tour, lang));
}
