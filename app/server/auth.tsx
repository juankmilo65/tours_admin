import { createServiceREST } from './_index';

// Type declaration for Vite environment variables
interface ViteImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const BASE_URL =
  (import.meta as unknown as ViteImportMeta).env.VITE_BACKEND_URL ?? 'http://localhost:3000';

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
    accessToken: string;
    refreshToken: string;
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

export interface LogoutResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

export interface RequestPasswordResetPayload {
  email: string;
  resetUrl: string;
}

export interface RequestPasswordResetResponse {
  success?: boolean;
  message?: string;
  resetUrl?: string;
  error?: unknown;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  loginUrl: string;
}

export interface ResetPasswordResponse {
  success?: boolean;
  message?: string;
  error?: unknown;
}

export interface LoginResponse {
  success?: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
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
  try {
    const authService = createServiceREST(BASE_URL, 'auth/register', '');

    const result = await authService.create(payload);

    return result as RegisterUserResponse;
  } catch (error: unknown) {
    console.error('Error in registerUser service:', error);
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Login user
 */
export const login = async (payload: {
  email: string;
  password: string;
}): Promise<LoginResponse> => {
  try {
    const authService = createServiceREST(BASE_URL, 'auth/login', '');

    const result = await authService.create(payload);

    return result as LoginResponse;
  } catch (error: unknown) {
    console.error('Error in login service:', error);

    // Handle Axios errors to extract backend error message
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (
        axiosError.response?.data?.error !== undefined &&
        axiosError.response?.data?.error !== null
      ) {
        errorMessage = axiosError.response.data.error;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      error: errorMessage,
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
  try {
    const authService = createServiceREST(BASE_URL, 'auth/request-email-verification', '');

    const result = await authService.create(payload);

    return result as RequestEmailVerificationResponse;
  } catch (error: unknown) {
    console.error('Error in requestEmailVerification service:', error);
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Verify email
 */
export const verifyEmail = async (
  payload: { otp: string; email: string },
  token: string
): Promise<VerifyEmailResponse> => {
  console.log('verifyEmail payload:', payload);
  console.log('verifyEmail token length:', token.length);
  console.log('verifyEmail token:', token);
  console.log('verifyEmail BASE_URL:', BASE_URL);

  try {
    const authService = createServiceREST(BASE_URL, 'auth/verify-email', `Bearer ${token}`);

    const result = await authService.create(payload);

    console.log('verifyEmail result:', result);
    return result as VerifyEmailResponse;
  } catch (error: unknown) {
    console.error('Error in verifyEmail service:', error);
    const axiosError = error as { response?: { data?: unknown }; status?: number };
    if (axiosError.response?.data !== undefined) {
      console.error('Backend response data:', axiosError.response.data);
    }
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (
  payload: RequestPasswordResetPayload
): Promise<RequestPasswordResetResponse> => {
  try {
    const authService = createServiceREST(BASE_URL, 'auth/request-password-reset', '');

    const result = await authService.create(payload, {
      headers: {
        'x-Language': 'es',
      },
    });

    return result as RequestPasswordResetResponse;
  } catch (error: unknown) {
    console.error('Error in requestPasswordReset service:', error);

    // Handle Axios errors to extract backend error message
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (
        axiosError.response?.data?.error !== undefined &&
        axiosError.response?.data?.error !== null
      ) {
        errorMessage = axiosError.response.data.error;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      error: errorMessage,
      success: false,
    };
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (payload: {
  token: string;
  newPassword: string;
  loginUrl: string;
}): Promise<ResetPasswordResponse> => {
  try {
    const authService = createServiceREST(BASE_URL, 'auth/reset-password', '');

    const result = await authService.create(payload, {
      headers: {
        'x-Language': 'es',
      },
    });

    return result as ResetPasswordResponse;
  } catch (error: unknown) {
    console.error('Error in resetPassword service:', error);

    // Handle Axios errors to extract backend error message
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (
        axiosError.response?.data?.error !== undefined &&
        axiosError.response?.data?.error !== null
      ) {
        errorMessage = axiosError.response.data.error;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      error: errorMessage,
      success: false,
    };
  }
};

/**
 * Logout user service
 */
export const logout = async (payload: { token: string }): Promise<LogoutResponse> => {
  console.log('logout payload token length:', payload.token.length);
  console.log('logout payload token:', payload.token);

  try {
    const authService = createServiceREST(BASE_URL, 'auth/logout', `Bearer ${payload.token}`);

    const result = await authService.create({}); // Empty payload for logout

    console.log('logout result:', result);
    return result as LogoutResponse;
  } catch (error: unknown) {
    console.error('Error in logout service:', error);
    const axiosError = error as { response?: { data?: unknown }; status?: number };
    if (axiosError.response?.data !== undefined) {
      console.error('Backend response data:', axiosError.response.data);
    }
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};
