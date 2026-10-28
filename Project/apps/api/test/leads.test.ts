import { describe, expect, it } from 'vitest';
import { istToday } from '@skyspace/shared';
import { client, loginAs, publishedListing } from './helpers';
import { Property } from '../src/models/property.model';

const enquiry = (propertyId: string, extra = {}) => ({
  propertyId, name: 'Rahul Sharma', email: 'rahul@test.in', phone: '9876512345', message: 'Is this still available?', consent: true, enquiryType: 'buy', ...extra,
});
const future = (days: number) => istToday(new Date(Date.now() + days * 86_400_000));

describe('enquiries & leads', () => {
  it('guest enquiry → assigned agent sees it → updates status; customer list hides internal notes', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const agent = await loginAs(['agent']);
    const p = await publishedListing(owner, admin);
    await Property.updateOne({ _id: p.id }, { $set: { agentId: agent.user._id } });

    const customer = await loginAs(['customer']);
    const created = await customer.post('/api/v1/enquiries').send(enquiry(p.id));
    expect(created.status).toBe(201);

    // duplicate within window is rejected
    expect((await customer.post('/api/v1/enquiries').send(enquiry(p.id))).status).toBe(409);
    // honeypot
    expect((await (await client()).post('/api/v1/enquiries').send(enquiry(p.id, { phone: '9876500001', website: 'http://spam' }))).status).toBe(400);

    const list = await agent.get('/api/v1/agent/enquiries');
    expect(list.body.total).toBe(1);
    const id = list.body.items[0].id;

    // An unrelated agent cannot see or update it
    const other = await loginAs(['agent']);
    expect((await other.get(`/api/v1/enquiries/${id}`)).status).toBe(404);
    expect((await other.patch(`/api/v1/enquiries/${id}/status`).send({ status: 'contacted' })).status).toBe(404);

    const upd = await agent.patch(`/api/v1/enquiries/${id}/status`).send({ status: 'contacted', note: 'Called, interested' });
    expect(upd.status).toBe(200);
    expect(upd.body.enquiry.notes).toHaveLength(1);
    // invalid transition
    expect((await agent.patch(`/api/v1/enquiries/${id}/status`).send({ status: 'new' })).status).toBe(409);

    const mine = await customer.get('/api/v1/users/me/enquiries');
    expect(mine.body.items[0].status).toBe('contacted');
    expect(mine.body.items[0].notes).toEqual([]);

    // Contact details are never exposed through public property APIs
    const detail = await (await client()).get(`/api/v1/properties/${p.slug}`);
    expect(JSON.stringify(detail.body)).not.toContain('9876512345');
  });

  it('admin assigns lead and exports CSV; agents cannot export', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const agent = await loginAs(['agent']);
    const p = await publishedListing(owner, admin);
    await (await client()).post('/api/v1/enquiries').send(enquiry(p.id, { name: '=HYPERLINK("x")' }));
    const all = await admin.get('/api/v1/admin/enquiries');
    const id = all.body.items[0].id;
    expect((await admin.patch(`/api/v1/enquiries/${id}/assignment`).send({ agentId: agent.user.id })).body.enquiry.assignedAgent.id).toBe(agent.user.id);
    expect((await agent.get('/api/v1/agent/enquiries')).body.total).toBe(1);
    const csv = await admin.get('/api/v1/admin/enquiries/export');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain(`"'=HYPERLINK`);
    expect((await agent.get('/api/v1/admin/enquiries/export')).status).toBe(403);
  });
});

