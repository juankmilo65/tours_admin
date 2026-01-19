import {
  registerUser as registerUserService,
  login as loginService,
  requestEmailVerification,
  verifyEmail,
  logout,
  requestPasswordReset,
  resetPassword,
  type RegisterUserResponse,
  type LoginResponse,
  type RequestEmailVerificationResponse,
  type VerifyEmailResponse,
  type LogoutResponse,
  type RequestPasswordResetResponse,
  type ResetPasswordResponse,
} from '../auth';
import type {
  RegisterUserPayload,
  LoginPayload,
  RequestEmailVerificationPayload,
  VerifyEmailPayload,
  LogoutPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
} from '../../types/AuthProps';
import type { ServiceResult } from '../_index';

/**
 * Generate payload from FormData
 */
const generatePayload = (formData: FormData): RegisterUserPayload => {
  const email = formData.get('email');
  const password = formData.get('password');
  const role = formData.get('role');
  const firstName = formData.get('firstName');
  const lastName = formData.get('lastName');
  const termsConditionsId = formData.get('termsConditionsId');

  return {
    email: email !== null && email !== undefined ? email.toString() : '',
    password: password !== null && password !== undefined ? password.toString() : '',
    role: role !== null && role !== undefined ? role.toString() : 'user',
    firstName: firstName !== null && firstName !== undefined ? firstName.toString() : '',
    lastName: lastName !== null && lastName !== undefined ? lastName.toString() : '',
    termsConditionsId:
      termsConditionsId !== null && termsConditionsId !== undefined
        ? termsConditionsId.toString()
        : '',
  };
};

const generateRequestEmailPayload = (formData: FormData): RequestEmailVerificationPayload => {
  const email = formData.get('email');

  return {
    email: email !== null && email !== undefined ? email.toString() : '',
  };
};

const generateVerifyEmailPayload = (formData: FormData): VerifyEmailPayload => {
  const otp = formData.get('otp');
  const email = formData.get('email');

  return {
    otp: otp !== null && otp !== undefined ? otp.toString() : '',
    email: email !== null && email !== undefined ? email.toString() : '',
  };
};

const generateLogoutPayload = (formData: FormData): LogoutPayload => {
  const token = formData.get('token');

  return {
    token: token !== null && token !== undefined ? token.toString() : '',
  };
};

const generateRequestPasswordResetPayload = (formData: FormData): RequestPasswordResetPayload => {
  const email = formData.get('email');
  const resetUrl = formData.get('resetUrl');

  return {
    email: email !== null && email !== undefined ? email.toString() : '',
    resetUrl: resetUrl !== null && resetUrl !== undefined ? resetUrl.toString() : '',
  };
};

const generateResetPasswordPayload = (formData: FormData): ResetPasswordPayload => {
  const token = formData.get('token');
  const newPassword = formData.get('newPassword');

  return {
    token: token !== null && token !== undefined ? token.toString() : '',
    newPassword: newPassword !== null && newPassword !== undefined ? newPassword.toString() : '',
  };
};

const generateLoginData = (formData: FormData): LoginPayload => {
  const email = formData.get('email');
  const password = formData.get('password');

  return {
    email: typeof email === 'string' ? email : '',
    password: typeof password === 'string' ? password : '',
  };
};

/**
 * Business logic for registering user
 */
