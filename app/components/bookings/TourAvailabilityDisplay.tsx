import type React from 'react';
import type { TourAvailabilityData } from '~/types/tourAvailability';
import { useTranslation } from '~/lib/i18n/utils';

interface TourAvailabilityDisplayProps {
  availability: TourAvailabilityData | null;
  isLoading: boolean;
  error?: string;
}

export function TourAvailabilityDisplay({
  availability,
  isLoading,
  error,
}: TourAvailabilityDisplayProps): React.JSX.Element | null {
  const { language } = useTranslation();

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-neutral-50)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-neutral-200)',
          marginTop: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            color: 'var(--color-neutral-600)',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid var(--color-neutral-300)',
              borderTopColor: 'var(--color-primary-500)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: 'var(--text-sm)' }}>
            {language === 'en' ? 'Checking availability...' : 'Verificando disponibilidad...'}
          </span>
        </div>
      </div>
    );
  }

  if (error !== undefined && error !== '') {
    return (
      <div
        style={{
          padding: 'var(--space-4)',
          backgroundColor: '#fef2f2',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #fecaca',
          marginTop: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: '#dc2626',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{error}</span>
        </div>
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  const percentage = Number.parseFloat(availability.availabilityPercentage);
  const isFullyBooked = percentage >= 100 || availability.availableSlots === 0;
  const isLimited = percentage >= 70 && percentage < 100;

  // Determine color based on availability
  const getStatusColor = (): string => {
    if (isFullyBooked) return '#dc2626'; // red
    if (isLimited) return '#f59e0b'; // amber
    return '#16a34a'; // green
  };

  const getStatusBgColor = (): string => {
    if (isFullyBooked) return '#fef2f2';
    if (isLimited) return '#fffbeb';
    return '#f0fdf4';
  };

  const getStatusBorderColor = (): string => {
    if (isFullyBooked) return '#fecaca';
    if (isLimited) return '#fcd34d';
    return '#86efac';
  };

  const getStatusText = (): string => {
    if (isFullyBooked) {
      return language === 'en' ? 'Fully Booked' : 'Sin cupos';
    }
    if (isLimited) {
      return language === 'en' ? 'Limited Availability' : 'Disponibilidad limitada';
    }
    return language === 'en' ? 'Available' : 'Disponible';
  };

  const getStatusIcon = (): string => {
    if (isFullyBooked) return '✕';
    if (isLimited) return '⚠';
    return '✓';
  };

  return (
    <div
      style={{
        marginTop: 'var(--space-4)',
        padding: 'var(--space-5)',
        backgroundColor: getStatusBgColor(),
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${getStatusBorderColor()}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header with Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {getStatusIcon()}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: getStatusColor(),
              }}
            >
              {getStatusText()}
            </h3>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-neutral-600)',
              }}
            >
              {language === 'en' ? 'Tour Availability' : 'Disponibilidad del Tour'}
            </span>
          </div>
        </div>
        <div
          style={{
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: getStatusColor(),
            }}
          >
            {percentage.toFixed(1)}%
          </div>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-600)',
            }}
          >
            {language === 'en' ? 'Occupied' : 'Ocupado'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            width: '100%',
            height: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${Math.min(percentage, 100)}%`,
              height: '100%',
              backgroundColor: getStatusColor(),
              borderRadius: '6px',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-4)',
        }}
      >
        {/* Available Slots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {language === 'en' ? 'Available Slots' : 'Cupos Disponibles'}
          </span>
          <span
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: getStatusColor(),
            }}
          >
            {availability.availableSlots}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-500)',
            }}
          >
            {language === 'en' ? 'of' : 'de'} {availability.maxCapacity}{' '}
            {language === 'en' ? 'total' : 'total'}
          </span>
        </div>

        {/* Bookings Summary */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {language === 'en' ? 'Bookings' : 'Reservas'}
          </span>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                }}
              >
                {availability.bookingsDetails.totalBookings}
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                }}
              >
                {language === 'en' ? 'Total' : 'Total'}
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#16a34a',
                }}
              >
                {availability.bookingsDetails.confirmedBookings}
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                }}
              >
                {language === 'en' ? 'Confirmed' : 'Confirmadas'}
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#f59e0b',
                }}
              >
                {availability.bookingsDetails.pendingBookings}
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                }}
              >
                {language === 'en' ? 'Pending' : 'Pendientes'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Action Message */}
      {!availability.canCreateBooking && (
        <div
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            backgroundColor: '#fee2e2',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #fca5a5',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: '#dc2626',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
              {language === 'en'
                ? 'This tour is fully booked for the selected dates. Please choose different dates.'
                : 'Este tour está completamente reservado para las fechas seleccionadas. Por favor selecciona otras fechas.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
