import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';

const make = (opts: Partial<Options>) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !env.RATE_LIMIT_ENABLED,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' } }),
    ...opts,
  });

export const globalLimiter = make({ windowMs: 15 * 60_000, limit: 600 });
export const loginLimiter = make({ windowMs: 15 * 60_000, limit: 10 });
export const registerLimiter = make({ windowMs: 60 * 60_000, limit: 10 });
export const passwordResetLimiter = make({ windowMs: 60 * 60_000, limit: 5 });
export const enquiryLimiter = make({ windowMs: 60 * 60_000, limit: 15 });
export const uploadLimiter = make({ windowMs: 15 * 60_000, limit: 60 });
