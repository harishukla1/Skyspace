'use client';

import { PUBLIC_API } from './config';
import { ApiError, toApiError } from './api-error';

/**
 * Browser API client. Cookies carry auth (httpOnly), a CSRF token is attached to unsafe requests,
 * and a single 401 triggers one refresh-token rotation before failing.
 */
let csrfToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

async function getCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${PUBLIC_API}/auth/csrf`, { credentials: 'include' });
  const body = await res.json();
  csrfToken = body.csrfToken as string;
  return csrfToken;
}

async function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${PUBLIC_API}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': await getCsrf() } });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  form?: FormData;
  /** Skip the refresh-and-retry behaviour (used by auth endpoints themselves). */
  noRefresh?: boolean;
  signal?: AbortSignal;
}

export function qs(query?: RequestOpts['query']) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const method = opts.method ?? (opts.body || opts.form ? 'POST' : 'GET');
  const doFetch = async () => {
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrf();
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${PUBLIC_API}${path}${qs(opts.query)}`, {
      method,
      credentials: 'include',
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  };
  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 403) {
    const err = await toApiError(res.clone());
    if (err.code === 'CSRF_FAILED') {
      csrfToken = null;
      res = await doFetch();
    }
  }
  if (res.status === 401 && !opts.noRefresh && (await refresh())) res = await doFetch();
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

export const resetCsrf = () => (csrfToken = null);
