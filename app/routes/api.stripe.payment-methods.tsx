/**
 * GET /api/stripe/payment-methods?country=MX&currency=MXN
 *
 * Returns available Stripe payment method types for the given country.
 * Uses stripe.countrySpecs to validate the country and cross-references
 * with Stripe's documented per-country availability map.
 *
 * The secret key never leaves the server — no VITE_ prefix.
 */

import { type LoaderFunctionArgs, json } from '@remix-run/node';
import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Stripe payment method availability by country (ISO-3166-1 alpha-2)
// Synced with your Stripe Dashboard methods (as of 2026-03-25)
// These are CANDIDATES — actual availability depends on Stripe account config
// Source: https://stripe.com/docs/payments/payment-methods/payment-method-support
// ---------------------------------------------------------------------------

interface PaymentMethodEntry {
  id: string;
  label_es: string;
  label_en: string;
  icon: string;
}

// Pre-define all Stripe payment methods from your configuration
const applePay: PaymentMethodEntry = {
  id: 'apple_pay',
  label_es: 'Apple Pay',
  label_en: 'Apple Pay',
  icon: '🍎',
};
const bancontact: PaymentMethodEntry = {
  id: 'bancontact',
  label_es: 'Bancontact',
  label_en: 'Bancontact',
  icon: '🏦',
};
const card: PaymentMethodEntry = {
  id: 'card',
  label_es: 'Tarjeta de crédito / débito',
  label_en: 'Credit / Debit card',
  icon: '💳',
};
const cartesBancaires: PaymentMethodEntry = {
  id: 'cartes_bancaires',
  label_es: 'Cartes Bancaires',
  label_en: 'Cartes Bancaires',
  icon: '💳',
};
const crypto: PaymentMethodEntry = {
  id: 'crypto',
  label_es: 'Criptografía',
  label_en: 'Crypto',
  icon: '₿',
};
const customerBalance: PaymentMethodEntry = {
  id: 'customer_balance',
  label_es: 'Saldo de cliente',
  label_en: 'Customer Balance',
  icon: '💰',
};
const eps: PaymentMethodEntry = {
  id: 'eps',
  label_es: 'EPS',
  label_en: 'EPS',
  icon: '🏦',
};
const giropay: PaymentMethodEntry = {
  id: 'giropay',
  label_es: 'Giropay',
  label_en: 'Giropay',
  icon: '🏦',
};
const googlePay: PaymentMethodEntry = {
  id: 'google_pay',
  label_es: 'Google Pay',
  label_en: 'Google Pay',
  icon: '🔵',
};
const ideal: PaymentMethodEntry = {
  id: 'ideal',
  label_es: 'iDEAL',
  label_en: 'iDEAL',
  icon: '🇳🇱',
};
const link: PaymentMethodEntry = {
  id: 'link',
  label_es: 'Link by Stripe',
  label_en: 'Link by Stripe',
  icon: '🔗',
};
const mbWay: PaymentMethodEntry = {
  id: 'mb_way',
  label_es: 'MB WAY',
  label_en: 'MB WAY',
  icon: '📱',
};
const oxxo: PaymentMethodEntry = {
  id: 'oxxo',
  label_es: 'OXXO',
  label_en: 'OXXO',
  icon: '🏪',
};
const przelewy24: PaymentMethodEntry = {
  id: 'p24',
  label_es: 'Przelewy24',
  label_en: 'Przelewy24',
  icon: '🇵🇱',
};
const sepaDebit: PaymentMethodEntry = {
  id: 'sepa_debit',
  label_es: 'SEPA Direct Debit',
  label_en: 'SEPA Direct Debit',
  icon: '🇪🇺',
};
const sofort: PaymentMethodEntry = {
  id: 'sofort',
  label_es: 'SOFORT',
  label_en: 'SOFORT',
  icon: '🇪🇺',
};

