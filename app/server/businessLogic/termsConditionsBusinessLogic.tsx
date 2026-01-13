import { getTermsConditionsByType } from '../termsConditions';
import type { TermsConditionsFilterPayload } from '../../types/TermsConditionsProps';
import type { ServiceResult } from '../_index';
/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData): TermsConditionsFilterPayload => {
  const action = formData.get('action');
  const type = formData.get('type');
  const language = formData.get('language')?.toString() ?? 'es';
  console.warn('generatePayload called with:', { action, type, language });

  return {
    action: action !== null && action !== undefined ? action.toString() : '',
    type: type !== null && type !== undefined ? type.toString() : '',
    language: language.toString(),
  };
};

/**
 * Business logic for getting tours
 */
const getTermsConditionsByTypeBusinessLogic = async (
  data: TermsConditionsFilterPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await getTermsConditionsByType(data.type, data.language);
    return result;
  } catch (error) {
    return Promise.resolve({ error });
  }
};

/**
 * Main business logic router
 */
const termsConditionsBusinessLogic = (
  action: string,
  data: TermsConditionsFilterPayload
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    getTermsConditionsByTypeBusinessLogic: () => getTermsConditionsByTypeBusinessLogic(data),
  };

  const handler = ACTIONS[action];
  if (handler === undefined) {
    return Promise.resolve({
      error: {
        status: 400,
        message: 'Invalid action',
      },
    });
  }

  return handler();
};

/**
 * Main export function
 */
const termsConditions = (formData: FormData): Promise<ServiceResult<unknown>> => {
  try {
    const payload = generatePayload(formData);

    const { action } = payload;
    const result = termsConditionsBusinessLogic(action, payload);

    return result;
  } catch (error) {
    return Promise.resolve({ error });
  }
};

export default termsConditions;
