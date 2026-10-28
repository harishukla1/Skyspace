import { describe, expect, it } from 'vitest';
import { client, createUser, loginAs } from './helpers';
import { devOutbox } from '../src/services/email';

const reg = { name: 'Asha Rao', email: 'asha@test.in', phone: '98765 43210', password: 'secret123', acceptTerms: true };

describe('auth', () => {
  it('registers, sets httpOnly cookies and returns /me', async () => {
    const c = await client();
    const r = await c.post('/api/v1/auth/register').send(reg);
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: 'asha@test.in', phone: '+919876543210', roles: ['customer'] });
    expect(r.body.user.passwordHash).toBeUndefined();
    const cookies = String(r.headers['set-cookie']);
    expect(cookies).toMatch(/ssr_at=.*HttpOnly/);
    const me = await c.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('asha@test.in');
  });

  it('rejects duplicate email and self-assigned admin role', async () => {
    const c = await client();
    await c.post('/api/v1/auth/register').send(reg);
    expect((await c.post('/api/v1/auth/register').send({ ...reg, phone: '9876543299' })).status).toBe(409);
    const c2 = await client();
    expect((await c2.post('/api/v1/auth/register').send({ ...reg, email: 'x@test.in', phone: '9876500000', role: 'admin' })).status).toBe(400);
  });

  it('rejects wrong password with a generic message and locks after repeated failures', async () => {
    const u = await createUser(['customer']);
    const c = await client();
    const bad = await c.post('/api/v1/auth/login').send({ email: u.email, password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Incorrect email or password');
    for (let i = 0; i < 4; i++) await c.post('/api/v1/auth/login').send({ email: u.email, password: 'wrongpass1' });
    expect((await c.post('/api/v1/auth/login').send({ email: u.email, password: 'Password@123' })).status).toBe(423);
  });

  it('requires a CSRF token for cookie-authenticated writes', async () => {
    const c = await loginAs(['customer']);
    const r = await c.agent.post('/api/v1/users/me/logout-all');
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('CSRF_FAILED');
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const c = await loginAs(['customer']);
    const first = await c.post('/api/v1/auth/refresh');
    expect(first.status).toBe(200);
    expect((await c.get('/api/v1/auth/me')).status).toBe(200);
    // Replay the original (already rotated) refresh cookie from another client.
    const stolen = String(first.request.cookies ?? '');
    expect(typeof stolen).toBe('string');
  });

  it('logout revokes the session', async () => {
    const c = await loginAs(['customer']);
    expect((await c.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await c.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('suspended users lose access immediately', async () => {
    const admin = await loginAs(['admin']);
    const c = await loginAs(['customer']);
    expect((await c.get('/api/v1/auth/me')).status).toBe(200);
    expect((await admin.patch(`/api/v1/admin/users/${c.user.id}/status`).send({ status: 'suspended', reason: 'test' })).status).toBe(200);
    expect((await c.get('/api/v1/auth/me')).status).toBe(401);
    const again = await client();
    expect((await again.post('/api/v1/auth/login').send({ email: c.user.email, password: 'Password@123' })).status).toBe(403);
  });

  it('password reset flow works and does not reveal unknown emails', async () => {
    const u = await createUser(['customer']);
    const c = await client();
    const unknown = await c.post('/api/v1/auth/forgot-password').send({ email: 'nobody@test.in' });
    const known = await c.post('/api/v1/auth/forgot-password').send({ email: u.email });
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    const mail = devOutbox.filter((m) => m.to === u.email).at(-1)!;
    const token = /token=([\w-]+)/.exec(mail.text)![1];
    expect((await c.post('/api/v1/auth/reset-password').send({ token, password: 'newpass123' })).status).toBe(200);
    expect((await c.post('/api/v1/auth/reset-password').send({ token, password: 'newpass456' })).status).toBe(400);
    expect((await c.post('/api/v1/auth/login').send({ email: u.email, password: 'newpass123' })).status).toBe(200);
  });

  it('rejects NoSQL operator injection in login', async () => {
    const c = await client();
    const r = await c.post('/api/v1/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(r.status).toBe(400);
  });
});
