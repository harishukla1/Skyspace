import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { COOKIE } from '../utils/cookies';
import { safeEqual } from '../utils/tokens';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for cookie-authenticated requests.
 * Requests authenticated with a Bearer header (non-browser clients) are exempt because browsers never attach it automatically.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  const cookie = req.cookies?.[COOKIE.csrf];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || !safeEqual(cookie, header)) {
    return next(new AppError(403, 'CSRF_FAILED', 'Security token missing or invalid. Refresh the page and try again.'));
  }
  next();
}
