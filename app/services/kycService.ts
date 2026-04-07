/**
 * Client-side KYC service
 * Handles KYC flow logic
 */

import type { KycStatus } from '~/types/kyc';

/**
 * Determine if KYC is required based on booking amount or role
 */
export const isKycRequired = (role: string, bookingTotal: number, kycThreshold = 5000): boolean => {
  if (role !== 'owner') return false;
  return bookingTotal >= kycThreshold;
};

/**
 * Format KYC status for UI display
 */
export const formatKycStatus = (kycStatus: KycStatus | null, language = 'es'): string => {
  if (!kycStatus) {
    return language === 'en' ? 'Not started' : 'No iniciado';
  }

  if (kycStatus.isComplete) {
    return language === 'en' ? 'Verified' : 'Verificado';
  }

  if (kycStatus.percentageComplete === 0) {
    return language === 'en' ? 'Not started' : 'No iniciado';
  }

  return language === 'en'
    ? `${kycStatus.percentageComplete}% Complete`
    : `${kycStatus.percentageComplete}% Completado`;
};

/**
 * Get KYC requirements message
 */
export const getKycRequirementsMessage = (
  requirements: string[] | undefined,
  language = 'es'
): string => {
  if (!requirements || requirements.length === 0) {
    return language === 'en' ? 'No requirements pending' : 'Sin requerimientos pendientes';
  }

  const requirementMap: Record<string, Record<string, string>> = {
    personal_id: {
      en: 'Personal ID',
      es: 'Identificación Personal',
    },
    business_info: {
      en: 'Business Information',
      es: 'Información del Negocio',
    },
    bank_account: {
      en: 'Bank Account',
      es: 'Cuenta Bancaria',
    },
  };

  const items = requirements.map((req) => requirementMap[req]?.[language] ?? req);

  return items.join(', ');
};
