import type { ActionFunctionArgs } from '@remix-run/node';
import authBL from '~/server/businessLogic/authBusinessLogic';
import { getSession, commitSession } from '~/utilities/sessions';
import type { VerifyEmailResponse } from '~/server/auth';

// Type definition for request body
type VerifyEmailRequestBody = {
  otp: string;
  email: string;
};

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  console.log('api.auth.verify-email - Request received');

  try {
    // Extract token from Authorization header (from login)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') === true ? authHeader.slice(7) : null;

    console.log('api.auth.verify-email - Token from header:', token);
    console.log('api.auth.verify-email - Auth header:', authHeader);

    if (token === null) {
      console.log('api.auth.verify-email - ERROR: No token provided');
      return Response.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Parse JSON body instead of FormData
    const body = (await request.json()) as VerifyEmailRequestBody;
    const formData = new FormData();
    formData.append('action', 'verifyEmailBusinessLogic');
    formData.append('otp', body.otp);
    formData.append('email', body.email);

    const result = (await authBL(formData, token)) as VerifyEmailResponse;

    if (result.success === true) {
      console.log('api.auth.verify-email - OTP verified successfully');
      console.log('api.auth.verify-email - Syncing session with token');

      // OTP verification successful - update session with the same token
      // The token remains valid after OTP verification
      const session = await getSession(request.headers.get('Cookie'));
      session.set('authToken', token);
      console.log('api.auth.verify-email - Session updated with token');

      const response = Response.json(result, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      });
      console.log('api.auth.verify-email - Response headers set');
      return response;
    } else {
      // Ensure error is always a string
      const errorObj = result as { error?: unknown };
      let errorMessage = 'Unknown error';

      if (typeof errorObj.error === 'string') {
        errorMessage = errorObj.error;
      } else if (errorObj.error instanceof Error) {
        errorMessage = errorObj.error.message;
      } else if (errorObj.error !== null && errorObj.error !== undefined) {
        // If it's an object (like AxiosError), try to extract message
        const err = errorObj.error as { message?: string; status?: number };
        errorMessage = err.message ?? 'Unknown error';
      }

      return Response.json({ error: errorMessage }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in verify email action:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
