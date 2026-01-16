/**
 * Authentication Loader Helper
 * Reusable loader function to check authentication for protected routes
 */

import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { getSession } from './sessions';

/**
 * Loader that checks if user is authenticated
 * Redirects to login if not authenticated
 * Use this as a helper function in route loaders
 */
export async function requireAuth({ request }: LoaderFunctionArgs): Promise<null> {
  const session = await getSession(request.headers.get('Cookie'));
  const authToken = session.get('authToken') as string | undefined;
  const hasToken = (authToken?.trim() ?? '') !== '';

  // Si no hay token, redirigir al login
  if (!hasToken) {
    throw redirect('/');
  }

  // Si hay token, permitir acceso
  return null;
}

/**
 * Loader that checks if user is NOT authenticated
 * Redirects to dashboard if already authenticated
 * Use this for public routes like login/register
 */
export async function requireNoAuth({ request }: LoaderFunctionArgs): Promise<null> {
  const session = await getSession(request.headers.get('Cookie'));
  const authToken = session.get('authToken') as string | undefined;
  const hasToken = (authToken?.trim() ?? '') !== '';

  // Si ya está autenticado, redirigir al dashboard
  if (hasToken) {
    throw redirect('/dashboard');
  }

  // Si no está autenticado, permitir acceso
  return null;
}
