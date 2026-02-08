/**
 * Resource Route for fetching user's menu based on role
 * This endpoint returns the navigation menu items for the authenticated user
 */

import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { getUserMenuBusiness } from '~/server/businessLogic/menusBusinessLogic';

export async function loader({ request }: LoaderFunctionArgs): Promise<ReturnType<typeof json>> {
  // Get the Authorization header
  const authHeader = request.headers.get('Authorization');

  if (authHeader === null || authHeader === '' || authHeader.startsWith('Bearer ') === false) {
    return json(
      { success: false, error: 'Unauthorized - No valid token provided' },
      { status: 401 }
    );
  }

  // Extract the token
  const token = authHeader.replace('Bearer ', '');

  // Get language from headers or default to 'es'
  const language = request.headers.get('X-Language') ?? 'es';

  try {
    // Call the business logic to get the menu
    const result = await getUserMenuBusiness(token, language);

    if (result.success === true && result.data !== undefined) {
      return json(result);
    }

    return json({ success: false, data: [], message: 'No menu items found' });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return json(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch menu',
      },
      { status: 500 }
    );
  }
}

// No default export - this is a resource route
