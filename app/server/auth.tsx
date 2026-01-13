import { createServiceREST } from './_index';

const BASE_URL = process.env.BACKEND_URL ?? '';

export interface RegisterUserResponse {
  success?: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    token: string;
  };
  error?: unknown;
}

export interface RequestEmailVerificationResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

export interface VerifyEmailResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

/**
 * Register user
 */
export const registerUser = async (payload: {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  termsConditionsId: string;
}): Promise<RegisterUserResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, error: 'Backend not configured' };
  }

  try {
    const authService = createServiceREST(BASE_URL, 'auth/register', 'POST');

    const result = await authService.create(payload);

    return result as RegisterUserResponse;
  } catch (error: unknown) {
    console.error('Error in registerUser service:', error);
    // @ts-ignore
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Request email verification
 */
export const requestEmailVerification = async (payload: {
  email: string;
}): Promise<RequestEmailVerificationResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, error: 'Backend not configured' };
  }

  try {
    const authService = createServiceREST(BASE_URL, 'auth/request-email-verification', 'POST');

    const result = await authService.create(payload);

    return result as RequestEmailVerificationResponse;
  } catch (error: unknown) {
    console.error('Error in requestEmailVerification service:', error);
    // @ts-ignore
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Verify email
 */
export const verifyEmail = async (payload: { otp: string }): Promise<VerifyEmailResponse> => {
  if (BASE_URL === '' || BASE_URL === undefined) {
    console.warn('BACKEND_URL is not configured');
    return { success: false, error: 'Backend not configured' };
  }

  try {
    const authService = createServiceREST(BASE_URL, 'auth/verify-email', 'POST');

    const result = await authService.create(payload);

    return result as VerifyEmailResponse;
  } catch (error: unknown) {
    console.error('Error in verifyEmail service:', error);
    // @ts-ignore
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};