describe('site visits', () => {
  it('request → pending → owner confirms; double booking is prevented; customer cannot self-confirm', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    const customer = await loginAs(['customer']);
    const body = { propertyId: p.id, date: future(3), timeSlot: '11:00', name: 'Asha', phone: '9876511111', email: 'asha@test.in' };
    const r = await customer.post('/api/v1/site-visits').send(body);
    expect(r.status).toBe(201);
    expect(r.body.visit.status).toBe('pending_confirmation');
    expect(r.body.visit.scheduledAt).toBe(new Date(`${body.date}T05:30:00.000Z`).toISOString());
    const id = r.body.visit.id;

    expect((await customer.patch(`/api/v1/site-visits/${id}/status`).send({ status: 'confirmed' })).status).toBe(409);
    const conf = await owner.patch(`/api/v1/site-visits/${id}/status`).send({ status: 'confirmed' });
    expect(conf.body.visit.status).toBe('confirmed');

    // Same slot is now taken for other customers
    const g = await client();
    expect((await g.post('/api/v1/site-visits').send({ ...body, phone: '9876522222' })).status).toBe(409);

    const mine = await customer.get('/api/v1/users/me/site-visits');
    expect(mine.body.items[0].status).toBe('confirmed');
    expect((await customer.patch(`/api/v1/site-visits/${id}/status`).send({ status: 'cancelled' })).body.visit.status).toBe('cancelled');
    // slot released after cancellation
    expect((await g.post('/api/v1/site-visits').send({ ...body, phone: '9876522222' })).status).toBe(201);
  });

  it('rejects past times and dates too far ahead', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    const g = await client();
    const base = { propertyId: p.id, timeSlot: '11:00', name: 'Asha', phone: '9876511111', email: 'asha@test.in' };
    expect((await g.post('/api/v1/site-visits').send({ ...base, date: future(-1) })).status).toBe(400);
    expect((await g.post('/api/v1/site-visits').send({ ...base, date: future(90) })).status).toBe(400);
  });

  it('reschedule must be accepted by the other party', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    const customer = await loginAs(['customer']);
    const v = await customer.post('/api/v1/site-visits').send({ propertyId: p.id, date: future(4), timeSlot: '15:00', name: 'Asha', phone: '9876533333', email: 'a@test.in' });
    expect(v.status, JSON.stringify(v.body)).toBe(201);
    const id = v.body.visit.id;
    expect((await owner.patch(`/api/v1/site-visits/${id}/reschedule`).send({ date: future(5), timeSlot: '16:00' })).body.visit.status).toBe('rescheduled');
    expect((await owner.patch(`/api/v1/site-visits/${id}/status`).send({ status: 'confirmed' })).status).toBe(409);
    expect((await customer.patch(`/api/v1/site-visits/${id}/status`).send({ status: 'confirmed' })).body.visit.status).toBe('confirmed');
  });
});

describe('shortlist, saved searches & admin', () => {
  it('shortlist is idempotent and scoped to the user', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    const c = await loginAs(['customer']);
    expect((await c.post(`/api/v1/users/me/shortlist/${p.id}`)).status).toBe(201);
    expect((await c.post(`/api/v1/users/me/shortlist/${p.id}`)).status).toBe(200);
    expect((await c.get('/api/v1/users/me/shortlist')).body.total).toBe(1);
    const other = await loginAs(['customer']);
    expect((await other.get('/api/v1/users/me/shortlist')).body.total).toBe(0);
    expect((await c.delete(`/api/v1/users/me/shortlist/${p.id}`)).body.shortlisted).toBe(false);
  });

  it('saved searches CRUD', async () => {
    const c = await loginAs(['customer']);
    const s = await c.post('/api/v1/users/me/saved-searches').send({ name: 'Powai 3BHK', filters: { city: 'Mumbai', bedrooms: '3' } });
    expect(s.status).toBe(201);
    const other = await loginAs(['customer']);
    expect((await other.delete(`/api/v1/users/me/saved-searches/${s.body.savedSearch.id}`)).status).toBe(404);
    expect((await c.delete(`/api/v1/users/me/saved-searches/${s.body.savedSearch.id}`)).status).toBe(204);
  });

  it('dashboard metrics come from real records; non-admins are forbidden', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    await publishedListing(owner, admin);
    const d = await admin.get('/api/v1/admin/dashboard');
    expect(d.status).toBe(200);
    expect(d.body.kpis.published).toBe(1);
    expect(d.body.kpis.totalUsers).toBe(2);
    expect(d.body.conversion.rate).toBeNull(); // not enough data
    expect((await owner.get('/api/v1/admin/dashboard')).status).toBe(403);
    expect((await owner.get('/api/v1/admin/users')).status).toBe(403);
  });

  it('admins cannot demote or suspend themselves; actions are audited', async () => {
    const admin = await loginAs(['admin']);
    expect((await admin.patch(`/api/v1/admin/users/${admin.user.id}/roles`).send({ roles: ['customer'] })).status).toBe(403);
    expect((await admin.patch(`/api/v1/admin/users/${admin.user.id}/status`).send({ status: 'suspended' })).status).toBe(403);
    const target = await loginAs(['customer']);
    await admin.patch(`/api/v1/admin/users/${target.user.id}/roles`).send({ roles: ['agent'] });
    const logs = await admin.get('/api/v1/admin/audit-logs');
    expect(logs.body.items.some((l: { action: string }) => l.action === 'user.roles_changed')).toBe(true);
  });

  it('health endpoint reports db status', async () => {
    const r = await (await client()).get('/health');
    expect(r.body.status).toBe('ok');
  });
});
