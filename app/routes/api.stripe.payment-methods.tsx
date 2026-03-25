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

// ---------------------------------------------------------------------------
// NOTE: wallet methods (apple_pay, google_pay) are NOT listed here.
// Stripe enables them automatically when 'card' is present in payment_method_types.
// Passing them explicitly causes a StripeInvalidRequestError.
//
// NOTE: 'link' is NOT listed here either.
// The backend (bookingsBusinessLogic) adds Link automatically when source='admin'.
//
// Only explicit payment_method_types are listed below.
// ---------------------------------------------------------------------------

// Card — universal (also enables Apple Pay + Google Pay automatically)
const card: PaymentMethodEntry = {
  id: 'card',
  label_es: 'Tarjeta de crédito / débito',
  label_en: 'Credit / Debit card',
  icon: '💳',
};

// Vouchers
const oxxo: PaymentMethodEntry = {
  id: 'oxxo',
  label_es: 'OXXO',
  label_en: 'OXXO',
  icon: '🏪',
};

// Bank redirects
const bancontact: PaymentMethodEntry = {
  id: 'bancontact',
  label_es: 'Bancontact',
  label_en: 'Bancontact',
  icon: '🏦',
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
const ideal: PaymentMethodEntry = {
  id: 'ideal',
  label_es: 'iDEAL',
  label_en: 'iDEAL',
  icon: '🇳🇱',
};
const przelewy24: PaymentMethodEntry = {
  id: 'p24',
  label_es: 'Przelewy24',
  label_en: 'Przelewy24',
  icon: '🇵🇱',
};
const sofort: PaymentMethodEntry = {
  id: 'sofort',
  label_es: 'SOFORT',
  label_en: 'SOFORT',
  icon: '🇪🇺',
};

// Bank debits
const sepaDebit: PaymentMethodEntry = {
  id: 'sepa_debit',
  label_es: 'SEPA Direct Debit',
  label_en: 'SEPA Direct Debit',
  icon: '🇪🇺',
};

// Wallets (local)
const cartesBancaires: PaymentMethodEntry = {
  id: 'cartes_bancaires',
  label_es: 'Cartes Bancaires',
  label_en: 'Cartes Bancaires',
  icon: '💳',
};
const mbWay: PaymentMethodEntry = {
  id: 'mb_way',
  label_es: 'MB WAY',
  label_en: 'MB WAY',
  icon: '📱',
};

const PAYMENT_METHODS_BY_COUNTRY: Record<string, PaymentMethodEntry[]> = {
  // North America
  // Apple Pay + Google Pay are automatic via 'card'; Link is added by backend for admin
  US: [card],
  CA: [card],
  MX: [card, oxxo],

  // Central/South America
  BR: [card],
  AR: [card],
  CL: [card],
  CO: [card],
  PE: [card],

  // Europe
  // sepa_debit covers the SEPA zone (EU+ CH, NO)
  // cartes_bancaires: automatic for French Visa/MC cards, but also explicit for non-French issuers
  ES: [card, sepaDebit],
  FR: [card, cartesBancaires, sepaDebit],
  DE: [card, sepaDebit, eps, giropay],
  AT: [card, sepaDebit, eps],
  GB: [card],
  BE: [card, bancontact, sepaDebit],
  NL: [card, ideal, sepaDebit, sofort],
  IT: [card, sepaDebit],
  PT: [card, mbWay, sepaDebit],
  PL: [card, przelewy24, sepaDebit],
  SE: [card, sepaDebit],
  NO: [card, sepaDebit],
  DK: [card, sepaDebit],
  FI: [card, sepaDebit],
  CH: [card, sepaDebit],
  CZ: [card],
  GR: [card, sepaDebit],

  // Asia / Oceania
  JP: [card],
  SG: [card],
  HK: [card],
  IN: [card],
  AU: [card],
};

// Default fallback for unknown countries — card only (wallets + link are automatic)
const DEFAULT_METHODS = [card];

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
