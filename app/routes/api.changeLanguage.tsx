/**
 * Resource Route for changing language
 * This is called from the Header language selector
 */

import { type ActionFunctionArgs, json } from '@remix-run/node';
import { getSession, commitSession } from '~/utilities/sessions';

export async function action({ request }: ActionFunctionArgs): Promise<ReturnType<typeof json>> {
  const formData = await request.formData();
  const language = formData.get('language') as string;

  if (language === undefined || language === '' || ['es', 'en'].includes(language) === false) {
    return json({ success: false, error: 'Invalid language' }, { status: 400 });
  }

  const session = await getSession(request.headers.get('Cookie'));

  // Set the new language
  session.set('language', language);

  return json(
    { success: true, language },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

// No default export - this is a resource route
