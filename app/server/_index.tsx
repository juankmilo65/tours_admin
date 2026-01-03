import axios, { AxiosRequestConfig } from 'axios';

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

const ManageError = (error: ErrorProps, response: ResponseProps) => {
  if (error) {
    throw error;
  }
  const { message } = response;
  if (response?.status === 401) {
    throw new Error('Unauthorised');
  }
  throw new Error(message);
};

// Generic service result: either the expected data type T or an error shape
export type ServiceResult<T> = T | { error: unknown };

function createServiceREST<T = unknown>(url: string, endpoint: string, token: string) {
  function customService(token: string, config?: AxiosRequestConfig) {
    const timeout = Number(process.env.NEXT_PUBLIC_SERVICE_API_TIMEOUT) || 10000;
    const defaultConfig = {
      baseURL: url + '/api/',
      timeout: timeout,
      headers: {
        Authorization: token,
      },
    };

    // Merge default config with any additional config
    // If config has a timeout, it will override the default
    const finalConfig = {
      ...defaultConfig,
      ...config,
      headers: {
        ...defaultConfig.headers,
        ...(config?.headers || {}),
      },
    };

    return axios.create(finalConfig);
  }

  const service = customService;
  return {
    get: (config?: AxiosRequestConfig): Promise<ServiceResult<T>> =>
      service(token, config)
        .get<T>(`/${endpoint}`)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),

    count: (payload: Record<string, unknown>): Promise<ServiceResult<T>> =>
      service(token)
        .get<T>(`/count/${endpoint}`, { params: payload })
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),

    create: (payload: unknown, config?: AxiosRequestConfig): Promise<ServiceResult<T>> =>
      service(token, config)
        .post<T>(`/${endpoint}`, payload)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),

    update: (payload: unknown, config?: AxiosRequestConfig): Promise<ServiceResult<T>> =>
      service(token, config)
        .put<T>(`/${endpoint}`, payload)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),

    delete: (): Promise<ServiceResult<T>> =>
      service(token)
        .delete<T>(`/${endpoint}`)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),

    getById: (payload: string | number): Promise<ServiceResult<T>> =>
      service(token)
        .get<T>(`/${endpoint}/${payload}`)
        .then((response: import('axios').AxiosResponse<T>) => response.data)
        .catch((error: unknown) => ({ error })),
  };
}

export { ManageError, createServiceREST };
