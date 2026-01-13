import {
  registerUser as registerUserService,
  login as loginService,
  requestEmailVerification,
  verifyEmail,
  logout,
} from '../auth';
import type {
  RegisterUserPayload,
  LoginPayload,
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

const generateLogoutPayload = (formData: FormData): LogoutPayload => {
  const token = formData.get('token');

  return {
    token: token !== null && token !== undefined ? token.toString() : '',
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
): Promise<ServiceResult<unknown>> => {
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
): Promise<ServiceResult<unknown>> => {
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
 */
const verifyEmailBusinessLogic = async (
  data: VerifyEmailPayload
): Promise<ServiceResult<unknown>> => {
  try {
    const result = await verifyEmail(data);
    return result;
  } catch (err) {
    console.error('Error in verifyEmailBusiness:', err);
    return Promise.resolve({ error: err });
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
  } catch (err) {
    console.error('Error in logoutUserBusiness:', err);
    return Promise.resolve({ error: err });
  }
};

/**
 * Business logic for user login
 */
const loginUserBusinessLogic = async (data: unknown): Promise<ServiceResult<unknown>> => {
  try {
    // Validate that data has the correct structure
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
 * Main business logic router
 */
const authBusinessLogic = (action: string, data: unknown): Promise<ServiceResult<unknown>> => {
  const ACTIONS: Record<string, () => Promise<ServiceResult<unknown>>> = {
    registerUserBusinessLogic: () => registerUserBusinessLogic(data as RegisterUserPayload),
    loginUserBusinessLogic: () => loginUserBusinessLogic(data as LoginPayload),
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
      | LoginPayload
      | RequestEmailVerificationPayload
      | VerifyEmailPayload
      | LogoutPayload;

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
    } else {
      return Promise.resolve({ error: { status: 400, message: 'Invalid action' } });
    }

    return authBusinessLogic(action, payload);
  } catch (err) {
    console.error('Error in auth business logic:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Promise.resolve({ error: new Error(errorMessage) });
  }
};

export default auth;
