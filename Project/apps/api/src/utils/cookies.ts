import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';

export const COOKIE = { access: 'ssr_at', refresh: 'ssr_rt', session: 'ssr_session', csrf: 'ssr_csrf' } as const;

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? isProd,
  sameSite: 'lax',
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
});

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const refreshMs = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;
  res.cookie(COOKIE.access, accessToken, { ...base(), maxAge: env.ACCESS_TOKEN_TTL_MIN * 60_000 });
  res.cookie(COOKIE.refresh, refreshToken, { ...base(), path: '/api/v1/auth', maxAge: refreshMs });
  // Non-sensitive hint so the Next.js frontend can route signed-in users without reading tokens.
  res.cookie(COOKIE.session, '1', { ...base(), httpOnly: false, maxAge: refreshMs });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE.access, base());
  res.clearCookie(COOKIE.refresh, { ...base(), path: '/api/v1/auth' });
  res.clearCookie(COOKIE.session, { ...base(), httpOnly: false });
}

export function setCsrfCookie(res: Response, token: string) {
  res.cookie(COOKIE.csrf, token, { ...base(), maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 });
}
