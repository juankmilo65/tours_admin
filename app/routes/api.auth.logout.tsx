import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import authBL from '~/server/businessLogic/authBusinessLogic';
import type { ServiceResult } from '~/server/_index';
import { getSession, commitSession } from '~/utilities/sessions';

type LogoutResult = {
  success?: boolean;
  message?: string;
  error?: unknown;
};

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();

    const result = (await authBL(formData)) as ServiceResult<LogoutResult>;
    console.warn('authBL result for logout:', result);

    // Check if result is an error object
    if (result !== null && typeof result === 'object' && 'error' in result) {
      const errorResult = result as { error: unknown };
      return json(
        { error: typeof errorResult.error === 'string' ? errorResult.error : 'Unknown error' },
        { status: 400 }
      );
    }

    // Result should be LogoutResult type
    const logoutResult = result;
    if (logoutResult?.success === true) {
      // Get session and clear auth token
      const session = await getSession(request.headers.get('Cookie'));
      session.unset('authToken');

      return json(
        { success: true, message: 'Logged out successfully' },
        {
          headers: {
            'Set-Cookie': await commitSession(session),
          },
        }
      );
    } else {
      return json(
        { error: logoutResult?.error ?? logoutResult?.message ?? 'Logout failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in logout action:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
