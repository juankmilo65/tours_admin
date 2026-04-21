/**
 * TermsModal
 * Displays terms & conditions master list in a scrollable modal.
 * Last-version items are shown in green; older versions in red.
 * Accepting closes the modal and notifies the parent.
 */

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { getTermsMasterByType } from '~/server/termsMaster';
import type { TermsMasterItem } from '~/server/termsMaster';

interface TermsModalProps {
  language: string;
  onAccept: () => void;
  onClose: () => void;
  isAlreadyAccepted?: boolean;
  isAccepting?: boolean;
  acceptError?: string | null;
}

export function TermsModal({
  language,
  onAccept,
  onClose,
  isAlreadyAccepted = false,
  isAccepting = false,
  acceptError = null,
}: TermsModalProps): JSX.Element {
  const [items, setItems] = useState<TermsMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (en: string, es: string): string => (language === 'en' ? en : es);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const result = await getTermsMasterByType('registration', '1.0', language);
      if (result.success && result.data !== undefined && result.data.length > 0) {
        setItems(result.data);
      } else {
        setError(t('Could not load terms.', 'No se pudieron cargar los términos.'));
      }
      setIsLoading(false);
    })();
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = (): void => {
    onAccept();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={(e) => {
        if (!isAccepting && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-neutral-0, #ffffff)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-neutral-100, #f3f4f6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--color-neutral-900, #111827)',
            }}
          >
            {t('Terms & Conditions', 'Términos y Condiciones')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close', 'Cerrar')}
            disabled={isAccepting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              padding: '4px',
              color: 'var(--color-neutral-500, #6b7280)',
              display: 'flex',
              alignItems: 'center',
              opacity: isAccepting ? 0.55 : 1,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {isLoading && (
            <p
              style={{
                color: 'var(--color-neutral-400, #9ca3af)',
                textAlign: 'center',
                margin: 'auto',
              }}
            >
              {t('Loading...', 'Cargando...')}
            </p>
          )}

          {!isLoading && error !== null && (
            <p
              style={{
                color: 'var(--color-error-600, #dc2626)',
                textAlign: 'center',
                margin: 'auto',
              }}
            >
              {error}
            </p>
          )}

          {!isLoading &&
            error === null &&
            items.map((item) => {
              const isLatest = item.isLastVersion;
              const content = language === 'en' ? item.termsConditions_en : item.termsConditions_es;

              return (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${isLatest ? 'var(--color-success-200, #bbf7d0)' : 'var(--color-error-200, #fecaca)'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Version header */}
                  <div
                    style={{
                      padding: '10px 16px',
                      backgroundColor: isLatest
                        ? 'var(--color-success-50, #f0fdf4)'
                        : 'var(--color-error-50, #fef2f2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isLatest
                          ? 'var(--color-success-700, #15803d)'
                          : 'var(--color-error-700, #b91c1c)',
                      }}
                    >
                      {t('Version', 'Versión')} {item.version}
                    </span>

                    {isLatest && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-success-700, #15803d)',
                          backgroundColor: 'var(--color-success-100, #dcfce7)',
                          border: '1px solid var(--color-success-300, #86efac)',
                          borderRadius: '999px',
                          padding: '2px 8px',
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t('Latest', 'Última versión')}
                      </span>
                    )}

                    {!isLatest && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-error-700, #b91c1c)',
                          backgroundColor: 'var(--color-error-100, #fee2e2)',
                          border: '1px solid var(--color-error-300, #fca5a5)',
                          borderRadius: '999px',
                          padding: '2px 8px',
                        }}
                      >
                        {t('Old version', 'Versión anterior')}
                      </span>
                    )}

                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: 'var(--color-neutral-400, #9ca3af)',
                      }}
                    >
                      {new Date(item.updatedAt).toLocaleDateString(
                        language === 'en' ? 'en-US' : 'es-CO',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--color-neutral-0, #ffffff)',
                      maxHeight: '52vh',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        lineHeight: '1.7',
                        color: 'var(--color-neutral-700, #374151)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'inherit',
                      }}
                    >
                      {content}
                    </pre>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-neutral-100, #f3f4f6)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0,
            backgroundColor: 'var(--color-neutral-0, #ffffff)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isAccepting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: 'var(--color-neutral-600, #4b5563)',
              border: '1px solid var(--color-neutral-300, #d1d5db)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              opacity: isAccepting ? 0.6 : 1,
            }}
          >
            {t('Close', 'Cerrar')}
          </button>

          {!isAlreadyAccepted && (
            <button
              type="button"
              onClick={handleAccept}
              disabled={isLoading || error !== null || isAccepting}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-success-600, #16a34a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isLoading || error !== null || isAccepting ? 'not-allowed' : 'pointer',
                opacity: isLoading || error !== null || isAccepting ? 0.6 : 1,
              }}
            >
              {isAccepting ? t('Saving...', 'Guardando...') : t('Accept Terms', 'Aceptar Términos')}
            </button>
          )}
        </div>

        {acceptError !== null && (
          <div
            style={{
              padding: '0 24px 16px 24px',
              color: 'var(--color-error-700, #b91c1c)',
              fontSize: '13px',
              textAlign: 'right',
            }}
          >
            {acceptError}
          </div>
        )}
      </div>
    </div>
  );
}
