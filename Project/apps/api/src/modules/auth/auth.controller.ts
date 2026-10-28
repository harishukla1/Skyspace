import type { Request, Response } from 'express';
import { User } from '../../models/user.model';
import { clearAuthCookies, COOKIE, setAuthCookies, setCsrfCookie } from '../../utils/cookies';
import { notFound } from '../../utils/errors';
import { randomToken } from '../../utils/tokens';
import { toUserDTO } from '../users/user.mapper';
import * as auth from './auth.service';

const client = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export async function csrf(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE.csrf] ?? randomToken(24);
  setCsrfCookie(res, token);
  res.json({ csrfToken: token });
}

export async function register(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await auth.register(req.body, client(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await auth.login(req.body, client(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user });
}

export async function refresh(req: Request, res: Response) {
  try {
    const { accessToken, refreshToken } = await auth.refresh(req.cookies?.[COOKIE.refresh], client(req));
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ ok: true });
  } catch (e) {
    clearAuthCookies(res);
    throw e;
  }
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies?.[COOKIE.refresh]);
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).lean();
  if (!user) throw notFound('User');
  res.json({ user: toUserDTO(user) });
}

export async function forgotPassword(req: Request, res: Response) {
  await auth.forgotPassword(req.body.email);
  res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  await auth.resetPassword(req.body.token, req.body.password);
  clearAuthCookies(res);
  res.json({ message: 'Password updated. Please sign in with your new password.' });
}

export async function verifyEmail(req: Request, res: Response) {
  await auth.verifyEmail(String(req.body.token ?? ''));
  res.json({ message: 'Email verified' });
}

export async function resendVerification(req: Request, res: Response) {
  await auth.sendVerificationEmail(req.user!.id, req.user!.email);
  res.json({ message: 'Verification email queued' });
}
