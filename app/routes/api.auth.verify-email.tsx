import type { ActionFunctionArgs } from '@remix-run/node';
import authBL from '~/server/businessLogic/authBusinessLogic';

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const result = await authBL(formData);

    if (result.success === true) {
      return Response.json(result);
    } else {
      return Response.json(
        { error: (result as { error?: string }).error ?? 'Unknown error' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in verify email action:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
