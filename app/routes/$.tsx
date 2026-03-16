/**
 * Catch-all "splat" route – silently returns 404 for requests like
 * /.well-known/appspecific/com.chrome.devtools.json and other
 * unmatched paths, keeping the terminal clean.
 */
import type { LoaderFunctionArgs } from '@remix-run/node';

export function loader({ request }: LoaderFunctionArgs): Response {
  const url = new URL(request.url);

  // Silently swallow well-known / browser-generated noise
  if (url.pathname.startsWith('/.well-known')) {
    return new Response(null, { status: 404 });
  }

  throw new Response('Not Found', { status: 404 });
}

export default function CatchAll(): null {
  return null;
}
