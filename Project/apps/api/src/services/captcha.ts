import { env } from '../config/env';

/** Verifies an anti-bot token when a CAPTCHA provider is configured. With provider "none" every request passes. */
export async function verifyCaptcha(token: string | undefined, ip?: string): Promise<boolean> {
  if (env.CAPTCHA_PROVIDER === 'none') return true;
  if (!token || !env.CAPTCHA_SECRET) return false;
  const url =
    env.CAPTCHA_PROVIDER === 'turnstile'
      ? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      : 'https://www.google.com/recaptcha/api/siteverify';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.CAPTCHA_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}
