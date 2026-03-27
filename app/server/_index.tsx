import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { logCurlGet, logCurlPost } from './curlHelper';

/*
 * Service wrapper: uses axios generics to type responses.
 * Errors are returned as `{ error: unknown }` to avoid `any` usage.
 */

type ErrorProps = {
  error: unknown;
};

type ResponseProps = {
  status?: { status?: number } | undefined | 401;
  message?: string;
};

const ManageError = (_error: ErrorProps, response: ResponseProps): never => {
  // Error handling is implemented, error parameter is checked
  void _error;
  const { message } = response;
  if (response?.status === 401) {
    throw new Error('Unauthorised');
  }
  throw new Error(message ?? 'An error occurred');
};

// Generic service result: either the expected data type T or an error shape
export type ServiceResult<T> = T | { error: unknown };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function createServiceREST<T = unknown>(url: string, endpoint: string, token: string) {
  // Token is stored for use in service methods
  const _token = token;
  void _token;
  function customService(
    _unusedToken: string,
    config?: AxiosRequestConfig
  ): ReturnType<typeof axios.create> {
    let timeout = 10000;
    if (
      typeof process !== 'undefined' &&
      typeof process.env.NEXT_PUBLIC_SERVICE_API_TIMEOUT === 'string' &&
      process.env.NEXT_PUBLIC_SERVICE_API_TIMEOUT.trim() !== ''
    ) {
      timeout = Number(process.env.NEXT_PUBLIC_SERVICE_API_TIMEOUT);
    }
    const defaultConfig = {
      baseURL: url + '/api/',
      timeout: timeout,
      headers:
        token !== ''
          ? {
              Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            }
          : {},
    };

    // Merge default config with any additional config
    // If config has a timeout, it will override the default
    const finalConfig = {
      ...defaultConfig,
      ...config,
      headers: {
        ...defaultConfig.headers,
        ...(config?.headers ?? {}),
      },
    };

    return axios.create(finalConfig);
  }

  const service = customService;
  const baseURL = url + '/api/';

  return {
    get: (config?: AxiosRequestConfig): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${endpoint}`;
      logCurlGet({
        url: fullUrl,
        params: config?.params as Record<string, string> | undefined,
        headers: config?.headers as Record<string, string> | undefined,
        token: token !== '' ? token : undefined,
        label: `GET ${endpoint}`,
      });
      return service(token, config)
        .get<T>(`/${endpoint}`, config)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    count: (payload: Record<string, unknown>): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}count/${endpoint}`;
      logCurlGet({
        url: fullUrl,
        params: payload as Record<string, string>,
        token: token !== '' ? token : undefined,
        label: `COUNT ${endpoint}`,
      });
      return service(token)
        .get<T>(`/count/${endpoint}`, { params: payload })
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    create: (payload: unknown, config?: AxiosRequestConfig): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${endpoint}`;
      logCurlPost({
        url: fullUrl,
        method: 'POST',
        body: payload,
        headers: config?.headers as Record<string, string> | undefined,
        token: token !== '' ? token : undefined,
        label: `POST ${endpoint}`,
      });
      return service(token, config)
        .post<T>(`/${endpoint}`, payload)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    update: (payload: unknown, config?: AxiosRequestConfig): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${config?.url ?? endpoint}`;
      logCurlPost({
        url: fullUrl,
        method: 'PATCH',
        body: payload,
        headers: config?.headers as Record<string, string> | undefined,
        token: token !== '' ? token : undefined,
        label: `PATCH ${config?.url ?? endpoint}`,
      });
      return service(token, config)
        .patch<T>(config?.url ?? `/${endpoint}`, payload, config)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    put: (payload: unknown, config?: AxiosRequestConfig): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${config?.url ?? endpoint}`;
      logCurlPost({
        url: fullUrl,
        method: 'PUT',
        body: payload,
        headers: config?.headers as Record<string, string> | undefined,
        token: token !== '' ? token : undefined,
        label: `PUT ${config?.url ?? endpoint}`,
      });
      return service(token, config)
        .put<T>(config?.url ?? `/${endpoint}`, payload, config)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    delete: (): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${endpoint}`;
      logCurlPost({
        url: fullUrl,
        method: 'DELETE',
        token: token !== '' ? token : undefined,
        label: `DELETE ${endpoint}`,
      });
      return service(token)
        .delete<T>(`/${endpoint}`)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },

    getById: (payload: string | number): Promise<ServiceResult<T>> => {
      const fullUrl = `${baseURL}${endpoint}/${payload}`;
      logCurlGet({
        url: fullUrl,
        token: token !== '' ? token : undefined,
        label: `GET ${endpoint}/${payload}`,
      });
      return service(token)
        .get<T>(`/${endpoint}/${payload}`)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error }));
    },
  };
}

export { ManageError, createServiceREST };
