import {
  registerUser as registerUserService,
  requestEmailVerification,
  verifyEmail,
  logout,
} from '../auth';
import type {
  RegisterUserPayload,
  RequestEmailVerificationPayload,
  VerifyEmailPayload,
  LogoutPayload,
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

  return {
    otp: otp !== null && otp !== undefined ? otp.toString() : '',
  };
};

/**
 * Business logic for registering user
 */
const registerUserBusinessLogic = async (
  data: RegisterUserPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await registerUserService(data);
    return result;
  } catch (error) {
    console.error('Error in registerUserBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for requesting email verification
 */
const requestEmailVerificationBusinessLogic = async (
  data: RequestEmailVerificationPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await requestEmailVerification(data);
    return result;
  } catch (error) {
    console.error('Error in requestEmailVerificationBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for verifying email
 */
const verifyEmailBusinessLogic = async (
  data: VerifyEmailPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await verifyEmail(data);
    return result;
  } catch (error) {
    console.error('Error in verifyEmailBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Business logic for user logout
 */
const logoutUserBusinessLogic = async (data: unknown): Promise<ServiceResult<unknown>> => {
  try {
    const logoutData = data as LogoutPayload;
    const token = logoutData?.token ?? '';
    const result = await logout({ token });
    return result;
  } catch (error) {
    console.error('Error in logoutUserBusiness:', error);
    return Promise.resolve({ error });
  }
};

/**
 * Main business logic router
 */
const authBusinessLogic = (action: string, data: unknown): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    registerUserBusinessLogic: () => registerUserBusinessLogic(data as RegisterUserPayload),
    requestEmailVerificationBusinessLogic: () =>
      requestEmailVerificationBusinessLogic(data as RequestEmailVerificationPayload),
    verifyEmailBusinessLogic: () => verifyEmailBusinessLogic(data as VerifyEmailPayload),
    logoutUserBusinessLogic: () => logoutUserBusinessLogic(data as LogoutPayload),
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
const auth = (formData: FormData): Promise<ServiceResult<unknown>> => {
  try {
    const action = formData.get('action')?.toString() ?? '';
    let payload:
      | RegisterUserPayload
      | RequestEmailVerificationPayload
      | VerifyEmailPayload
      | LogoutPayload;

    if (action === 'registerUserBusinessLogic') {
      payload = generatePayload(formData);
    } else if (action === 'requestEmailVerificationBusinessLogic') {
      payload = generateRequestEmailPayload(formData);
    } else if (action === 'verifyEmailBusinessLogic') {
      payload = generateVerifyEmailPayload(formData);
    } else if (action === 'logoutUserBusinessLogic') {
      // For logout, create payload with token from formData
      const token = formData.get('token')?.toString() ?? '';
      payload = { token };
    } else {
      return Promise.resolve({ error: { status: 400, message: 'Invalid action' } });
    }

    return authBusinessLogic(action, payload);
  } catch (error) {
    console.error('Error in auth business logic:', error);
    return Promise.resolve({ error });
  }
};

export default auth;
