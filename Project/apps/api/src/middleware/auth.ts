import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission, type Role } from '@skyspace/shared';
import { User } from '../models/user.model';
import { Session } from '../models/session.model';
import { COOKIE } from '../utils/cookies';
import { forbidden, unauthorized } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';

function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE.access];
}

/**
 * Resolves the caller. The user and session are re-read on every request so that suspended accounts
 * and revoked sessions lose access immediately rather than when the access token expires.
 */
async function resolveUser(req: Request): Promise<Express.AuthUser | undefined> {
  const token = readToken(req);
  if (!token) return undefined;
  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    return undefined;
  }
  const [user, session] = await Promise.all([
    User.findById(claims.sub).select('name email roles status').lean(),
    Session.findById(claims.sid).select('revokedAt expiresAt').lean(),
  ]);
  if (!user || user.status !== 'active') return undefined;
  if (!session || session.revokedAt || session.expiresAt < new Date()) return undefined;
  return { id: String(user._id), name: user.name, email: user.email, roles: user.roles as Role[] };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await resolveUser(req);
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = await resolveUser(req);
  if (!req.user) return next(unauthorized());
  next();
}

export const requirePermission =
  (...permissions: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!permissions.every((p) => hasPermission(req.user!.roles, p))) return next(forbidden());
    next();
  };

/** Convenience: authenticate and check permissions in one step. */
export const guard = (...permissions: Permission[]) => [requireAuth, requirePermission(...permissions)];

export const isAdmin = (user?: Express.AuthUser) => !!user?.roles.includes('admin');
export const isAgent = (user?: Express.AuthUser) => !!user?.roles.includes('agent');