const registerUserBusinessLogic = async (
  data: RegisterUserPayload
): Promise<RegisterUserResponse> => {
  try {
    const result = await registerUserService(data);
    return result;
  } catch (err) {
    console.error('Error in registerUserBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for requesting email verification
 */
const requestEmailVerificationBusinessLogic = async (
  data: RequestEmailVerificationPayload
): Promise<RequestEmailVerificationResponse> => {
  try {
    const result = await requestEmailVerification(data);
    return result;
  } catch (err) {
    console.error('Error in requestEmailVerificationBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for verifying email
 * NOTE: This only calls the backend service. For client-side usage that also
 * sets the server session, use verifyEmailBusinessLogicWithSession instead.
 */
const verifyEmailBusinessLogic = async (
  data: VerifyEmailPayload,
  token: string | null = null
): Promise<VerifyEmailResponse> => {
  try {
    const result = await verifyEmail(data, token ?? '');
    return result;
  } catch (err) {
    console.error('Error in verifyEmailBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for verifying email with session management
 * This should be used from client-side components to both verify OTP and set server session
 * Returns the backend response AND the Set-Cookie header to set the session
 */
export const verifyEmailBusinessLogicWithSession = async (
  data: VerifyEmailPayload,
  token: string | null = null
): Promise<VerifyEmailResponse & { setCookieHeader?: string }> => {
  try {
    const result = await verifyEmail(data, token ?? '');

    // If verification was successful, return the response
    // The calling code will need to handle session setting via the API route
    return result as VerifyEmailResponse & { setCookieHeader?: string };
  } catch (err) {
    console.error('Error in verifyEmailBusinessWithSession:', err);
    return Promise.resolve({
      error: err,
      success: false,
    });
  }
};

/**
 * Business logic for user logout
 */
const logoutUserBusinessLogic = async (data: unknown): Promise<LogoutResponse> => {
  try {
    const logoutData = data as LogoutPayload;
    const token = logoutData?.token ?? '';
    const result = await logout({ token });
    return result;
  } catch (err) {
    console.error('Error in logoutUserBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for user login
 */
const loginUserBusinessLogic = async (data: unknown): Promise<LoginResponse> => {
  try {
    // Validate that data has correct structure
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid login data');
    }

    const loginData = data as Record<string, unknown>;
    if (typeof loginData.email !== 'string' || typeof loginData.password !== 'string') {
      throw new Error('Invalid login data structure');
    }

    const loginDataValidated: LoginPayload = {
      email: loginData.email,
      password: loginData.password,
    };

    const result = await loginService(loginDataValidated);
    return result;
  } catch (err) {
    console.error('Error in loginUserBusiness:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Promise.resolve({ error: new Error(errorMessage) });
  }
};

/**
 * Business logic for requesting password reset
 */
const requestPasswordResetBusinessLogic = async (
  data: RequestPasswordResetPayload
): Promise<RequestPasswordResetResponse> => {
  try {
    const result = await requestPasswordReset(data);
    return result;
  } catch (err) {
    console.error('Error in requestPasswordResetBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for resetting password with token
 */
const resetPasswordBusinessLogic = async (
  data: ResetPasswordPayload
): Promise<ResetPasswordResponse> => {
  try {
    const result = await resetPassword(data);
    return result;
  } catch (err) {
    console.error('Error in resetPasswordBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Main business logic router
 */
const authBusinessLogic = (
  action: string,
  data: unknown,
  token: string | null = null
): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    registerUserBusinessLogic: () => registerUserBusinessLogic(data as RegisterUserPayload),
    loginUserBusinessLogic: () => loginUserBusinessLogic(data as LoginPayload),
    requestEmailVerificationBusinessLogic: () =>
      requestEmailVerificationBusinessLogic(data as RequestEmailVerificationPayload),
    verifyEmailBusinessLogic: () => verifyEmailBusinessLogic(data as VerifyEmailPayload, token),
    logoutUserBusinessLogic: () => logoutUserBusinessLogic(data as LogoutPayload),
    requestPasswordResetBusinessLogic: () =>
      requestPasswordResetBusinessLogic(data as RequestPasswordResetPayload),
    resetPasswordBusinessLogic: () => resetPasswordBusinessLogic(data as ResetPasswordPayload),
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
const auth = (formData: FormData, token: string | null = null): Promise<ServiceResult<unknown>> => {
  try {
    const action = formData.get('action')?.toString() ?? '';
    let payload:
      | RegisterUserPayload
      | LoginPayload
      | RequestEmailVerificationPayload
      | VerifyEmailPayload
      | LogoutPayload
      | RequestPasswordResetPayload
      | ResetPasswordPayload;

    if (action === 'registerUserBusinessLogic') {
      payload = generatePayload(formData);
    } else if (action === 'loginUserBusinessLogic') {
      payload = generateLoginData(formData);
    } else if (action === 'requestEmailVerificationBusinessLogic') {
      payload = generateRequestEmailPayload(formData);
    } else if (action === 'verifyEmailBusinessLogic') {
      payload = generateVerifyEmailPayload(formData);
    } else if (action === 'logoutUserBusinessLogic') {
      payload = generateLogoutPayload(formData);
    } else if (action === 'requestPasswordResetBusinessLogic') {
      payload = generateRequestPasswordResetPayload(formData);
    } else if (action === 'resetPasswordBusinessLogic') {
      payload = generateResetPasswordPayload(formData);
    } else {
      return Promise.resolve({ error: { status: 400, message: 'Invalid action' } });
    }

    return authBusinessLogic(action, payload, token);
  } catch (err) {
    console.error('Error in auth business logic:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Promise.resolve({ error: new Error(errorMessage) });
  }
};

export default auth;

// Export individual functions for direct use
export { registerUserBusinessLogic };
export { loginUserBusinessLogic };
export { requestEmailVerificationBusinessLogic };
export { verifyEmailBusinessLogic };
export { logoutUserBusinessLogic };
export { requestPasswordResetBusinessLogic };
export { resetPasswordBusinessLogic };
