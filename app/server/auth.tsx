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
      avatarUrl?: string | null;
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
    const authService = createServiceREST(BASE_URL, 'users/register', '');

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
  const authService = createServiceREST(BASE_URL, 'users/login', '');

  const result = await authService.create(payload);

  // Check if result has error property (from createServiceREST catch)
  if (result !== null && typeof result === 'object' && 'error' in result) {
    const errorResult = result as { error?: unknown };

    // Extract error message from Axios error response
    if (
      errorResult.error !== null &&
      typeof errorResult.error === 'object' &&
      'response' in errorResult.error
    ) {
      const axiosError = errorResult.error as { response?: { data?: unknown; status?: number } };

      if (axiosError.response?.data !== undefined && axiosError.response?.data !== null) {
        const responseData = axiosError.response.data as { error?: string; message?: string };

        if (typeof responseData.error === 'string' && responseData.error !== '') {
          return {
            error: responseData.error,
            success: false,
          };
        }
        if (typeof responseData.message === 'string' && responseData.message !== '') {
          return {
            error: responseData.message,
            success: false,
          };
        }
      }
    }

    // If we can't extract a specific message, return a generic one
    return {
      error: errorResult.error instanceof Error ? errorResult.error.message : 'Login failed',
      success: false,
    };
  }

  // Return successful response
  return result as LoginResponse;
};

/**
 * Request email verification
 */
export const requestEmailVerification = async (payload: {
  email: string;
}): Promise<RequestEmailVerificationResponse> => {
  try {
    const authService = createServiceREST(BASE_URL, 'users/request-email-verification', '');

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
  try {
    const authService = createServiceREST(BASE_URL, 'users/verify-email', `Bearer ${token}`);

    const result = await authService.create(payload);

    return result as VerifyEmailResponse;
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};

/**
 * Verify email with token from URL
 */
export const verifyEmailToken = async (
  payload: { token: string },
  language: string
): Promise<VerifyEmailResponse> => {
  try {
    const authService = createServiceREST(BASE_URL, 'users/verify-email-token', '');

    const result = await authService.create(payload, {
      headers: {
        'x-Language': language,
      },
    });

    return result as VerifyEmailResponse;
  } catch (error: unknown) {
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
    const authService = createServiceREST(BASE_URL, 'users/request-password-reset', '');

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
    const authService = createServiceREST(BASE_URL, 'users/reset-password', '');

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
  try {
    const authService = createServiceREST(BASE_URL, 'users/logout', `Bearer ${payload.token}`);

    const result = await authService.create({}); // Empty payload for logout

    return result as LogoutResponse;
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    };
  }
};
