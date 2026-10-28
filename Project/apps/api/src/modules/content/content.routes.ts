import { Router } from 'express';
import { contactFormSchema, newsletterSchema, type CityDTO, type SiteContentDTO } from '@skyspace/shared';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/auth';
import { enquiryLimiter } from '../../middleware/rateLimit';
import { Category, City, Enquiry, Subscriber } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { notFound } from '../../utils/errors';
import { param } from '../../utils/http';
import { getSiteConfig } from '../../services/site-config';
import { SUMMARY_PROJECTION, toSummary } from '../properties/property.mapper';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toCityDTO = (c: any, propertyCount?: number): CityDTO => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  state: c.state,
  popular: !!c.popular,
  active: !!c.active,
  imageUrl: c.imageUrl || undefined,
  localities: (c.localities ?? []).map((l: any) => ({ name: l.name, slug: l.slug, pinCodes: l.pinCodes ?? [] })),
  propertyCount,
});

export async function publicContent(): Promise<SiteContentDTO> {
  const cfg = await getSiteConfig();
  return {
    banners: cfg.banners as SiteContentDTO['banners'],
    faqs: cfg.faqs as SiteContentDTO['faqs'],
    testimonials: cfg.testimonials as SiteContentDTO['testimonials'],
    pages: cfg.pages as SiteContentDTO['pages'],
    seo: cfg.seo as SiteContentDTO['seo'],
    settings: { supportEmail: cfg.settings.supportEmail, supportPhone: cfg.settings.supportPhone, officeAddress: cfg.settings.officeAddress },
  };
}

async function cityCounts() {
  const rows = await Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$citySlug', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id as string, r.count as number]));
}

export const contentRouter = Router();

contentRouter.get('/home', async (_req, res) => {
  const [featured, recent, cities, counts, categories, typeCounts, content] = await Promise.all([
    Property.find({ status: 'published', featured: true }).select(SUMMARY_PROJECTION).sort({ publishedAt: -1 }).limit(8).lean(),
    Property.find({ status: 'published' }).select(SUMMARY_PROJECTION).sort({ publishedAt: -1 }).limit(8).lean(),
    City.find({ active: true, popular: true }).select('-localities').sort({ name: 1 }).limit(12).lean(),
    cityCounts(),
    Category.find({ active: true }).sort({ order: 1 }).lean(),
    Property.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$propertyType', count: { $sum: 1 } } }]),
    publicContent(),
  ]);
  const tc = new Map(typeCounts.map((r) => [r._id as string, r.count as number]));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    featured: featured.map(toSummary),
    recent: recent.map(toSummary),
    popularCities: cities.map((c) => toCityDTO(c, counts.get(c.slug) ?? 0)),
    categoryCounts: categories.map((c) => ({ slug: c.slug, name: c.name, category: c.category, count: tc.get(c.slug) ?? 0 })),
    content,
  });
});

contentRouter.get('/site', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=120');
  res.json(await publicContent());
});

contentRouter.post('/contact', enquiryLimiter, optionalAuth, validate({ body: contactFormSchema }), async (req, res) => {
  const { website: _hp, consent: _c, ...data } = req.body;
  await Enquiry.create({ ...data, customerId: req.user?.id, source: 'contact_form', enquiryType: 'general', consentAt: new Date(), history: [{ to: 'new' }] });
  res.status(201).json({ message: 'Thanks — our team will get back to you within one business day.' });
});

contentRouter.post('/newsletter', enquiryLimiter, validate({ body: newsletterSchema }), async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email, consentAt: new Date() } }, { upsert: true });
  res.status(201).json({ message: 'Subscribed' });
});

/** Minimal data for sitemap generation by the frontend. */
contentRouter.get('/sitemap', async (_req, res) => {
  const [props, cities] = await Promise.all([
    Property.find({ status: 'published' }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(45_000).lean(),
    City.find({ active: true }).select('slug updatedAt').lean(),
  ]);
  res.json({
    properties: props.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
    cities: cities.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt })),
  });
});

export const catalogueRouter = Router();
catalogueRouter.get('/cities', async (req, res) => {
  const filter: any = { active: true };
  if (req.query.popular === 'true') filter.popular = true;
  const [cities, counts] = await Promise.all([City.find(filter).sort({ popular: -1, name: 1 }).limit(500).lean(), cityCounts()]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ items: cities.map((c) => toCityDTO(c, counts.get(c.slug) ?? 0)) });
});
catalogueRouter.get('/cities/:slug', async (req, res) => {
  const city = await City.findOne({ slug: param(req, 'slug'), active: true }).lean();
  if (!city) throw notFound('City');
  const localityCounts = await Property.aggregate([
    { $match: { status: 'published', citySlug: city.slug } },
    { $group: { _id: '$localitySlug', count: { $sum: 1 } } },
  ]);
  const lc = new Map(localityCounts.map((r) => [r._id, r.count]));
  const dto = toCityDTO(city, localityCounts.reduce((s, r) => s + r.count, 0));
  res.json({ city: { ...dto, localities: dto.localities.map((l) => ({ ...l, propertyCount: lc.get(l.slug) ?? 0 })) } });
});
catalogueRouter.get('/categories', async (_req, res) => {
  const items = await Category.find({ active: true }).sort({ category: 1, order: 1 }).lean();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ items: items.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, category: c.category, active: c.active, order: c.order })) });
});