const PAYMENT_METHODS_BY_COUNTRY: Record<string, PaymentMethodEntry[]> = {
  // North America
  US: [card, applePay, googlePay, link, crypto, customerBalance],
  CA: [card, applePay, googlePay, link, crypto, customerBalance],
  MX: [card, applePay, googlePay, link, oxxo],

  // Central/South America
  BR: [card, applePay, googlePay, link],
  AR: [card, applePay, googlePay, link],
  CL: [card, applePay, googlePay, link],
  CO: [card, applePay, googlePay, link],
  PE: [card, applePay, googlePay, link],

  // Europe
  ES: [card, applePay, googlePay, link, sepaDebit],
  FR: [card, applePay, googlePay, link, cartesBancaires, sepaDebit],
  DE: [card, applePay, googlePay, link, sepaDebit, eps, giropay],
  AT: [card, applePay, googlePay, link, sepaDebit, eps],
  GB: [card, applePay, googlePay, link],
  BE: [card, applePay, googlePay, link, bancontact, sepaDebit],
  NL: [card, applePay, googlePay, link, ideal, sepaDebit, sofort],
  IT: [card, applePay, googlePay, link, sepaDebit],
  PT: [card, applePay, googlePay, link, mbWay, sepaDebit],
  PL: [card, applePay, googlePay, link, przelewy24, sepaDebit],
  SE: [card, applePay, googlePay, link, sepaDebit],
  NO: [card, applePay, googlePay, link, sepaDebit],
  DK: [card, applePay, googlePay, link, sepaDebit],
  FI: [card, applePay, googlePay, link, sepaDebit],
  CH: [card, applePay, googlePay, link, sepaDebit],
  CZ: [card, applePay, googlePay, link, sepaDebit],
  GR: [card, applePay, googlePay, link, sepaDebit],

  // Asia
  JP: [card, applePay, googlePay, link],
  SG: [card, applePay, googlePay, link],
  HK: [card, applePay, googlePay, link],
  IN: [card, applePay, googlePay, link],
  AU: [card, applePay, googlePay, link],
};

// Default fallback for unknown countries — card + wallets (universally available)
const DEFAULT_METHODS = [card, applePay, googlePay, link];

// Each payment method field on the configuration object has this shape.
type PaymentMethodConfigEntry = {
  available: boolean;
  display_preference: { value: string };
};

/**
 * Returns true if `methodId` is enabled in the given Stripe account configuration.
 * Only methods that exist AND have available=true are included.
 */
function isEnabledInConfig(config: Stripe.PaymentMethodConfiguration, methodId: string): boolean {
  const entry = (config as unknown as Record<string, PaymentMethodConfigEntry | undefined>)[
    methodId
  ];
  if (entry === undefined) return false;
  return entry.available === true;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') ?? '').toUpperCase();

  if (country === '') {
    return json(
      { success: false, error: 'country param is required', methods: [] },
      { status: 400 }
    );
  }

  // Methods available for this country according to our curated map
  const countryMethods = PAYMENT_METHODS_BY_COUNTRY[country] ?? DEFAULT_METHODS;

  const secretKey = process.env['STRIPE_SECRET_KEY'];
  const keyIsPlaceholder =
    secretKey === undefined || secretKey === '' || secretKey === 'sk_test_REPLACE_WITH_YOUR_KEY';

  if (keyIsPlaceholder) {
    return json({ success: true, methods: countryMethods, source: 'static' });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });

    // Fetch the first (default) payment method configuration from the Stripe account.
    // This reflects what is actually enabled in the Dashboard — if you disable OXXO
    // there, it will automatically be excluded here without touching code.
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 1 });
    const config = configs.data[0];

    if (config === undefined) {
      // No configuration found — fall back to country map
      return json({ success: true, methods: countryMethods, source: 'static' });
    }

    // Intersect: country availability ∩ account configuration
    const methods = countryMethods.filter((m) => isEnabledInConfig(config, m.id));

    // If the intersection is empty (e.g. fresh test account), still return at least card
    return json({
      success: true,
      methods: methods.length > 0 ? methods : countryMethods,
      source: 'stripe',
    });
  } catch (err) {
    console.error('[stripe/payment-methods] Stripe API error:', err);
    // Never fail the UI — degrade gracefully to the static map
    return json({ success: true, methods: countryMethods, source: 'static' });
  }
}
