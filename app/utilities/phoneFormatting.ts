import type { Country } from '~/store/slices/countriesSlice';

interface PhoneRule {
  min: number;
  max: number;
  formatter: (digits: string) => string;
  placeholder: string;
}

const DEFAULT_PHONE_RULE: PhoneRule = {
  min: 7,
  max: 15,
  formatter: (digits) => digits,
  placeholder: '1234567',
};

const PHONE_RULES_BY_COUNTRY: Record<string, PhoneRule> = {
  MX: {
    min: 10,
    max: 10,
    formatter: (digits) => formatByGroups(digits, [3, 3, 4]),
    placeholder: '333 333 3333',
  },
  CO: {
    min: 10,
    max: 10,
    formatter: (digits) => formatByGroups(digits, [3, 3, 4]),
    placeholder: '333 333 3333',
  },
  US: {
    min: 10,
    max: 10,
    formatter: (digits) => formatByGroups(digits, [3, 3, 4]),
    placeholder: '333 333 3333',
  },
  CA: {
    min: 10,
    max: 10,
    formatter: (digits) => formatByGroups(digits, [3, 3, 4]),
    placeholder: '333 333 3333',
  },
  ES: {
    min: 9,
    max: 9,
    formatter: (digits) => formatByGroups(digits, [3, 3, 3]),
    placeholder: '333 333 333',
  },
  PE: {
    min: 9,
    max: 9,
    formatter: (digits) => formatByGroups(digits, [3, 3, 3]),
    placeholder: '333 333 333',
  },
  CL: {
    min: 9,
    max: 9,
    formatter: (digits) => formatByGroups(digits, [1, 4, 4]),
    placeholder: '9 3333 3333',
  },
  AR: {
    min: 10,
    max: 10,
    formatter: (digits) => formatByGroups(digits, [2, 4, 4]),
    placeholder: '11 3333 3333',
  },
};

function formatByGroups(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let cursor = 0;

  for (const size of groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.join(' ');
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getPhoneRule(countryCode: string | undefined): PhoneRule {
  if (countryCode === undefined || countryCode === '') return DEFAULT_PHONE_RULE;
  return PHONE_RULES_BY_COUNTRY[countryCode] ?? DEFAULT_PHONE_RULE;
}

export function formatPhoneForCountry(phone: string, countryCode: string | undefined): string {
  const digits = normalizePhoneDigits(phone);
  const rule = getPhoneRule(countryCode);
  return rule.formatter(digits.slice(0, rule.max));
}

export function getPhonePlaceholderForCountry(countryCode: string | undefined): string {
  return getPhoneRule(countryCode).placeholder;
}

export function isPhoneValidForCountry(phone: string, countryCode: string | undefined): boolean {
  const digits = normalizePhoneDigits(phone);
  const rule = getPhoneRule(countryCode);
  return digits.length >= rule.min && digits.length <= rule.max;
}

export function getCountryDisplayName(
  country: Country | null,
  language: string,
  fallback: string
): string {
  if (country === null) return fallback;
  return language === 'en' ? country.name_en : country.name_es;
}
