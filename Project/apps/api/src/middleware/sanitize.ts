import type { NextFunction, Request, Response } from 'express';

const SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'token']);

/**
 * Defence in depth against NoSQL operator injection and stored markup:
 *  - drops object keys that start with "$" or contain "." (Mongo operators / path traversal)
 *  - strips HTML tags from user-supplied strings (React escapes output too; this keeps stored data clean)
 */
function clean(value: unknown, key?: string): unknown {
  if (typeof value === 'string') return key && SKIP_KEYS.has(key) ? value : value.replace(/<[^>]*>/g, '');
  if (Array.isArray(value)) return value.map((v) => clean(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v, k);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
}

/** Query values must be plain strings or string arrays — reject nested objects like ?price[$gt]=0. */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction) {
  for (const [k, v] of Object.entries(req.query)) {
    if (k.includes('$') || (v && typeof v === 'object' && !Array.isArray(v))) {
      return _res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed query string' } });
    }
  }
  next();
}
