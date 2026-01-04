/**
 * Resource Route for changing country
 * This is called from the Header country selector
 */

import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { getSession, commitSession } from '~/utilities/sessions';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const countryCode = formData.get('countryCode') as string;
  const returnTo = formData.get('returnTo') as string || '/';
  
  if (!countryCode) {
    return redirect(returnTo);
  }
  
  const session = await getSession(request.headers.get("Cookie"));
  
  // Clear cached countries to force reload with new country filter
  session.unset("cachedCountries");
  
  // Set the new country code
  session.set("filters", { country: countryCode });
  session.set("selectedCountryCode", countryCode);
  
  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

// No default export - this is a resource route
