import argon2 from 'argon2';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '@skyspace/shared';
import { env } from '../../config/env';
import { User } from '../../models/user.model';
import { Session } from '../../models/session.model';
import { OneTimeToken } from '../../models/one-time-token.model';
import { AppError, badRequest, conflict, unauthorized } from '../../utils/errors';
import { hashToken, randomToken, signAccessToken } from '../../utils/tokens';
import { sendEmail } from '../../services/email';
import { toUserDTO } from '../users/user.mapper';

/** OWASP-recommended Argon2id parameters (19 MiB, 2 iterations). */
const ARGON_OPTS = { type: argon2.argon2id as 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 };
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MIN = 30;

export const hashPassword = (pw: string) => argon2.hash(pw, ARGON_OPTS);
// Used to equalise timing when the email does not exist.
let dummyHash: Promise<string> | undefined;

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

async function issueSession(user: { _id: unknown; roles: string[] }, client: ClientInfo) {
  const refreshToken = randomToken(48);
  const session = await Session.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    ip: client.ip,
    userAgent: client.userAgent?.slice(0, 300),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    lastUsedAt: new Date(),
  });
  const accessToken = signAccessToken({ sub: String(user._id), roles: user.roles as never, sid: String(session._id) });
  return { accessToken, refreshToken };
}

export async function register(input: z.infer<typeof registerSchema>, client: ClientInfo) {
  const existing = await User.findOne({ $or: [{ email: input.email }, { phone: input.phone }] }).select('email').lean();
  if (existing) throw conflict(existing.email === input.email ? 'An account with this email already exists' : 'An account with this phone number already exists');
  const roles = input.role === 'owner' ? ['owner', 'customer'] : ['customer'];
  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    roles,
    lastLoginAt: new Date(),
  });
  await sendVerificationEmail(String(user._id), user.email);
  const tokens = await issueSession(user, client);
  return { user: toUserDTO(user), ...tokens };
}

export async function login(input: z.infer<typeof loginSchema>, client: ClientInfo) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash +failedLoginCount +lockedUntil');
  if (!user) {
    dummyHash ??= hashPassword('timing-equaliser-password-1');
    await argon2.verify(await dummyHash, input.password).catch(() => false);
    throw unauthorized('Incorrect email or password');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again in a few minutes or reset your password.');
  }
  const ok = await argon2.verify(user.passwordHash, input.password).catch(() => false);
  if (!ok) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      user.failedLoginCount = 0;
    }
    await user.save();
    throw unauthorized('Incorrect email or password');
  }
  if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is suspended or deactivated. Contact support.');
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueSession(user, client);
  return { user: toUserDTO(user), ...tokens };
}

export async function refresh(refreshToken: string | undefined, client: ClientInfo) {
  if (!refreshToken) throw unauthorized('Session expired');
  const hash = hashToken(refreshToken);
  const session = await Session.findOne({ tokenHash: hash });
  if (!session) {
    // Reuse of a rotated token => likely theft. Revoke that whole session.
    const stolen = await Session.findOne({ previousTokenHashes: hash });
    if (stolen && !stolen.revokedAt) {
      stolen.revokedAt = new Date();
      await stolen.save();
    }
    throw unauthorized('Session expired');
  }
  if (session.revokedAt || session.expiresAt < new Date()) throw unauthorized('Session expired');
  const user = await User.findById(session.userId).select('roles status').lean();
  if (!user || user.status !== 'active') {
    session.revokedAt = new Date();
    await session.save();
    throw unauthorized('Session expired');
  }
  const next = randomToken(48);
  session.previousTokenHashes = [...session.previousTokenHashes.slice(-9), hash];
  session.tokenHash = hashToken(next);
  session.lastUsedAt = new Date();
  session.ip = client.ip;
  await session.save();
  const accessToken = signAccessToken({ sub: String(user._id), roles: user.roles as never, sid: String(session._id) });
  return { accessToken, refreshToken: next };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await Session.updateOne({ tokenHash: hashToken(refreshToken) }, { $set: { revokedAt: new Date() } });
}

export const revokeAllSessions = (userId: string) =>
  Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email, status: 'active' }).select('_id email').lean();
  // Always respond identically so the endpoint cannot be used to enumerate accounts.
  if (!user) return;
  await OneTimeToken.deleteMany({ userId: user._id, purpose: 'password_reset' });
  const token = randomToken(32);
  await OneTimeToken.create({ userId: user._id, purpose: 'password_reset', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000) });
  const link = `${env.FRONTEND_ORIGIN.split(',')[0]}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your Sky Space Realty password',
    text: `We received a request to reset your password. This link is valid for ${RESET_TTL_MIN} minutes:\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function resetPassword(token: string, password: string) {
  const record = await OneTimeToken.findOne({ tokenHash: hashToken(token), purpose: 'password_reset' });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw badRequest('This reset link is invalid or has expired');
  const user = await User.findById(record.userId);
  if (!user || user.status !== 'active') throw badRequest('This reset link is invalid or has expired');
  user.passwordHash = await hashPassword(password);
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  await user.save();
  record.usedAt = new Date();
  await record.save();
  await revokeAllSessions(String(user._id));
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw unauthorized();
  if (!(await argon2.verify(user.passwordHash, current).catch(() => false))) throw badRequest('Current password is incorrect');
  user.passwordHash = await hashPassword(next);
  await user.save();
  await revokeAllSessions(userId);
}

export async function sendVerificationEmail(userId: string, email: string) {
  await OneTimeToken.deleteMany({ userId, purpose: 'email_verify' });
  const token = randomToken(32);
  await OneTimeToken.create({ userId, purpose: 'email_verify', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 48 * 3_600_000) });
  const link = `${env.FRONTEND_ORIGIN.split(',')[0]}/verify-email?token=${token}`;
  await sendEmail({ to: email, subject: 'Verify your email — Sky Space Realty', text: `Confirm your email address:\n\n${link}` });
}

export async function verifyEmail(token: string) {
  const record = await OneTimeToken.findOne({ tokenHash: hashToken(token), purpose: 'email_verify' });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw badRequest('This verification link is invalid or has expired');
  await User.updateOne({ _id: record.userId }, { $set: { emailVerified: true } });
  record.usedAt = new Date();
  await record.save();
}
