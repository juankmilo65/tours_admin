/**
 * cURL Debug Helper
 * Generates and logs curl commands for debugging HTTP requests.
 * Controlled by the VITE_DEBUG_CURL environment variable.
 *
 * Usage:
 *   VITE_DEBUG_CURL=true   → logs curl commands to console
 *   VITE_DEBUG_CURL=false  → silent (production)
 */

interface ViteImportMetaEnv {
  readonly VITE_DEBUG_CURL?: string;
}

interface ViteImportMeta {
  readonly env: ViteImportMetaEnv;
}

const isDebugEnabled = (): boolean => {
  const val = (import.meta as unknown as ViteImportMeta).env.VITE_DEBUG_CURL;
  return val === 'true';
};

interface CurlGetOptions {
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  token?: string;
  label?: string;
}

interface CurlPostOptions {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  label?: string;
}

/**
 * Logs a cURL command for a GET request
 */
export const logCurlGet = (options: CurlGetOptions): void => {
  if (!isDebugEnabled()) return;

  const { url, params = {}, headers = {}, token, label = 'REQUEST' } = options;

  // Build query string
  const queryString = Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const fullUrl = queryString ? `${url}?${queryString}` : url;

  // Build header flags
  const headerLines: string[] = [];
  if (token !== undefined && token !== '') {
    headerLines.push(`  -H "Authorization: Bearer ${token}"`);
  }
  Object.entries(headers).forEach(([k, v]) => {
    headerLines.push(`  -H "${k}: ${v}"`);
  });

  const curl = [`curl -X GET "${fullUrl}" \\`, ...headerLines].join(' \\\n');

  console.warn(`\n📋 [CURL DEBUG] ${label}\n${curl}\n`);
};

/**
 * Logs a cURL command for a POST/PUT/PATCH/DELETE request
 */
export const logCurlPost = (options: CurlPostOptions): void => {
  if (!isDebugEnabled()) return;

  const { url, method = 'POST', body, headers = {}, token, label = 'REQUEST' } = options;

  // Build header flags
  const headerLines: string[] = [`  -H "Content-Type: application/json"`];
  if (token !== undefined && token !== '') {
    headerLines.push(`  -H "Authorization: Bearer ${token}"`);
  }
  Object.entries(headers).forEach(([k, v]) => {
    headerLines.push(`  -H "${k}: ${v}"`);
  });

  const bodyLine = body !== undefined ? [`  -d '${JSON.stringify(body, null, 2)}'`] : [];

  const curl = [`curl -X ${method} "${url}" \\`, ...headerLines, ...bodyLine].join(' \\\n');

  console.warn(`\n📋 [CURL DEBUG] ${label}\n${curl}\n`);
};
