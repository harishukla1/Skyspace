import { describe, expect, it } from 'vitest';
import { client, loginAs, publishedListing, tinyPng, validListing } from './helpers';

describe('listing workflow', () => {
  it('customers cannot create listings', async () => {
    const c = await loginAs(['customer']);
    expect((await c.post('/api/v1/properties').send(validListing())).status).toBe(403);
  });

  it('guests are blocked from protected actions', async () => {
    const c = await client();
    expect((await c.post('/api/v1/properties').send(validListing())).status).toBe(401);
    expect((await c.get('/api/v1/admin/dashboard')).status).toBe(401);
    expect((await c.get('/api/v1/users/me/shortlist')).status).toBe(401);
  });

  it('owner creates draft → submit → admin approves → searchable', async () => {
    const owner = await loginAs(['owner', 'customer']);
    const admin = await loginAs(['admin']);
    const draft = await owner.post('/api/v1/properties').send({ transactionType: 'sale', propertyCategory: 'residential', propertyType: 'apartment', city: 'Mumbai' });
    expect(draft.status).toBe(201);
    expect(draft.body.property.status).toBe('draft');
    const id = draft.body.property.id;

    // Incomplete drafts cannot be submitted
    const early = await owner.post(`/api/v1/properties/${id}/submit`);
    expect(early.status).toBe(400);
    expect(early.body.error.details.length).toBeGreaterThan(0);

    expect((await owner.patch(`/api/v1/properties/${id}`).send(validListing())).status).toBe(200);
    expect((await owner.post(`/api/v1/properties/${id}/submit`)).status).toBe(422); // no photos yet
    const up = await owner.post(`/api/v1/properties/${id}/images`).attach('images', tinyPng, { filename: 'a.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const sub = await owner.post(`/api/v1/properties/${id}/submit`);
    expect(sub.body.property.status).toBe('pending_approval');

    // Owner cannot self-approve via either route
    expect((await owner.post(`/api/v1/admin/properties/${id}/approve`).send({})).status).toBe(403);
    expect((await owner.post(`/api/v1/properties/${id}/status`).send({ status: 'published' })).status).toBe(409);

    // Not public yet
    const guest = await client();
    expect((await guest.get(`/api/v1/properties/${sub.body.property.slug}`)).status).toBe(404);

    const ap = await admin.post(`/api/v1/admin/properties/${id}/approve`).send({ comment: 'Looks good' });
    expect(ap.status).toBe(200);
    expect(ap.body.property.status).toBe('published');

    const search = await guest.get('/api/v1/properties?city=mumbai&transactionType=sale&bedrooms=3');
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].id).toBe(id);
    const detail = await guest.get(`/api/v1/properties/${ap.body.property.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.property.contact.phone).toBeUndefined(); // showContactDetails defaults to false

    const managed = await owner.get(`/api/v1/owner/properties/${id}`);
    expect(managed.body.history.map((h: { newStatus: string }) => h.newStatus)).toEqual(['published', 'approved', 'pending_approval', 'draft']);
  });

  it('material edits to a published listing require re-approval; minor edits do not', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    const minor = await owner.patch(`/api/v1/properties/${p.id}`).send({ amenities: ['lift', 'gym', 'park'] });
    expect(minor.body.reapprovalRequired).toBe(false);
    expect(minor.body.property.status).toBe('published');
    const major = await owner.patch(`/api/v1/properties/${p.id}`).send({ price: 21_000_000 });
    expect(major.body.reapprovalRequired).toBe(true);
    expect(major.body.property.status).toBe('pending_approval');
  });

  it("owners cannot see or edit other owners' listings", async () => {
    const a = await loginAs(['owner']);
    const b = await loginAs(['owner']);
    const created = await a.post('/api/v1/properties').send(validListing());
    const id = created.body.property.id;
    expect((await b.patch(`/api/v1/properties/${id}`).send({ title: 'Hijacked listing title' })).status).toBe(404);
    expect((await b.get(`/api/v1/owner/properties/${id}`)).status).toBe(404);
  });

  it('validates search filters and enforces page limits', async () => {
    const c = await client();
    expect((await c.get('/api/v1/properties?limit=500')).status).toBe(400);
    expect((await c.get('/api/v1/properties?transactionType=lease')).status).toBe(400);
    expect((await c.get('/api/v1/properties?price[$gt]=0')).status).toBe(400);
  });

  it('filters by price, sorts, and paginates', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    await publishedListing(owner, admin, { price: 9_000_000, title: '2 BHK Apartment in Powai near lake' });
    await publishedListing(owner, admin, { price: 30_000_000 });
    await publishedListing(owner, admin, { transactionType: 'rent', price: undefined, monthlyRent: 80_000, title: '3 BHK Flat for rent in Powai' });
    const g = await client();
    const sale = await g.get('/api/v1/properties?transactionType=sale&sort=price_asc');
    expect(sale.body.items.map((i: { price: number }) => i.price)).toEqual([9_000_000, 30_000_000]);
    expect((await g.get('/api/v1/properties?transactionType=sale&maxPrice=10000000')).body.total).toBe(1);
    expect((await g.get('/api/v1/properties?transactionType=rent&maxPrice=100000')).body.total).toBe(1);
    const paged = await g.get('/api/v1/properties?limit=2&page=2');
    expect(paged.body).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(paged.body.items).toHaveLength(1);
    expect((await g.get('/api/v1/properties?q=lake')).body.total).toBeGreaterThanOrEqual(1);
  });

  it('rejects non-image uploads by file signature', async () => {
    const owner = await loginAs(['owner']);
    const created = await owner.post('/api/v1/properties').send(validListing());
    const r = await owner.post(`/api/v1/properties/${created.body.property.id}/images`).attach('images', Buffer.from('<?php echo 1; ?> padding padding'), { filename: 'x.png', contentType: 'image/png' });
    expect(r.status).toBe(400);
  });

  it('admin can suspend a published listing and it disappears from search', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    expect((await admin.post(`/api/v1/admin/properties/${p.id}/suspend`).send({ comment: 'Under investigation' })).status).toBe(200);
    const g = await client();
    expect((await g.get('/api/v1/properties')).body.total).toBe(0);
    expect((await g.get(`/api/v1/properties/${p.slug}`)).status).toBe(404);
  });

  it('owner can mark a listing sold; detail stays visible but leaves search', async () => {
    const owner = await loginAs(['owner']);
    const admin = await loginAs(['admin']);
    const p = await publishedListing(owner, admin);
    expect((await owner.post(`/api/v1/properties/${p.id}/status`).send({ status: 'sold' })).body.property.status).toBe('sold');
    const g = await client();
    expect((await g.get('/api/v1/properties')).body.total).toBe(0);
    expect((await g.get(`/api/v1/properties/${p.slug}`)).body.property.status).toBe('sold');
  });
});
