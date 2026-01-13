export interface RegisterUserPayload {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  termsConditionsId: string;
}

export interface RequestEmailVerificationPayload {
  email: string;
}

export interface VerifyEmailPayload {
  otp: string;
}
