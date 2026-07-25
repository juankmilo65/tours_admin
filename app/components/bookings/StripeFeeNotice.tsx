/**
 * StripeFeeNotice
 * Informational payment breakdown split into two sections:
 *  - Anticipo (deposit): always paid online via Stripe, so it carries IVA + the
 *    processing fee the customer covers.
 *  - Excedente (balance): defaults to cash at the meeting point (no fee), but can
 *    be toggled to card, which surfaces the same net + IVA + fee breakdown.
 * Rates, fixed fees and decimals come from the backend currency config (passed in
 * via `methodFee`/`decimals`) — never hardcoded. The fee is grossed up over
 * (net + IVA) so that amount arrives intact. Display-only; the backend is the source
 * of truth and reconciles with the real balance_transaction.
 */

import type { CSSProperties, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { computeStripeChargeBreakdown } from '~/services/bookingService';
import type { CurrencyMethodConfig } from '~/types/currencyConfig';

interface StripeFeeNoticeProps {
  /** Net (pre-IVA) online-charged deposit the estimate is built on. */
  anticipo: number;
  /** Net (pre-IVA) balance collected after the deposit (cash by default, optionally card). */
  excedente: number;
  /** ISO currency code of the booking (e.g. 'MXN'). */
  currency: string;
  /** Decimal places for this currency (from config); defaults to 2. */
  decimals?: number;
  /** IVA rate for the booking's country (from config); defaults to 0. */
  taxRate?: number;
  /** Resolved method fee (rate + fixedFee + label) from the backend config; null when unavailable. */
  methodFee?: CurrencyMethodConfig | null;
  /** Optional style overrides for spacing tweaks from the parent layout. */
  style?: CSSProperties;
}

export function StripeFeeNotice({
  anticipo,
  excedente,
  currency,
  decimals = 2,
  taxRate = 0,
  methodFee,
  style,
}: StripeFeeNoticeProps): JSX.Element | null {
  const { language } = useTranslation();
  const bookingsT = language === 'en' ? bookingEn : bookingEs;
  // Balance is assumed paid in cash unless the operator toggles to card.
  const [balanceMethod, setBalanceMethod] = useState<'cash' | 'card'>('cash');

  const hasAnticipo = Number.isFinite(anticipo) && anticipo > 0;
  const hasExcedente = Number.isFinite(excedente) && excedente > 0;

  // Nothing to disclose when neither section carries a positive amount.
  if (!hasAnticipo && !hasExcedente) {
    return null;
  }

  const money = (value: number): string => `${currency} ${value.toFixed(decimals)}`;

  const {
    anticipoLabel,
    feeHeader,
    excedenteLabel,
    meetingPointNote,
    selectMethodHint,
    balanceHowLabel,
    balanceCashOption,
    balanceCardOption,
    neto,
    comision,
    totalToPay,
  } = bookingsT.stripeFee;

  const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8 };
  const feeRowStyle: CSSProperties = { ...rowStyle, paddingLeft: 12 };
  const toggleButtonStyle = (active: boolean): CSSProperties => ({
    padding: '2px 10px',
    borderRadius: 6,
    border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
    background: active ? '#eff6ff' : '#ffffff',
    color: active ? '#1d4ed8' : '#64748b',
    fontWeight: active ? 600 : 500,
    fontSize: '0.72rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  // Itemized net + IVA + fee + total for one online charge, using the config method.
  const renderBreakdown = (net: number, fee: CurrencyMethodConfig): JSX.Element | null => {
    if (!Number.isFinite(net) || net <= 0) {
      return null;
    }
    const b = computeStripeChargeBreakdown(net, taxRate, fee.rate, fee.fixedFee, decimals);
    return (
      <>
        <div style={feeRowStyle}>
          <span>{neto}</span>
          <span>{money(b.netAmount)}</span>
        </div>
        <div style={feeRowStyle}>
          <span>{bookingsT.iva}</span>
          <span>{money(b.taxAmount)}</span>
        </div>
        <div style={feeRowStyle}>
          <span>
            {comision} ({fee.label})
          </span>
          <span>{money(b.feeAmount)}</span>
        </div>
        <div style={{ ...feeRowStyle, fontWeight: 600, color: '#334155' }}>
          <span>{totalToPay}</span>
          <span>{money(b.totalAmount)}</span>
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginTop: 8,
        padding: '8px 12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: '0.72rem',
        lineHeight: 1.45,
        color: '#64748b',
        ...style,
      }}
    >
      {hasAnticipo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rowStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">💳</span>
              <span style={{ fontWeight: 600 }}>{anticipoLabel}</span>
            </span>
          </div>
          {methodFee ? (
            <>
              <span>{feeHeader}</span>
              {renderBreakdown(anticipo, methodFee)}
            </>
          ) : (
            <span style={{ fontStyle: 'italic' }}>{selectMethodHint}</span>
          )}
        </div>
      )}
      {hasExcedente && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rowStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">💵</span>
              <span style={{ fontWeight: 600 }}>{excedenteLabel}</span>
            </span>
            <span style={{ fontWeight: 600 }}>{money(excedente)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{balanceHowLabel}</span>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setBalanceMethod('cash')}
                style={toggleButtonStyle(balanceMethod === 'cash')}
              >
                {balanceCashOption}
              </button>
              <button
                type="button"
                onClick={() => setBalanceMethod('card')}
                style={toggleButtonStyle(balanceMethod === 'card')}
              >
                {balanceCardOption}
              </button>
            </div>
          </div>
          {balanceMethod === 'cash' && <span>{meetingPointNote}</span>}
          {balanceMethod === 'card' &&
            (methodFee ? (
              <>
                <span>{feeHeader}</span>
                {renderBreakdown(excedente, methodFee)}
              </>
            ) : (
              <span style={{ fontStyle: 'italic' }}>{selectMethodHint}</span>
            ))}
        </div>
      )}
    </div>
  );
}
