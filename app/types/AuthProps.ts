export interface RegisterUserPayload {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  termsConditionsId: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RequestEmailVerificationPayload {
  email: string;
}

export interface VerifyEmailPayload {
  otp: string;
  email: string;
}

export interface LogoutPayload {
  token: string;
}
