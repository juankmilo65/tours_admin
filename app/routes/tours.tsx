/**
 * Tours Route - Tours Management List with Remix Loader
 */

import { useEffect, useState } from 'react';
import { useLoaderData, useFetcher, useNavigation, useSearchParams } from '@remix-run/react';
import { data, type LoaderFunctionArgs } from '@remix-run/node';
import { TourCard } from '~/components/tours/TourCard';
import { getSession } from '~/utilities/sessions';
import tourBL from '~/server/businessLogic/toursBusinessLogic';
import type { Tour, PayloadTourDataProps, TourFilters, PayloadPropertyProps } from '~/types/PayloadTourDataProps';

/**
 * Get tours using business logic
 */
const getTours = async (filters: TourFilters = {}, language: string = 'es') => {
  try {
    const formData = new FormData();
    formData.append('action', 'getToursBusiness');
    formData.append('filters', JSON.stringify(filters));
    formData.append('language', language);
  
    const tours = await tourBL(formData);
    
  
    return tours;
  } catch (error) {
    console.error('Error getting tours:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
    };
  }
};

/**
 * Actions loader - handles different actions
 */
const actionsLoader = async (action: string, parameters: PayloadPropertyProps) => {
  const ACTIONS = {
    getTours: async () => await getTours(parameters.filters || {}, parameters.language || 'es'),
    // TODO: Add more actions here as needed
    // updateTour: async () => await updateTour(...),
    // deleteTour: async () => await deleteTour(...),
    // createTour: async () => await createTour(...),
  };

  if (action && action in ACTIONS) {
    return ACTIONS[action as keyof typeof ACTIONS]();
  }
  throw new Error(`Invalid action: ${action}`);
};

/**
 * Loader function - runs on the server
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const session = await getSession(request.headers.get('Cookie'));
    const token = session.get('id_token');

    // Get query parameters
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '10';
    const category = url.searchParams.get('category') || '';
    const city = url.searchParams.get('city') || '';
    const difficulty = url.searchParams.get('difficulty') || '';
    const minPrice = url.searchParams.get('minPrice') || '';
    const maxPrice = url.searchParams.get('maxPrice') || '';
    const action = url.searchParams.get('action');

    // Build filters
    const filters: TourFilters = {
      countryCode: 'CO',
      page,
      limit,
      ...(category && { category }),
      ...(city && { city }),
      ...(difficulty && { difficulty }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
    };

    // Clear session status
    session.set('statusCode', undefined);
    session.set('statusText', undefined);

    let tours: PayloadTourDataProps;

    // Handle different actions with switch
    switch (action) {
      case 'getTours':
        tours = (await actionsLoader('getTours', { filters, language: 'es', token })) as PayloadTourDataProps;
        break;
      // TODO: Add more cases here
      // case 'updateTour':
      //   tours = (await actionsLoader('updateTour', { filters, language: 'es', token })) as PayloadTourDataProps;
      //   break;
      default:
        tours = (await actionsLoader('getTours', { filters, language: 'es', token })) as PayloadTourDataProps;
        break;
    }
console.log('📦 Loader fetched tours:', tours);
    console.log('   - success:', tours?.success);
    console.log('   - data length:', tours?.data?.length);
    console.log('   - pagination:', tours?.pagination);
    return data({ tours });
  } catch (error) {
    console.error('Error in loader:', error);
    return data(
      {
        tours: {
          success: false,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
        }
      },
      { status: 500 }
    );
  }
}

export default function Tours() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract tours data from loader
  console.log('🔍 Loader data:', loaderData);
  // Access data.tours because data() wraps the response
  const toursData = ((loaderData as any)?.data?.tours || (loaderData as any)?.tours) as PayloadTourDataProps;
  console.log('🔍 Tours data extracted:', toursData);
  
  const [tours, setTours] = useState<Tour[]>(toursData?.data || []);
  const [pagination, setPagination] = useState(toursData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Update state when loader data changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - toursData:', toursData);
    if (toursData) {
      console.log('✅ Tours data found:', toursData);
      console.log('   - data array:', toursData.data);
      console.log('   - pagination:', toursData.pagination);
      setTours(toursData.data || []);
      setPagination(toursData.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } else {
      console.log('❌ No tours data available');
    }
  }, [toursData]);

  // Check if navigation is loading
  const isLoading = navigation.state === 'loading';

  // Handle page change - navigates to new URL
  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  // Handle filter changes - navigates to new URL
  const handleFilterChange = (key: string, value: string) => {
    setSearchParams((prev) => {
      prev.set(key, value);
      prev.set('page', '1'); // Reset to first page
      return prev;
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchParams((prev) => {
      prev.delete('city');
      prev.delete('category');
      prev.delete('difficulty');
      prev.delete('minPrice');
      prev.delete('maxPrice');
      prev.set('page', '1');
      return prev;
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
            {/* City Filter */}
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
                Ciudad
              </label>
              <input
                type="text"
                name="city"
                defaultValue={searchParams.get('city') || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange('city', e.currentTarget.value);
                  }
                }}
                placeholder="Todas las ciudades"
                style={{
                  width: '100%',
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
                defaultValue={searchParams.get('category') || ''}
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
                defaultValue={searchParams.get('difficulty') || ''}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFilterChange('minPrice', e.currentTarget.value);
                    }
                  }}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFilterChange('maxPrice', e.currentTarget.value);
                    }
                  }}
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
        {!isLoading && tours.length === 0 && (
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
