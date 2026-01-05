/**
 * Tour Card Component
 * Displays tour information in a card format
 */

import type { TranslatedTour } from '~/types/PayloadTourDataProps';
import { useTranslation } from '~/lib/i18n/utils';

interface TourCardProps {
  tour: TranslatedTour;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TourCard({ tour, onViewDetails, onEdit, onDelete }: TourCardProps) {
  const { t } = useTranslation();
  const hasActiveOffer = tour.offers && tour.offers.length > 0 && tour.offers[0]?.isActive;
  const discount = hasActiveOffer ? tour.offers[0]?.discountPercentage || 0 : 0;
  const discountedPrice = discount > 0 ? tour.base_price * (1 - discount / 100) : tour.base_price;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return { bg: '#D1FAE5', text: '#065F46' }; // verde
      case 'medium':
        return { bg: '#FEF3C7', text: '#92400E' }; // amarillo
      case 'hard':
        return { bg: '#FEE2E2', text: '#991B1B' }; // rojo
      default:
        return { bg: '#E5E7EB', text: '#374151' }; // gris
    }
  };

  const difficultyColors = getDifficultyColor(tour.difficulty);

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        border: '1px solid var(--color-neutral-200)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
        <img
          src={tour.imageUrl}
          alt={tour.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onClick={() => onViewDetails(tour.id)}
        />
        {hasActiveOffer && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: '#EF4444',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            {discount}% OFF
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: difficultyColors.bg,
            color: difficultyColors.text,
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            textTransform: 'capitalize',
          }}
        >
          {tour.difficulty}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Category and City */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-primary-600)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {tour.category?.name || 'Sin categoría'}
          </span>
          <span style={{ color: 'var(--color-neutral-300)' }}>•</span>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-neutral-600)',
            }}
          >
            {tour.city?.name || 'Ciudad'}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            marginBottom: 'var(--space-2)',
            marginTop: 'var(--space-1)',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {tour.title}
        </h3>

        {/* Short Description */}
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-neutral-600)',
            marginBottom: 'var(--space-3)',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {tour.shortDescription}
        </p>

        {/* Info Row */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-3)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-neutral-600)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⏱️</span>
            <span>{tour.duration}h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>👥</span>me 
            <span>{tour.maxCapacity}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🗣️</span>
            <span>{tour.language?.[0] || 'ES'}</span>
          </div>
        </div>

        {/* Price */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div>
            {discount > 0 && (
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-neutral-500)',
                  textDecoration: 'line-through',
                  marginRight: 'var(--space-2)',
                }}
              >
                ${tour.base_price}
              </span>
            )}
            <span
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-primary-700)',
              }}
            >
              ${discountedPrice.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-neutral-600)',
                marginLeft: '2px',
              }}
            >
              {tour.currency}
            </span>
          </div>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: tour.isActive ? '#10B981' : '#EF4444',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {tour.isActive ? `✅ ${t('common.active')}` : `❌ ${t('common.inactive')}`}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => onViewDetails(tour.id)}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
            }}
          >
            {t('tours.viewDetails')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tour.id);
            }}
            style={{
              padding: 'var(--space-2) var(--space-3)',
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
            title={t('common.edit')}
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(t('common.confirm'))) {
                onDelete(tour.id);
              }
            }}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'var(--color-error-50)',
              color: 'var(--color-error-600)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-error-100)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
            }}
            title={t('common.delete')}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
