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
    // Get session and clear auth token first
    const session = await getSession(request.headers.get('Cookie'));
    const token = session.get('authToken') as string | undefined;

    // Create formData with action and token for the business logic
    const formData = new FormData();
    formData.append('action', 'logoutUserBusinessLogic');
    if (token !== undefined && token !== null && token !== '') {
      formData.append('token', token);
    }

    // Call the business logic (may fail with 401 if token is expired)
    const result = (await authBL(formData, token ?? null)) as ServiceResult<LogoutResult>;
    console.warn('authBL result for logout:', result);

    // Clear the session regardless of the backend response
    session.unset('authToken');
    session.unset('authUser');

    // Return JSON so the client handles navigation (avoids double render from redirect)
    return json(
      { success: true },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      }
    );
  } catch (error) {
    console.error('Error in logout action:', error);

    // Even if there's an error, clear the session
    const session = await getSession(request.headers.get('Cookie'));
    session.unset('authToken');
    session.unset('authUser');

    return json(
      { success: true },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      }
    );
  }
}
