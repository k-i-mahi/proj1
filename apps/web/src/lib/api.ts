import type { ApiErrorBody, AuthResponse } from '@civita/shared';
import { cleanParams } from './utils';

/** Base URL of the API. Empty in development, where Vite proxies /api to the server. */
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* --------------------------------------------------------------- tokens -- */

// The access token only ever lives in memory. The refresh token is an
// httpOnly cookie that JavaScript can't read, which keeps sessions safe from XSS.
let accessToken: string | null = null;
const listeners = new Set<(session: AuthResponse | null) => void>();

export const getAccessToken = () => accessToken;

export const setSession = (session: AuthResponse | null) => {
  accessToken = session?.accessToken ?? null;
  for (const listener of listeners) listener(session);
};

export const onSessionChange = (listener: (session: AuthResponse | null) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let refreshing: Promise<AuthResponse | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers
 * share one request, since the server rotates the token on every use.
 */
export const refreshSession = (): Promise<AuthResponse | null> => {
  refreshing ??= fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => (res.status === 200 ? ((await res.json()) as AuthResponse) : null))
    .catch(() => null)
    .then((session) => {
      setSession(session);
      return session;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

/* -------------------------------------------------------------- request -- */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

const toError = async (res: Response) => {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    res.status,
    body?.error.code ?? 'HTTP_ERROR',
    body?.error.message ?? `Request failed (${res.status})`,
    body?.error.details,
  );
};

const send = (path: string, { method = 'GET', body, params, signal }: RequestOptions) => {
  const query = params ? new URLSearchParams(cleanParams(params)).toString() : '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  return fetch(`${API_URL}/api/v1${path}${query ? `?${query}` : ''}`, {
    method,
    headers,
    credentials: 'include',
    signal,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let res: Response;
  try {
    res = await send(path, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  // Access token expired: refresh once, then replay the request.
  if (res.status === 401 && accessToken && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) res = await send(path, options);
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) =>
    request<T>(path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Human-readable message for any thrown value. */
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';
