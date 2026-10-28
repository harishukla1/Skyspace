import request from 'supertest';
import type { Role } from '@skyspace/shared';
import { createApp } from '../src/app';
import { User } from '../src/models/user.model';
import { Category } from '../src/models/misc.models';
import { hashPassword } from '../src/modules/auth/auth.service';

export const app = createApp();

/** A supertest agent that keeps cookies and sends the CSRF header like the browser client does. */
export async function client() {
  const agent = request.agent(app);
  const r = await agent.get('/api/v1/auth/csrf');
  const token = r.body.csrfToken as string;
  const wrap = (m: 'post' | 'patch' | 'put' | 'delete') => (url: string) => agent[m](url).set('X-CSRF-Token', token);
  return { agent, get: (url: string) => agent.get(url), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete'), csrf: token };
}

let n = 0;
export async function createUser(roles: Role[], overrides: Partial<{ email: string; status: string }> = {}) {
  n++;
  const email = overrides.email ?? `user${n}-${Date.now()}@test.in`;
  const user = await User.create({
    name: `Test ${roles[0]} ${n}`,
    email,
    phone: `+9198${String(10000000 + n * 137 + (Date.now() % 1000)).slice(0, 8)}`,
    passwordHash: await hashPassword('Password@123'),
    roles,
    status: overrides.status ?? 'active',
  });
  return user;
}

export async function loginAs(roles: Role[]) {
  const user = await createUser(roles);
  const c = await client();
  const r = await c.post('/api/v1/auth/login').send({ email: user.email, password: 'Password@123' });
  if (r.status !== 200) throw new Error(`login failed ${r.status} ${JSON.stringify(r.body)}`);
  return { ...c, user };
}

export const seedCategories = () =>
  Category.insertMany([
    { name: 'Apartment', slug: 'apartment', category: 'residential' },
    { name: 'Office', slug: 'office', category: 'commercial' },
  ]);

export const validListing = (overrides: Record<string, unknown> = {}) => ({
  title: '3 BHK Apartment in Powai with lake view',
  description: 'Spacious lake-facing apartment with modern amenities, covered parking and 24x7 security.',
  transactionType: 'sale',
  propertyCategory: 'residential',
  propertyType: 'apartment',
  price: 25_000_000,
  address: 'Hiranandani Gardens, Powai',
  locality: 'Powai',
  city: 'Mumbai',
  state: 'Maharashtra',
  pinCode: '400076',
  bedrooms: 3,
  bathrooms: 3,
  carpetArea: 1200,
  builtUpArea: 1450,
  amenities: ['lift', 'gym'],
  ...overrides,
});

/** 1x1 PNG */
export const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

/** Create a listing as the given owner client and take it all the way to published via an admin client. */
export async function publishedListing(owner: Awaited<ReturnType<typeof loginAs>>, admin: Awaited<ReturnType<typeof loginAs>>, overrides = {}) {
  const created = await owner.post('/api/v1/properties').send(validListing(overrides));
  const id = created.body.property.id as string;
  await owner.post(`/api/v1/properties/${id}/images`).attach('images', tinyPng, { filename: 'a.png', contentType: 'image/png' });
  const sub = await owner.post(`/api/v1/properties/${id}/submit`);
  if (sub.status !== 200) throw new Error(`submit failed ${JSON.stringify(sub.body)}`);
  const ap = await admin.post(`/api/v1/admin/properties/${id}/approve`).send({});
  if (ap.status !== 200) throw new Error(`approve failed ${JSON.stringify(ap.body)}`);
  return ap.body.property as { id: string; slug: string; propertyId: string; status: string };
}
