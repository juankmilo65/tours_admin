/**
 * Tour Card Component
 * Modern card layout with clean iconography and refined spacing
 */

import React from 'react';
import type { TranslatedTour } from '~/types/PayloadTourDataProps';
import { useTranslation } from '~/lib/i18n/utils';
import { useNavigate } from '@remix-run/react';
import { useAppDispatch } from '~/store/hooks';
import { setGlobalLoading } from '~/store/slices/uiSlice';

/* ── Inline SVG Icons (16×16, stroke-based) ─────────────────────── */
const CalendarIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const UsersIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const GlobeIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
  </svg>
);
const TicketIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);
const PencilIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
const EyeIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const MapPinIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

interface TourCardProps {
  tour: TranslatedTour;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
}

export function TourCard({
  tour,
  onViewDetails,
  onEdit,
  onDelete,
  onClone,
}: TourCardProps): React.JSX.Element {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const hasActiveOffer =
    tour.offers !== undefined &&
    tour.offers !== null &&
    tour.offers.length > 0 &&
    tour.offers[0]?.isActive === true;
  const discount = hasActiveOffer ? (tour.offers[0]?.discountPercentage ?? 0) : 0;
  const discountedPrice = discount > 0 ? tour.base_price * (1 - discount / 100) : tour.base_price;

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return { bg: 'rgba(16,185,129,.12)', text: '#059669', border: 'rgba(16,185,129,.25)' };
      case 'medium':
        return { bg: 'rgba(245,158,11,.12)', text: '#d97706', border: 'rgba(245,158,11,.25)' };
      case 'hard':
        return { bg: 'rgba(239,68,68,.10)', text: '#dc2626', border: 'rgba(239,68,68,.22)' };
      default:
        return { bg: 'rgba(100,116,139,.10)', text: '#475569', border: 'rgba(100,116,139,.20)' };
    }
  };

  const diff = getDifficultyStyle(tour.difficulty);

  /* ── Shared micro-styles ──────────────────────────────────────── */
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-neutral-600)',
    lineHeight: 1,
  };

  const actionBtnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-lg)',
    transition: 'all .18s ease',
    lineHeight: 1,
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        transition:
          'transform .22s cubic-bezier(.4,0,.2,1), box-shadow .22s cubic-bezier(.4,0,.2,1)',
        cursor: 'pointer',
        border: '1px solid var(--color-neutral-200)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)';
      }}
    >
      {/* ── Image Hero ──────────────────────────────────────────── */}
      <div
        style={{ position: 'relative', height: '190px', overflow: 'hidden' }}
        onClick={() => onViewDetails?.()}
      >
        <img
          src={tour.imageUrl}
          alt={tour.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Gradient scrim for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,.02) 40%, rgba(0,0,0,.35) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top-left badges */}
        <div
          style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}
        >
          {hasActiveOffer && tour.offers !== undefined && tour.offers !== null && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '.3px',
                lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,.25)',
              }}
            >
              -{discount}%
            </span>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(0,0,0,.55)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'capitalize',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              lineHeight: 1.4,
              boxShadow: '0 2px 8px rgba(0,0,0,.18)',
              border: '1px solid rgba(255,255,255,.12)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: diff.text,
                flexShrink: 0,
                boxShadow: `0 0 4px ${diff.text}`,
              }}
            />
            {tour.difficulty}
          </span>
        </div>

        {/* Status pill – top-right */}
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(0,0,0,.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,.12)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 600,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tour.isActive ? '#10b981' : '#ef4444',
              flexShrink: 0,
              boxShadow: `0 0 4px ${tour.isActive ? '#10b981' : '#ef4444'}`,
            }}
          />
          {tour.isActive ? t('common.active') : t('common.inactive')}
        </span>

        {/* Bottom overlay – city */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: 'rgba(0,0,0,.50)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,.18)',
          }}
        >
          <MapPinIcon />
          {tour.city?.name ?? 'Ciudad'}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Category tag */}
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-primary-600)',
            backgroundColor: 'var(--color-primary-50)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            marginBottom: '8px',
            alignSelf: 'flex-start',
            letterSpacing: '.2px',
            textTransform: 'uppercase',
          }}
        >
          {tour.category?.name ?? (language === 'es' ? 'Sin categoría' : 'Uncategorized')}
        </span>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            marginBottom: '4px',
            marginTop: 0,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {tour.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-500)',
            marginBottom: '12px',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {tour.shortDescription}
        </p>

        {/* ── Metadata chips ───────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 12px',
            marginBottom: '14px',
          }}
        >
          <span style={chipStyle}>
            <CalendarIcon />
            {tour.daysCount} {language === 'es' ? 'días' : 'days'}
          </span>
          <span style={chipStyle}>
            <UsersIcon />
            {tour.maxCapacity} {language === 'es' ? 'personas' : 'people'}
          </span>
          <span style={chipStyle}>
            <GlobeIcon />
            {(tour.language ?? []).length > 0
              ? tour.language.map((lang) => lang.toUpperCase()).join(' / ')
              : 'ES'}
          </span>
          <span style={chipStyle}>
            <TicketIcon />
            {tour.bookingCount} {language === 'es' ? 'reservas' : 'bookings'}
          </span>
        </div>

        {/* ── Price row (pushed to bottom via flex spacer) ────── */}
        <div style={{ marginTop: 'auto' }}>
          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: 'var(--color-neutral-200)',
              marginBottom: '12px',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {discount > 0 && (
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-neutral-400)',
                    textDecoration: 'line-through',
                  }}
                >
                  ${tour.base_price.toLocaleString()}
                </span>
              )}
              <span
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-neutral-900)',
                  letterSpacing: '-.3px',
                }}
              >
                ${discountedPrice.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-neutral-400)',
                  fontWeight: 500,
                }}
              >
                {tour.currency}
              </span>
            </div>
          </div>

          {/* ── Action buttons ──────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails?.()}
                style={{
                  ...actionBtnBase,
                  flex: 1,
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-primary-500)',
                  color: '#fff',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <EyeIcon />
                {t('tours.viewDetails')}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit !== undefined) {
                  onEdit();
                } else {
                  dispatch(
                    setGlobalLoading({ isLoading: true, message: 'Cargando tour para edición...' })
                  );
                  navigate(`/tours/${tour.id}/edit`);
                }
              }}
              style={{
                ...actionBtnBase,
                padding: '8px',
                backgroundColor: 'var(--color-neutral-100)',
                color: 'var(--color-neutral-600)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
                e.currentTarget.style.color = 'var(--color-neutral-800)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                e.currentTarget.style.color = 'var(--color-neutral-600)';
              }}
              title={t('common.edit')}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClone !== undefined) onClone();
              }}
              style={{
                ...actionBtnBase,
                padding: '8px',
                backgroundColor: 'var(--color-neutral-100)',
                color: 'var(--color-neutral-600)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-200)';
                e.currentTarget.style.color = 'var(--color-neutral-800)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)';
                e.currentTarget.style.color = 'var(--color-neutral-600)';
              }}
              title={t('common.clone')}
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete !== undefined) onDelete();
              }}
              style={{
                ...actionBtnBase,
                padding: '8px',
                backgroundColor: 'var(--color-error-50)',
                color: 'var(--color-error-500)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-100)';
                e.currentTarget.style.color = 'var(--color-error-700)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                e.currentTarget.style.color = 'var(--color-error-500)';
              }}
              title={t('common.delete')}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
