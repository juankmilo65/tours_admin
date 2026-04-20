/**
 * Stripe Payments Summary Component
 * Displays Stripe payment statistics and breakdown with filters
 */

import type { JSX, CSSProperties } from 'react';
import { useState, useCallback } from 'react';
import { useAppSelector } from '~/store/hooks';
import {
  selectStripePaymentsSummary,
  selectStripePaymentsBreakdown,
  selectStripePaymentsLoading,
} from '~/store/slices/stripePaymentsSlice';
import { selectCurrentUser } from '~/store/slices/authSlice';

interface StripePaymentsSummaryProps {
  onFiltersChange?: (filters: {
    commissionStatus: string;
    paymentType: string;
    isDeposit: boolean | null;
  }) => void;
}

const statusColors: Record<string, { bg: string; text: string; dot: string; accent: string }> = {
  distributed: {
    bg: 'var(--color-success-50)',
    text: 'var(--color-success-700)',
    dot: 'var(--color-success-500)',
    accent: 'var(--color-success-500)',
  },
  pending: {
    bg: 'var(--color-warning-50)',
    text: 'var(--color-warning-700)',
    dot: 'var(--color-warning-500)',
    accent: 'var(--color-warning-500)',
  },
  failed: {
    bg: 'var(--color-error-50)',
    text: 'var(--color-error-700)',
    dot: 'var(--color-error-500)',
    accent: 'var(--color-error-500)',
  },
};

