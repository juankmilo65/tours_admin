/**
 * BookingClientsModal
 * Informational modal that displays the list of clients for a booking.
 */

import type { JSX } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEs, bookingEn } from '~/lib/i18n';
import type { BookingClient } from '~/types/booking';

interface BookingClientsModalProps {
  isOpen: boolean;
  clients: BookingClient[];
  confirmationCode?: string;
  onClose: () => void;
}

export function BookingClientsModal({
  isOpen,
  clients,
  confirmationCode,
  onClose,
}: BookingClientsModalProps): JSX.Element | null {
  const { language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(560px, 96%)',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
              {bookingsT.clients}
            </h3>
            {confirmationCode !== undefined && confirmationCode !== '' && (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                {bookingsT.confirmationCode}: {confirmationCode}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af',
              fontSize: '1.25rem',
              lineHeight: 1,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {clients.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', margin: '24px 0' }}>
              {bookingsT.notSpecified}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clients.map((client, index) => (
                <div
                  key={client.id ?? index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {/* Index badge */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Client info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827' }}>
                        {client.clientName}
                      </div>
                      {client.isPrimary === true && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            color="#1d4ed8"
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                          {language === 'en' ? 'Primary' : 'Principal'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                      {bookingsT.clientAge}: {client.clientAge}{' '}
                      {language === 'en' ? 'years' : 'años'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Accept' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
