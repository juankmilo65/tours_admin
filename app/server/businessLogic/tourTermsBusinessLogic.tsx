import {
  getMyTourTerms,
  getAllTourTerms,
  createTourTerms,
  updateTourTerms,
  type TourTermsResponse,
  type TourTermResponse,
} from '../tourTerms';

export interface TourTermsFilterPayload {
  action: string;
  language?: string;
  page?: number;
  limit?: number;
  token?: string;
}

export interface CreateTourTermPayload {
  action: string;
  data: {
    tourId: string;
    terms_conditions_es: string;
    terms_conditions_en: string;
  };
  language?: string;
  token: string;
}

export interface UpdateTourTermPayload {
  action: string;
  tourId: string;
  data: {
    terms_conditions_es?: string;
    terms_conditions_en?: string;
  };
  language?: string;
  token: string;
}

/**
 * Generate payload from FormData for GET operations
 */
const generateFilterPayload = (formData: FormData): TourTermsFilterPayload => {
  const action = formData.get('action');
  const language = formData.get('language')?.toString() ?? 'es';
  const page = formData.get('page')?.toString();
  const limit = formData.get('limit')?.toString();
  const token = formData.get('token')?.toString();

  return {
    action: action !== null && action !== undefined ? action.toString() : '',
    language,
    page: page !== undefined ? parseInt(page, 10) : undefined,
    limit: limit !== undefined ? parseInt(limit, 10) : undefined,
    token,
  };
};

/**
 * Generate payload from FormData for CREATE operations
 */
const generateCreatePayload = (formData: FormData): CreateTourTermPayload => {
  const action = formData.get('action');
  const language = formData.get('language')?.toString() ?? 'es';
  const token = formData.get('token')?.toString() ?? '';
  const tourId = formData.get('tourId')?.toString() ?? '';
  const terms_conditions_es = formData.get('terms_conditions_es')?.toString() ?? '';
  const terms_conditions_en = formData.get('terms_conditions_en')?.toString() ?? '';

  return {
    action: action !== null && action !== undefined ? action.toString() : '',
    language,
    token,
    data: {
      tourId,
      terms_conditions_es,
      terms_conditions_en,
    },
  };
};

/**
 * Generate payload from FormData for UPDATE operations
 */
const generateUpdatePayload = (formData: FormData): UpdateTourTermPayload => {
  const action = formData.get('action');
  const language = formData.get('language')?.toString() ?? 'es';
  const token = formData.get('token')?.toString() ?? '';
  const tourId = formData.get('tourId')?.toString() ?? '';
  const terms_conditions_es = formData.get('terms_conditions_es')?.toString();
  const terms_conditions_en = formData.get('terms_conditions_en')?.toString();

  return {
    action: action !== null && action !== undefined ? action.toString() : '',
    language,
    token,
    tourId,
    data: {
      ...(terms_conditions_es !== undefined &&
        terms_conditions_es !== '' && { terms_conditions_es }),
      ...(terms_conditions_en !== undefined &&
        terms_conditions_en !== '' && { terms_conditions_en }),
    },
  };
};

/**
 * Business logic for getting tour terms for current user
 */
const getMyTourTermsBusinessLogic = async (
  data: TourTermsFilterPayload
): Promise<TourTermsResponse> => {
  try {
    if (data.token === undefined || data.token === '') {
      return { error: { status: 401, message: 'Unauthorized' } };
    }

    const result = await getMyTourTerms(
      {
        page: data.page,
        limit: data.limit,
        language: data.language,
      },
      data.token
    );
    return result;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Business logic for getting all tour terms (Admin)
 */
const getAllTourTermsBusinessLogic = async (
  data: TourTermsFilterPayload
): Promise<TourTermsResponse> => {
  try {
    const result = await getAllTourTerms(
      {
        page: data.page,
        limit: data.limit,
        language: data.language,
      },
      data.token
    );
    return result;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Business logic for creating tour terms
 */
const createTourTermsBusinessLogic = async (
  data: CreateTourTermPayload
): Promise<TourTermResponse> => {
  try {
    if (data.token === '' || data.data.tourId === '') {
      return { error: { status: 400, message: 'Invalid request' } };
    }

    const result = await createTourTerms(data.data, data.token, data.language);
    return result;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Business logic for updating tour terms
 */
const updateTourTermsBusinessLogic = async (
  data: UpdateTourTermPayload
): Promise<TourTermResponse> => {
  try {
    if (data.token === '' || data.tourId === '') {
      return { error: { status: 400, message: 'Invalid request' } };
    }

    const result = await updateTourTerms(data.tourId, data.data, data.token, data.language);
    return result;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Main business logic router
 */
const tourTermsBusinessLogic = (
  action: string,
  payload: TourTermsFilterPayload | CreateTourTermPayload | UpdateTourTermPayload
): Promise<TourTermsResponse | TourTermResponse> => {
  const ACTIONS: Record<string, () => Promise<TourTermsResponse | TourTermResponse>> = {
    getMyTourTermsBusinessLogic: () =>
      getMyTourTermsBusinessLogic(payload as TourTermsFilterPayload),
    getAllTourTermsBusinessLogic: () =>
      getAllTourTermsBusinessLogic(payload as TourTermsFilterPayload),
    createTourTermsBusinessLogic: () =>
      createTourTermsBusinessLogic(payload as CreateTourTermPayload),
    updateTourTermsBusinessLogic: () =>
      updateTourTermsBusinessLogic(payload as UpdateTourTermPayload),
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
 * Main export function for GET operations
 */
const tourTermsBL = (formData: FormData): Promise<TourTermsResponse> => {
  try {
    const payload = generateFilterPayload(formData);
    const { action } = payload;
    const result = tourTermsBusinessLogic(action, payload);

    return result as Promise<TourTermsResponse>;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Main export function for CREATE operations
 */
const tourTermsCreateBL = (formData: FormData): Promise<TourTermResponse> => {
  try {
    const payload = generateCreatePayload(formData);
    const { action } = payload;
    const result = tourTermsBusinessLogic(action, payload);

    return result as Promise<TourTermResponse>;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

/**
 * Main export function for UPDATE operations
 */
const tourTermsUpdateBL = (formData: FormData): Promise<TourTermResponse> => {
  try {
    const payload = generateUpdatePayload(formData);
    const { action } = payload;
    const result = tourTermsBusinessLogic(action, payload);

    return result as Promise<TourTermResponse>;
  } catch (error) {
    return Promise.resolve({
      error: error instanceof Error ? { message: error.message } : { message: 'Unknown error' },
    });
  }
};

export { tourTermsBL, tourTermsCreateBL, tourTermsUpdateBL };