function DashCard({
  children,
  style,
}: {
  children: JSX.Element | JSX.Element[] | string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  currency = 'MXN',
  icon,
  color,
}: {
  label: string;
  value: number;
  currency?: string;
  icon: string;
  color: string;
}): JSX.Element {
  const displayValue = value.toFixed(2);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-500)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-neutral-900)',
            margin: 'var(--space-1) 0 0 0',
          }}
        >
          {currency} {displayValue}
        </p>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${active ? 'var(--color-primary-500)' : 'var(--color-neutral-200)'}`,
        backgroundColor: active ? 'var(--color-primary-50)' : 'white',
        color: active ? 'var(--color-primary-700)' : 'var(--color-neutral-600)',
        fontSize: 'var(--text-xs)',
        fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
      }}
    >
      {label}
    </button>
  );
}

function PaymentRow({
  payment,
}: {
  payment: {
    confirmationCode: string;
    tours: string[];
    amount: number;
    currency: string;
    transferredToOwners: number;
    netPlatformEarning: number;
    commissionStatus: 'distributed' | 'pending' | 'failed';
    paidAt: string;
  };
}): JSX.Element {
  const date = new Date(payment.paidAt);
  const formattedDate = date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = statusColors[payment.commissionStatus] ?? statusColors.pending;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-neutral-100)',
        alignItems: 'center',
      }}
    >
      <div>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0,
          }}
        >
          {payment.confirmationCode}
        </p>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-neutral-500)',
            margin: 'var(--space-1) 0 0 0',
          }}
        >
          {payment.tours.join(', ')}
        </p>
      </div>

      <div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0,
          }}
        >
          {payment.currency} {payment.amount.toFixed(2)}
        </p>
      </div>

      <div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0,
          }}
        >
          {payment.currency} {payment.transferredToOwners.toFixed(2)}
        </p>
      </div>

      <div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color:
              payment.netPlatformEarning >= 0
                ? 'var(--color-success-700)'
                : 'var(--color-error-700)',
            margin: 0,
          }}
        >
          {payment.currency} {payment.netPlatformEarning.toFixed(2)}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: status.dot,
          }}
        />
        <div>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: status.text,
              margin: 0,
              backgroundColor: status.bg,
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'nowrap',
            }}
          >
            {payment.commissionStatus}
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-neutral-500)',
              margin: 'var(--space-1) 0 0 0',
            }}
          >
            {formattedDate} {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StripePaymentsSummary({
  onFiltersChange,
}: StripePaymentsSummaryProps): JSX.Element {
  const currentUser = useAppSelector(selectCurrentUser);
  const summary = useAppSelector(selectStripePaymentsSummary);
  const breakdown = useAppSelector(selectStripePaymentsBreakdown);
  const loading = useAppSelector(selectStripePaymentsLoading);

  const [filters, setFilters] = useState({
    commissionStatus: 'all',
    paymentType: 'all',
    isDeposit: null as boolean | null,
  });

  const handleFilterChange = useCallback(
    (key: string, value: string | boolean | null) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filters, onFiltersChange]
  );

  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <DashCard style={{ padding: 'var(--space-6)' }}>
        <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>
          Cargando estadísticas de Stripe...
        </p>
      </DashCard>
    );
  }

  if (!summary) {
    return (
      <DashCard style={{ padding: 'var(--space-6)' }}>
        <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>
          No hay datos de Stripe disponibles
        </p>
      </DashCard>
    );
  }

  const filteredBreakdown = breakdown?.filter((payment) => {
    let match = true;

    if (filters.commissionStatus !== 'all') {
      match = match && payment.commissionStatus === filters.commissionStatus;
    }

    if (filters.paymentType !== 'all') {
      match = match && payment.paymentType === filters.paymentType;
    }

    if (filters.isDeposit !== null) {
      match = match && payment.isDeposit === filters.isDeposit;
    }

    return match;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <DashCard>
          <SummaryCard
            label="Total Recibido"
            value={summary.totalReceived}
            icon="💳"
            color="var(--color-primary-500)"
          />
        </DashCard>

        <DashCard>
          <SummaryCard
            label="Transferido a Dueños"
            value={summary.totalTransferredToOwners}
            icon="📤"
            color="var(--color-secondary-500)"
          />
        </DashCard>

        {isAdmin && (
          <DashCard>
            <SummaryCard
              label={
                summary.platformEarnings >= 0 ? 'Ganancias de Plataforma' : 'Pérdida de Plataforma'
              }
              value={summary.platformEarnings}
              icon={summary.platformEarnings >= 0 ? '💰' : '📉'}
              color={
                summary.platformEarnings >= 0
                  ? 'var(--color-success-500)'
                  : 'var(--color-error-500)'
              }
            />
          </DashCard>
        )}
      </div>

      {/* Breakdown Section */}
      <DashCard>
        <div
          style={{
            padding: 'var(--space-6)',
            borderBottom: '1px solid var(--color-neutral-200)',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-900)',
              margin: 0,
              marginBottom: 'var(--space-4)',
            }}
          >
            Desglose de Pagos
          </h3>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-2) 0',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Estado
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <FilterButton
                  label="Todos"
                  active={filters.commissionStatus === 'all'}
                  onClick={() => handleFilterChange('commissionStatus', 'all')}
                />
                <FilterButton
                  label="Distribuido"
                  active={filters.commissionStatus === 'distributed'}
                  onClick={() => handleFilterChange('commissionStatus', 'distributed')}
                />
                <FilterButton
                  label="Pendiente"
                  active={filters.commissionStatus === 'pending'}
                  onClick={() => handleFilterChange('commissionStatus', 'pending')}
                />
                <FilterButton
                  label="Fallido"
                  active={filters.commissionStatus === 'failed'}
                  onClick={() => handleFilterChange('commissionStatus', 'failed')}
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-2) 0',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Tipo
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <FilterButton
                  label="Todos"
                  active={filters.paymentType === 'all'}
                  onClick={() => handleFilterChange('paymentType', 'all')}
                />
                <FilterButton
                  label="Final"
                  active={filters.paymentType === 'final'}
                  onClick={() => handleFilterChange('paymentType', 'final')}
                />
                <FilterButton
                  label="Depósito"
                  active={filters.paymentType === 'deposit'}
                  onClick={() => handleFilterChange('paymentType', 'deposit')}
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-neutral-500)',
                  margin: '0 0 var(--space-2) 0',
                  textTransform: 'uppercase',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Es Depósito
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <FilterButton
                  label="Todos"
                  active={filters.isDeposit === null}
                  onClick={() => handleFilterChange('isDeposit', null)}
                />
                <FilterButton
                  label="Sí"
                  active={filters.isDeposit === true}
                  onClick={() => handleFilterChange('isDeposit', true)}
                />
                <FilterButton
                  label="No"
                  active={filters.isDeposit === false}
                  onClick={() => handleFilterChange('isDeposit', false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-neutral-50)',
            borderBottom: '1px solid var(--color-neutral-200)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-600)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Código / Tour
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-600)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Monto
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-600)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Transferido
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-600)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Ganancia Neta
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-600)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Estado / Fecha
          </p>
        </div>

        {/* Table Rows */}
        {filteredBreakdown && filteredBreakdown.length > 0 ? (
          filteredBreakdown.map((payment) => (
            <PaymentRow key={payment.paymentId} payment={payment} />
          ))
        ) : (
          <div
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--color-neutral-500)', margin: 0 }}>
              No hay pagos que coincidan con los filtros seleccionados
            </p>
          </div>
        )}
      </DashCard>
    </div>
  );
}
