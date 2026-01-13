import type { ActionFunctionArgs } from '@remix-run/node';
import authBL from '~/server/businessLogic/authBusinessLogic';
import type { ServiceResult } from '~/server/_index';

type LogoutResult = {
  success?: boolean;
  message?: string;
  error?: unknown;
};

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();

    const result = (await authBL(formData)) as ServiceResult<LogoutResult>;
    console.warn('authBL result for logout:', result);

    // Check if result is an error object
    if (result !== null && typeof result === 'object' && 'error' in result) {
      return Response.json(
        { error: (result as { error?: string }).error ?? 'Unknown error' },
        { status: 400 }
      );
    }

    // Check if result has success property
    const logoutResult = result;
    if (logoutResult?.success === true) {
      return Response.json(result);
    } else {
      return Response.json({ error: logoutResult?.error ?? 'Unknown error' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in logout action:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
