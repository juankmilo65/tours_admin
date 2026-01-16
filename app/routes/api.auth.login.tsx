import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import authBL from '~/server/businessLogic/authBusinessLogic';
import type { ServiceResult } from '~/server/_index';
import { getSession, commitSession } from '~/utilities/sessions';

type LoginResult = {
  success?: boolean;
  data?: {
    user: unknown;
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
  message?: string;
};

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();

    // Add action to formData
    formData.append('action', 'loginUserBusinessLogic');

    const result = (await authBL(formData)) as ServiceResult<LoginResult>;
    console.warn('authBL result for login:', result);

    // Check if result is an error object (including AxiosError)
    if (result !== null && typeof result === 'object' && 'error' in result) {
      // Handle different error types
      const errorObj = result as { error?: unknown };
      let errorMessage = 'Unknown error';

      if (typeof errorObj.error === 'string') {
        errorMessage = errorObj.error;
      } else if (errorObj.error !== null && typeof errorObj.error === 'object') {
        // AxiosError or similar error object
        const axiosError = errorObj.error as { message?: string; code?: string };
        errorMessage =
          axiosError.message ??
          (typeof axiosError.code === 'string' ? axiosError.code : 'Unknown error');
      }

      return json({ error: errorMessage }, { status: 400 });
    }

    // Check if result has success property and data
    const loginResult = result;
    if (
      loginResult?.success === true &&
      loginResult?.data &&
      typeof loginResult.data.accessToken === 'string'
    ) {
      // Get session and store token
      const session = await getSession(request.headers.get('Cookie'));
      const token = loginResult.data.accessToken;
      session.set('authToken', token);

      // Return success with session cookie
      return json(result, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      });
    } else {
      return json({ error: loginResult?.error ?? 'Login failed' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in login action:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
