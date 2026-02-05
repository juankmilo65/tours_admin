import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getSession } from '~/utilities/sessions';
import { getTourByIdBusiness } from '~/server/businessLogic/toursBusinessLogic';

/**
 * API route to get a single tour by ID
 * Uses the Business Logic layer to fetch tour data
 *
 * GET /api/tours/getById?tourId={id}&language={lang}&currency={currency}
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);
  const tourId = url.searchParams.get('tourId');
  const language = url.searchParams.get('language') ?? 'es';
  const currency = url.searchParams.get('currency') ?? 'MXN';

  if (tourId === null || tourId === '') {
    return json({ success: false, error: 'tourId is required' }, { status: 400 });
  }

  // Get auth token from session
  const session = await getSession(request.headers.get('Cookie'));
  const authToken = session.get('authToken') as string | undefined;

  if (authToken === undefined || authToken === '') {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await getTourByIdBusiness(tourId, language, currency, authToken);
    return json(result);
  } catch (error) {
    console.error('[api.tours.getById] Error:', error);
    return json({ success: false, error: 'Failed to fetch tour' }, { status: 500 });
  }
}
