import type { Country } from '~/store/slices/countriesSlice';
import type { Language } from '~/lib/i18n';
import { formatTranslation, t as translate } from '~/lib/i18n';
import { getCountryDisplayName, isPhoneValidForCountry } from '~/utilities/phoneFormatting';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  birthday: string;
  countryCode: string;
  identificationTypeId: string;
  identificationNumber: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormData, string>>;

const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{0,59}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID_NUMBER_REGEX = /^[A-Za-z0-9-]{4,30}$/;
const INJECTION_REGEX =
  /<[^>]*>|--|\/\*|\*\/|;|\b(select|insert|update|delete|drop|union|alter|create|truncate|exec|or\s+1\s*=\s*1)\b/i;

function containsInjection(input: string): boolean {
  return INJECTION_REGEX.test(input);
}

function getAgeFromDate(value: string): number | null {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - date.getUTCMonth();
  const dayDiff = today.getUTCDate() - date.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

export function validateProfileForm(
  form: ProfileFormData,
  language: string,
  availableNationalities: Array<{ code: string }>,
  selectedHeaderCountry: Country | null
): { isValid: boolean; errors: ProfileFieldErrors } {
  const errors: ProfileFieldErrors = {};
  const currentLanguage = language as Language;

  const profileT = (key: string, params?: Record<string, string | number>): string => {
    const translated = translate(`profile.validation.${key}`, currentLanguage);
    return params !== undefined ? formatTranslation(translated, params) : translated;
  };

  const textFields: Array<keyof ProfileFormData> = [
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'identificationNumber',
  ];

  for (const field of textFields) {
    const value = form[field].trim();
    if (value !== '' && containsInjection(value)) {
      errors[field] = profileT('suspiciousPattern');
    }
  }

  const firstName = form.firstName.trim();
  if (firstName === '') {
    errors.firstName = profileT('firstNameRequired');
  } else if (!NAME_REGEX.test(firstName)) {
    errors.firstName = profileT('firstNameFormat');
  }

  const lastName = form.lastName.trim();
  if (lastName === '') {
    errors.lastName = profileT('lastNameRequired');
  } else if (!NAME_REGEX.test(lastName)) {
    errors.lastName = profileT('lastNameFormat');
  }

  const email = form.email.trim();
  if (email === '') {
    errors.email = profileT('emailRequired');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = profileT('emailFormat');
  }

  if (form.birthday === '') {
    errors.birthday = profileT('birthdayRequired');
  } else {
    const age = getAgeFromDate(form.birthday);
    if (age === null) {
      errors.birthday = profileT('birthdayFormat');
    } else if (age < 18) {
      errors.birthday = profileT('birthdayAdult');
    }
  }

  const nationalityCode = form.countryCode.trim();
  if (nationalityCode === '') {
    errors.countryCode = profileT('nationalityRequired');
  } else if (availableNationalities.some((country) => country.code === nationalityCode) === false) {
    errors.countryCode = profileT('nationalityInvalid');
  }

  const idType = form.identificationTypeId.trim();
  if (idType === '') {
    errors.identificationTypeId = profileT('idTypeRequired');
  }

  const idNumber = form.identificationNumber.trim();
  if (idNumber === '') {
    errors.identificationNumber = profileT('idNumberRequired');
  } else if (!ID_NUMBER_REGEX.test(idNumber)) {
    errors.identificationNumber = profileT('idNumberFormat');
  }

  const phoneRaw = form.phoneNumber.trim();
  if (phoneRaw === '') {
    errors.phoneNumber = profileT('phoneRequired');
  } else if (!isPhoneValidForCountry(phoneRaw, selectedHeaderCountry?.code)) {
    const countryName = getCountryDisplayName(
      selectedHeaderCountry,
      currentLanguage,
      profileT('selectedCountryFallback')
    );
    errors.phoneNumber = profileT('phoneInvalidForCountry', { country: countryName });
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
