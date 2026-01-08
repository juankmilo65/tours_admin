/**
 * Resource Route for changing country
 * This is called from the Header country selector
 */

import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { getSession, commitSession } from '~/utilities/sessions';

export async function action({
  request,
}: ActionFunctionArgs): Promise<ReturnType<typeof redirect>> {
  const formData = await request.formData();
  const countryId = formData.get('countryId') as string;
  const countryCode = formData.get('countryCode') as string;
  const returnTo = (formData.get('returnTo') as string) ?? '/';

  if (countryId === null || countryCode === null) {
    return redirect(returnTo);
  }

  const session = await getSession(request.headers.get('Cookie'));

  // Clear cached countries to force reload with new country filter
  session.unset('cachedCountries');

  // Set the new country id and code
  session.set('selectedCountryId', countryId);
  session.set('selectedCountryCode', countryCode);

  return redirect(returnTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// No default export - this is a resource route
