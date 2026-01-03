/**
 * Tours Route - Tours Management List with Remix Loader
 */

import { useState, useContext } from 'react';
import { useLoaderData, useNavigation, useSearchParams, useNavigate } from '@remix-run/react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import type { Tour, Pagination, City } from '~/types/PayloadTourDataProps';
import { TourCard } from '~/components/tours/TourCard';
import toursBusinessLogic from '~/server/businessLogic/toursBusinessLogic';
import { CitiesContext } from '~/root';

interface ToursResponse {
  success: boolean;
  data: Tour[];
  pagination: Pagination;
}

interface ToursResult {
  success: boolean;
  data: Tour[];
  pagination: Pagination;
  error?: unknown;
}

// Loader function - runs on server
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const cityId = url.searchParams.get('cityId');

  // If cityId is provided, load tours for that city
  let toursResponse: ToursResponse = {
    success: false,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  };

  if (cityId) {
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '10';
    const category = url.searchParams.get('category') || '';
    const difficulty = url.searchParams.get('difficulty') || '';
    const minPrice = url.searchParams.get('minPrice') || '';
    const maxPrice = url.searchParams.get('maxPrice') || '';

    // Build filters payload
    const filters = {
      cityId,
      page,
      limit,
      category,
      difficulty,
      minPrice,
      maxPrice,
    };

    // Create FormData for business logic
    const formData = new FormData();
    formData.append('action', 'getToursBusiness');
    formData.append('language', 'es');
    formData.append('filters', JSON.stringify(filters));

    // Call business logic with FormData
    const result = await toursBusinessLogic(formData, '') as ToursResult;
    
    if (!result.error && result.success) {
      toursResponse = {
        success: result.success,
        data: result.data,
        pagination: result.pagination,
      };
    }
  }

  return json({
    tours: toursResponse,
    cityId: cityId || '',
  });
}

export default function Tours() {
  const loaderData = useLoaderData<typeof loader>();
  const citiesContext = useContext(CitiesContext);
  const cities = citiesContext?.cities || [];
  
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State for selected city and tours
  const [selectedCityId, setSelectedCityId] = useState(loaderData.cityId || '');
  const [tours, setTours] = useState<Tour[]>(loaderData.tours.data || []);
  const [pagination, setPagination] = useState(loaderData.tours.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Check if navigation is loading
  const isLoading = navigation.state === 'loading';

  // Handle filter button click - update URL with cityId
  const handleFilter = () => {
    if (!selectedCityId) {
      alert('Por favor selecciona una ciudad');
      return;
    }

    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    setSearchParams({
      cityId: selectedCityId,
      page: '1',
      category,
      difficulty,
      minPrice,
      maxPrice,
    });
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
    setSearchParams({
      cityId: '',
      page: '1',
      category: '',
      difficulty: '',
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
            Gestión de Tours
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-neutral-600)' }}>
            Total: {pagination.total} tours
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
                Ciudad *
              </label>
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
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
                <option value="">Selecciona una ciudad</option>
                {cities.map((city: City) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.country}
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
                Categoría
              </label>
              <select
                name="category"
                value={searchParams.get('category') || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
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
                <option value="">Todas las categorías</option>
                <option value="Cultural">Cultural</option>
                <option value="Food & Drink">Food & Drink</option>
                <option value="Nature">Nature</option>
                <option value="Adventure">Adventure</option>
                <option value="Beach">Beach</option>
              </select>
            </div>

            {/* Difficulty Filter */}
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
                Dificultad
              </label>
              <select
                name="difficulty"
                value={searchParams.get('difficulty') || ''}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
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
                <option value="">Todas las dificultades</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Price Range Filter */}
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
                Precio (MXN)
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={searchParams.get('minPrice') || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="Mín"
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
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
                />
                <span style={{ color: 'var(--color-neutral-500)' }}>-</span>
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={searchParams.get('maxPrice') || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Máx"
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
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
                />
              </div>
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
                Filtrar
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
                Limpiar Filtros
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
        {!isLoading && tours.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            {tours.map((tour: Tour) => (
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

        {/* Empty State */}
        {!isLoading && tours.length === 0 && selectedCityId && (
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
              🏛️
            </div>
            <h3
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-neutral-900)',
                marginBottom: 'var(--space-2)',
              }}
            >
              No se encontraron tours
            </h3>
            <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-4)' }}>
              Intenta ajustar los filtros para ver más resultados.
            </p>
          </div>
        )}

        {/* Initial State - No city selected */}
        {!isLoading && tours.length === 0 && !selectedCityId && (
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
              🌍
            </div>
            <h3
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-neutral-900)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Selecciona una ciudad
            </h3>
            <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-4)' }}>
              Elige una ciudad para ver los tours disponibles.
            </p>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && tours.length > 0 && pagination.totalPages > 1 && (
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
              Anterior
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
              Siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
