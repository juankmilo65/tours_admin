/**
 * StripeFeeNotice
 * Informational, unobtrusive payment breakdown split into two sections:
 *  - Anticipo (deposit): always paid online via Stripe, so it carries IVA + the
 *    processing fee the customer covers. The estimate reacts to the selected
 *    payment method (card local/foreign vs. OXXO).
 *  - Excedente (balance): defaults to cash at the meeting point (no fee), but can
 *    be toggled to card, which surfaces the same net + IVA + fee breakdown.
 * The fee is grossed up over (net + IVA) so that amount arrives intact. Display-only:
 * it estimates amounts for disclosure and never alters any payment sent to the
 * backend. The backend is the source of truth and reconciles with the real
 * balance_transaction. See PROMPT_BACKEND_STRIPE_FEE.md.
 */

import type { CSSProperties, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from '~/lib/i18n/utils';
import { bookingEn, bookingEs } from '~/lib/i18n';
import { computeStripeChargeBreakdown, stripeFeeRate } from '~/services/bookingService';

interface StripeFeeNoticeProps {
  /** Net (pre-IVA) online-charged deposit the estimate is built on. */
  anticipo: number;
  /** Net (pre-IVA) balance collected after the deposit (cash by default, optionally card). */
  excedente: number;
  /** ISO currency code of the booking (e.g. 'MXN'). */
  currency: string;
  /** Selected payment method id ('card' | 'oxxo' | '' for none selected). */
  method: string;
  /** Card origin used to pick which fee assumption to disclose. */
  cardType?: 'local' | 'foreign';
  /** Optional style overrides for spacing tweaks from the parent layout. */
  style?: CSSProperties;
}

const TAX_RATE = 0.16;

export function StripeFeeNotice({
  anticipo,
  excedente,
  currency,
  method,
  cardType = 'local',
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

  const money = (value: number): string => `${currency} ${value.toFixed(2)}`;

  const {
    anticipoLabel,
    feeHeader,
    localLabel,
    foreignLabel,
    oxxoLabel,
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

  // Itemized net + IVA + fee + total for one online charge (card or OXXO).
  const renderBreakdown = (
    net: number,
    feeRate: number,
    methodLabel: string
  ): JSX.Element | null => {
    if (!Number.isFinite(net) || net <= 0) {
      return null;
    }
    const b = computeStripeChargeBreakdown(net, TAX_RATE, feeRate);
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
            {comision} ({methodLabel})
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

  const cardFeeRate = stripeFeeRate('card', cardType);
  const cardLabel = cardType === 'foreign' ? foreignLabel : localLabel;

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
          {method === 'card' && (
            <>
              <span>{feeHeader}</span>
              {renderBreakdown(anticipo, cardFeeRate, cardLabel)}
            </>
          )}
          {method === 'oxxo' && (
            <>
              <span>{feeHeader}</span>
              {renderBreakdown(anticipo, stripeFeeRate('oxxo', 'local'), oxxoLabel)}
            </>
          )}
          {method === '' && <span style={{ fontStyle: 'italic' }}>{selectMethodHint}</span>}
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
          {balanceMethod === 'card' && (
            <>
              <span>{feeHeader}</span>
              {renderBreakdown(excedente, cardFeeRate, cardLabel)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
