import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@skyspace/shared';
import { env } from '../config/env';

export interface AccessClaims {
  sub: string;
  roles: Role[];
  sid: string;
}

export function signAccessToken(claims: AccessClaims) {
  return jwt.sign(claims, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
    issuer: 'skyspace-api',
    audience: 'skyspace-web',
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    issuer: 'skyspace-api',
    audience: 'skyspace-web',
    algorithms: ['HS256'],
  }) as AccessClaims;
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Refresh / reset tokens are stored hashed (HMAC with a server secret) so a database leak does not expose usable tokens. */
export const hashToken = (token: string) => crypto.createHmac('sha256', env.REFRESH_TOKEN_SECRET).update(token).digest('hex');

export const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};
