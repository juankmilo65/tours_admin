/**
 * Currency configuration served by the backend (GET /api/config/currencies).
 * Single source of truth for per-currency Stripe rates, fixed fees, minimums, and
 * available payment methods. The front consumes this — it never hardcodes the table.
 */

export interface CurrencyMethodConfig {
  /** Method id, e.g. 'card_national' | 'card_international' | 'oxxo' | 'card'. */
  key: string;
  /** Display label for the method (already localized by the backend). */
  label: string;
  /** Stripe processing rate as a proportion, e.g. 0.036 for 3.6%. */
  rate: number;
  /** Fixed fee in this currency, e.g. 3 (MXN) or 0.3 (USD). */
  fixedFee: number;
}

export interface CurrencyConfig {
  /** ISO currency code, e.g. 'MXN'. */
  code: string;
  /** Currency symbol, e.g. '$'. */
  symbol: string;
  /** Decimal places for display (0 for CLP/PYG). */
  decimals: number;
  /** True for zero-decimal currencies (CLP, PYG) — amounts are whole units. */
  zeroDecimal?: boolean;
  /** Minimum chargeable amount in this currency (Stripe floor). */
  minCharge: number;
  /** Payment methods available for this currency. */
  methods: CurrencyMethodConfig[];
}

export interface CurrenciesConfigResponse {
  currencies: CurrencyConfig[];
  /** IVA rate per ISO COUNTRY code (e.g. { MX: 0.16, CO: 0.19 }) — not per currency. */
  taxRates: Record<string, number>;
}
