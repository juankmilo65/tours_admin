// Offer Types
export interface Offer {
  id: string;
  tourId: string;
  title: string;
  description: string;
  discountPercentage: string;
  validFrom: string;
  validTo: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
}

// Country Types
export interface Country {
  code: string;
  name: string;
  flag?: string;
}

// City Types
export interface City {
  id: string;
  name: string;
  country: string;
}

// Tour Types
export interface Tour {
  id: string;
  categoryId: string;
  cityId: string;
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
  itinerary: string[];
  included: string[];
  notIncluded: string[];
  requirements: string[];
  difficulty: string;
  language: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  city: City;
  offers: Offer[];
  base_price: number;
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
  language?: string;
  currency?: string;
}
