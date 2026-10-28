import { Router, type Request } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  agentCreateSchema, assignAgentSchema, categorySchema, citySchema, featureSchema, listingStatusChangeSchema, moderationCommentSchema, objectId,
  platformSettingsSchema, rejectSchema, reportStatusSchema, siteContentSchema, slugify, userRolesSchema, userStatusSchema, verificationSchema,
  ROLES, type ListingStatus,
} from '@skyspace/shared';
import { guard } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { Property } from '../../models/property.model';
import { User } from '../../models/user.model';
import { AgentProfile, AuditLog, Category, City, Enquiry, ListingStatusHistory, Report, SiteConfig } from '../../models/misc.models';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { escapeRegex, pageParams, paginate, param, queryStr } from '../../utils/http';
import { randomToken } from '../../utils/tokens';
import { audit } from '../../services/audit';
import { getSiteConfig } from '../../services/site-config';
import { notify } from '../../services/notify';
import { SUMMARY_PROJECTION, toManaged, toSummary } from '../properties/property.mapper';
import { transition } from '../properties/property.service';
import * as enquiries from '../enquiries/enquiry.service';
import * as visits from '../site-visits/site-visit.service';
import { listOpts } from '../enquiries/enquiry.routes';
import { visitListOpts } from '../site-visits/site-visit.routes';
import { forgotPassword, hashPassword, revokeAllSessions } from '../auth/auth.service';
import { toUserDTO } from '../users/user.mapper';
import { ensureAgentProfile, performanceFor } from '../agents/agent.routes';
import { toCityDTO } from '../content/content.routes';
import { dashboard } from './dashboard.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
const idParams = validate({ params: z.object({ id: objectId }) });
export const adminRouter = Router();

/* ---------------- Dashboard ---------------- */
adminRouter.get('/dashboard', ...guard('admin:dashboard'), async (req, res) => {
  const to = queryStr(req, 'to') ? new Date(queryStr(req, 'to')!) : new Date();
  const from = queryStr(req, 'from') ? new Date(queryStr(req, 'from')!) : new Date(to.getTime() - 90 * 86_400_000);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) throw badRequest('Invalid date range');
  if (to.getTime() - from.getTime() > 3 * 366 * 86_400_000) throw badRequest('Date range cannot exceed 3 years');
  res.json(await dashboard(from, to));
});

/* ---------------- Properties & moderation ---------------- */
adminRouter.get('/properties', ...guard('admin:properties_moderate'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const f: any = {};
  const status = queryStr(req, 'status');
  if (status) f.status = status;
  const city = queryStr(req, 'city');
  if (city) f.citySlug = slugify(city);
  const tt = queryStr(req, 'transactionType');
  if (tt) f.transactionType = tt;
  const cat = queryStr(req, 'category');
  if (cat) f.propertyCategory = cat;
  const q = queryStr(req, 'q');
  if (q) f.$or = [{ propertyId: q.toUpperCase() }, { title: { $regex: escapeRegex(q), $options: 'i' } }];
  if (req.query.featured === 'true') f.featured = true;
  const sort: any = status === 'pending_approval' ? { submittedAt: 1 } : { updatedAt: -1 };
  const [docs, total] = await Promise.all([
    Property.find(f).select(`${SUMMARY_PROJECTION} ownerId agentId submittedAt updatedAt`).sort(sort).skip(skip).limit(limit).populate('ownerId', 'name email').populate('agentId', 'name').lean(),
    Property.countDocuments(f),
  ]);
  const items = docs.map((d: any) => ({
    ...toSummary(d),
    owner: d.ownerId ? { id: String(d.ownerId._id), name: d.ownerId.name, email: d.ownerId.email } : undefined,
    agent: d.agentId ? { id: String(d.agentId._id), name: d.agentId.name } : undefined,
    submittedAt: d.submittedAt?.toISOString(),
    updatedAt: d.updatedAt?.toISOString(),
  }));
  res.json(paginate(items, total, page, limit));
});

adminRouter.get('/properties/:id', ...guard('admin:properties_moderate'), idParams, async (req, res) => {
  const p = await Property.findById(param(req, 'id')).lean();
  if (!p) throw notFound('Property');
  const [history, reports, owner] = await Promise.all([
    ListingStatusHistory.find({ propertyId: p._id }).sort({ createdAt: -1 }).limit(100).populate('changedBy', 'name').lean(),
    Report.find({ propertyId: p._id }).sort({ createdAt: -1 }).limit(50).lean(),
    User.findById(p.ownerId).select('name email phone roles status').lean(),
  ]);
  res.json({
    property: toManaged(p),
    owner: owner ? { id: String(owner._id), name: owner.name, email: owner.email, phone: owner.phone, roles: owner.roles, status: owner.status } : undefined,
    history: history.map((h: any) => ({ id: String(h._id), previousStatus: h.previousStatus, newStatus: h.newStatus, comment: h.comment, changedBy: h.changedBy ? { id: String(h.changedBy._id), name: h.changedBy.name } : undefined, createdAt: h.createdAt })),
    reports: reports.map((r) => ({ id: String(r._id), reason: r.reason, details: r.details, status: r.status, createdAt: r.createdAt })),
  });
});

async function moderate(req: Request, to: ListingStatus, comment?: string) {
  const p = await Property.findById(param(req, 'id'));
  if (!p) throw notFound('Property');
  if (String(p.ownerId) === req.user!.id && ['approved', 'published'].includes(to) && p.status === 'pending_approval') {
    throw forbidden('You cannot approve a listing you own. Ask another administrator.');
  }
  const from = p.status;
  await transition(p, to, 'admin', req.user!.id, comment);
  await audit(req, `listing.${to}`, 'Property', String(p._id), { from, to, comment });
  return toManaged(p.toObject());
}

adminRouter.post('/properties/:id/approve', ...guard('admin:properties_moderate'), idParams, validate({ body: moderationCommentSchema }), async (req, res) => {
  const { settings } = await getSiteConfig();
  let property = await moderate(req, 'approved', req.body.comment);
  if (settings.autoPublishOnApprove) property = await moderate(req, 'published', req.body.comment);
  res.json({ property });
});
adminRouter.post('/properties/:id/publish', ...guard('admin:properties_moderate'), idParams, validate({ body: moderationCommentSchema }), async (req, res) => {
  res.json({ property: await moderate(req, 'published', req.body.comment) });
});
adminRouter.post('/properties/:id/reject', ...guard('admin:properties_moderate'), idParams, validate({ body: rejectSchema }), async (req, res) => {
  res.json({ property: await moderate(req, 'rejected', req.body.comment) });
});
adminRouter.post('/properties/:id/suspend', ...guard('admin:properties_moderate'), idParams, validate({ body: rejectSchema }), async (req, res) => {
  res.json({ property: await moderate(req, 'suspended', req.body.comment) });
});
adminRouter.post('/properties/:id/status', ...guard('admin:properties_moderate'), idParams, validate({ body: listingStatusChangeSchema }), async (req, res) => {
  res.json({ property: await moderate(req, req.body.status, req.body.comment) });
});
adminRouter.patch('/properties/:id/feature', ...guard('admin:content_manage'), idParams, validate({ body: featureSchema }), async (req, res) => {
  const p = await Property.findOneAndUpdate({ _id: param(req, 'id'), ...(req.body.featured ? { status: 'published' } : {}) }, { $set: { featured: req.body.featured } }, { new: true }).lean();
  if (!p) throw badRequest('Only published listings can be featured');
  await audit(req, req.body.featured ? 'listing.featured' : 'listing.unfeatured', 'Property', String(p._id));
  res.json({ property: toManaged(p) });
});
adminRouter.patch('/properties/:id/verification', ...guard('admin:properties_moderate'), idParams, validate({ body: verificationSchema }), async (req, res) => {
  const verified = req.body.verificationStatus === 'verified';
  const p = await Property.findByIdAndUpdate(
    param(req, 'id'),
    { $set: { verificationStatus: req.body.verificationStatus, verifiedAt: verified ? new Date() : undefined, verifiedBy: verified ? req.user!.id : undefined } },
    { new: true },
  ).lean();
  if (!p) throw notFound('Property');
  await audit(req, 'listing.verification', 'Property', String(p._id), { verificationStatus: req.body.verificationStatus, comment: req.body.comment });
  res.json({ property: toManaged(p) });
});
adminRouter.patch('/properties/:id/agent', ...guard('admin:properties_moderate'), idParams, validate({ body: assignAgentSchema }), async (req, res) => {
  if (req.body.agentId) {
    const agent = await User.exists({ _id: req.body.agentId, roles: 'agent', status: 'active' });
    if (!agent) throw badRequest('Select an active agent');
  }
  const p = await Property.findByIdAndUpdate(param(req, 'id'), req.body.agentId ? { $set: { agentId: req.body.agentId } } : { $unset: { agentId: 1 } }, { new: true }).lean();
  if (!p) throw notFound('Property');
  await audit(req, 'listing.agent_assigned', 'Property', String(p._id), { agentId: req.body.agentId });
  if (req.body.agentId) await notify({ userId: req.body.agentId, type: 'lead_assigned', title: 'Listing assigned to you', message: `${p.propertyId}: ${p.title}`, link: `/owner/listings/${p._id}` });
  res.json({ property: toManaged(p) });
});

/* ---------------- Users & roles ---------------- */
adminRouter.get('/users', ...guard('admin:users_manage'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const f: any = {};
  const q = queryStr(req, 'q');
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    f.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const role = queryStr(req, 'role');
  if (role && (ROLES as readonly string[]).includes(role)) f.roles = role;
  const status = queryStr(req, 'status');
  if (status) f.status = status;
  const [docs, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(f)]);
  res.json(paginate(docs.map(toUserDTO), total, page, limit));
});
adminRouter.get('/users/:id', ...guard('admin:users_manage'), idParams, async (req, res) => {
  const u = await User.findById(param(req, 'id')).lean();
  if (!u) throw notFound('User');
  const [listings, enquiriesCount, activity] = await Promise.all([
    Property.countDocuments({ $or: [{ ownerId: u._id }, { agentId: u._id }] }),
    Enquiry.countDocuments({ customerId: u._id }),
    AuditLog.find({ $or: [{ actorId: u._id }, { entityType: 'User', entityId: String(u._id) }] }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  res.json({
    user: { ...toUserDTO(u), statusReason: u.statusReason },
    stats: { listings, enquiries: enquiriesCount },
    activity: activity.map((a) => ({ id: String(a._id), action: a.action, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt })),
  });
});
adminRouter.patch('/users/:id/status', ...guard('admin:users_manage'), idParams, validate({ body: userStatusSchema }), async (req, res) => {
  const id = param(req, 'id');
  if (id === req.user!.id) throw forbidden('You cannot change your own account status');
  const u = await User.findByIdAndUpdate(id, { $set: { status: req.body.status, statusReason: req.body.reason } }, { new: true }).lean();
  if (!u) throw notFound('User');
  if (req.body.status !== 'active') await revokeAllSessions(id);
  await audit(req, `user.${req.body.status}`, 'User', id, { reason: req.body.reason });
  res.json({ user: toUserDTO(u) });
});
adminRouter.patch('/users/:id/roles', ...guard('admin:roles_manage'), idParams, validate({ body: userRolesSchema }), async (req, res) => {
  const id = param(req, 'id');
  const roles = [...new Set(req.body.roles as string[])];
  if (id === req.user!.id && !roles.includes('admin')) throw forbidden('You cannot remove your own administrator role');
  if (!roles.includes('customer')) roles.push('customer');
  const before = await User.findById(id).select('roles name').lean();
  if (!before) throw notFound('User');
  const u = await User.findByIdAndUpdate(id, { $set: { roles } }, { new: true }).lean();
  if (roles.includes('agent')) await ensureAgentProfile(id, before.name);
  // Force re-login so new tokens carry the new roles.
  await revokeAllSessions(id);
  await audit(req, 'user.roles_changed', 'User', id, { from: before.roles, to: roles });
  res.json({ user: toUserDTO(u) });
});

/* ---------------- Agents ---------------- */
adminRouter.get('/agents', ...guard('admin:users_manage'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const f = { roles: 'agent' };
  const [agents, total] = await Promise.all([User.find(f).sort({ name: 1 }).skip(skip).limit(limit).lean(), User.countDocuments(f)]);
  const ids = agents.map((a) => a._id);
  const [profiles, listingCounts, leadCounts] = await Promise.all([
    AgentProfile.find({ userId: { $in: ids } }).lean(),
    Property.aggregate([{ $match: { agentId: { $in: ids }, status: 'published' } }, { $group: { _id: '$agentId', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $match: { assignedAgentId: { $in: ids }, status: { $nin: ['closed', 'invalid', 'converted'] } } }, { $group: { _id: '$assignedAgentId', count: { $sum: 1 } } }]),
  ]);
  const pm = new Map(profiles.map((p) => [String(p.userId), p]));
  const lc = new Map(listingCounts.map((r) => [String(r._id), r.count]));
  const oc = new Map(leadCounts.map((r) => [String(r._id), r.count]));
  res.json(
    paginate(
      agents.map((a) => {
        const p = pm.get(String(a._id));
        return { ...toUserDTO(a), slug: p?.slug, agencyName: p?.agencyName, cities: p?.cities ?? [], publicProfile: p?.publicProfile ?? false, activeListings: lc.get(String(a._id)) ?? 0, openLeads: oc.get(String(a._id)) ?? 0 };
      }),
      total,
      page,
      limit,
    ),
  );
});
adminRouter.post('/agents', ...guard('admin:users_manage'), validate({ body: agentCreateSchema }), async (req, res) => {
  const { name, email, phone, agencyName, reraAgentNumber, cities } = req.body;
  let user = await User.findOne({ email });
  let invited = false;
  if (user) {
    if (!user.roles.includes('agent')) user.roles.push('agent');
    await user.save();
    await revokeAllSessions(String(user._id));
  } else {
    if (await User.exists({ phone })) throw conflict('Another account already uses this phone number');
    user = await User.create({ name, email, phone, roles: ['agent', 'customer'], passwordHash: await hashPassword(randomToken(24)) });
    invited = true;
  }
  await ensureAgentProfile(user._id, user.name);
  await AgentProfile.updateOne({ userId: user._id }, { $set: { agencyName, reraAgentNumber, cities } });
  // New agents set their own password via the reset flow.
  if (invited) await forgotPassword(email);
  await audit(req, 'agent.created', 'User', String(user._id), { invited });
  res.status(201).json({ user: toUserDTO(user.toObject()), invited });
});
adminRouter.get('/agents/:id/performance', ...guard('admin:users_manage'), idParams, async (req, res) => res.json(await performanceFor(param(req, 'id'))));

/* ---------------- Leads & visits ---------------- */
adminRouter.get('/enquiries', ...guard('admin:leads_manage'), async (req, res) => res.json(await enquiries.listAll(listOpts(req))));
adminRouter.get('/enquiries/export', ...guard('admin:leads_export'), async (req, res) => {
  const csv = await enquiries.exportCsv(req, { ...listOpts(req), page: 1, limit: 10_000 });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sky-space-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${csv}`);
});
adminRouter.get('/site-visits', ...guard('admin:visits_manage'), async (req, res) => res.json(await visits.listAll(visitListOpts(req))));

/* ---------------- Categories ---------------- */
const catDTO = (c: any) => ({ id: String(c._id), name: c.name, slug: c.slug, category: c.category, active: c.active, order: c.order });
adminRouter.get('/categories', ...guard('admin:config_manage'), async (_req, res) => {
  res.json({ items: (await Category.find().sort({ category: 1, order: 1 }).lean()).map(catDTO) });
});
adminRouter.post('/categories', ...guard('admin:config_manage'), validate({ body: categorySchema }), async (req, res) => {
  const c = await Category.create(req.body);
  await audit(req, 'category.created', 'Category', String(c._id), { slug: c.slug });
  res.status(201).json({ category: catDTO(c) });
});
adminRouter.patch('/categories/:id', ...guard('admin:config_manage'), idParams, validate({ body: categorySchema.partial().omit({ slug: true }) }), async (req, res) => {
  const c = await Category.findByIdAndUpdate(param(req, 'id'), { $set: req.body }, { new: true }).lean();
  if (!c) throw notFound('Category');
  await audit(req, 'category.updated', 'Category', String(c._id), req.body);
  res.json({ category: catDTO(c) });
});
adminRouter.delete('/categories/:id', ...guard('admin:config_manage'), idParams, async (req, res) => {
  const c = await Category.findById(param(req, 'id'));
  if (!c) throw notFound('Category');
  if (await Property.exists({ propertyType: c.slug })) throw conflict('Category is used by listings. Deactivate it instead.');
  await c.deleteOne();
  await audit(req, 'category.deleted', 'Category', String(c._id), { slug: c.slug });
  res.status(204).end();
});

/* ---------------- Cities & localities ---------------- */
const withLocalitySlugs = (body: any) => ({ ...body, ...(body.localities && { localities: body.localities.map((l: any) => ({ ...l, slug: slugify(l.name) })) }) });
adminRouter.get('/cities', ...guard('admin:config_manage'), async (_req, res) => {
  res.json({ items: (await City.find().sort({ name: 1 }).limit(1000).lean()).map((c) => toCityDTO(c)) });
});
adminRouter.post('/cities', ...guard('admin:config_manage'), validate({ body: citySchema }), async (req, res) => {
  const c = await City.create({ ...withLocalitySlugs(req.body), slug: slugify(req.body.name) });
  await audit(req, 'city.created', 'City', String(c._id), { name: c.name });
  res.status(201).json({ city: toCityDTO(c) });
});
adminRouter.patch('/cities/:id', ...guard('admin:config_manage'), idParams, validate({ body: citySchema.partial() }), async (req, res) => {
  const c = await City.findByIdAndUpdate(param(req, 'id'), { $set: withLocalitySlugs(req.body) }, { new: true }).lean();
  if (!c) throw notFound('City');
  await audit(req, 'city.updated', 'City', String(c._id), { fields: Object.keys(req.body) });
  res.json({ city: toCityDTO(c) });
});
adminRouter.delete('/cities/:id', ...guard('admin:config_manage'), idParams, async (req, res) => {
  const c = await City.findById(param(req, 'id'));
  if (!c) throw notFound('City');
  if (await Property.exists({ citySlug: c.slug })) throw conflict('City has listings. Deactivate it instead.');
  await c.deleteOne();
  await audit(req, 'city.deleted', 'City', String(c._id), { name: c.name });
  res.status(204).end();
});

/* ---------------- Content & settings ---------------- */
adminRouter.get('/content', ...guard('admin:content_manage'), async (_req, res) => res.json(await getSiteConfig()));
adminRouter.put('/content', ...guard('admin:content_manage'), validate({ body: siteContentSchema }), async (req, res) => {
  await SiteConfig.updateOne({ key: 'main' }, { $set: req.body }, { upsert: true });
  await audit(req, 'content.updated', 'SiteConfig', 'main', { sections: Object.keys(req.body) });
  res.json(await getSiteConfig());
});
adminRouter.put('/settings', ...guard('admin:settings_manage'), validate({ body: platformSettingsSchema }), async (req, res) => {
  const set = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [`settings.${k}`, v]));
  await SiteConfig.updateOne({ key: 'main' }, { $set: set }, { upsert: true });
  await audit(req, 'settings.updated', 'SiteConfig', 'main', { fields: Object.keys(req.body) });
  res.json((await getSiteConfig()).settings);
});

/* ---------------- Reports / complaints ---------------- */
adminRouter.get('/reports', ...guard('admin:reports_manage'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const f: any = {};
  const status = queryStr(req, 'status');
  if (status) f.status = status;
  const [docs, total] = await Promise.all([
    Report.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('propertyId', 'propertyId title slug status').lean(),
    Report.countDocuments(f),
  ]);
  res.json(
    paginate(
      docs.map((r: any) => ({
        id: String(r._id),
        property: r.propertyId ? { id: String(r.propertyId._id), propertyId: r.propertyId.propertyId, title: r.propertyId.title, slug: r.propertyId.slug, status: r.propertyId.status } : undefined,
        reason: r.reason,
        details: r.details,
        email: r.email,
        status: r.status,
        resolution: r.resolution,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    ),
  );
});
adminRouter.patch('/reports/:id', ...guard('admin:reports_manage'), idParams, validate({ body: reportStatusSchema }), async (req, res) => {
  const done = ['resolved', 'dismissed'].includes(req.body.status);
  const r = await Report.findByIdAndUpdate(
    param(req, 'id'),
    { $set: { ...req.body, ...(done ? { resolvedBy: req.user!.id, resolvedAt: new Date() } : {}) } },
    { new: true },
  ).lean();
  if (!r) throw notFound('Report');
  await audit(req, `report.${req.body.status}`, 'Report', String(r._id), { resolution: req.body.resolution });
  res.json({ report: { id: String(r._id), status: r.status, resolution: r.resolution } });
});

/* ---------------- Audit logs ---------------- */
adminRouter.get('/audit-logs', ...guard('admin:audit_view'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const f: any = {};
  const entityType = queryStr(req, 'entityType');
  if (entityType) f.entityType = entityType;
  const action = queryStr(req, 'action');
  if (action) f.action = { $regex: `^${escapeRegex(action)}` };
  const actorId = queryStr(req, 'actorId');
  if (actorId && Types.ObjectId.isValid(actorId)) f.actorId = new Types.ObjectId(actorId);
  const [docs, total] = await Promise.all([
    AuditLog.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actorId', 'name email').lean(),
    AuditLog.countDocuments(f),
  ]);
  res.json(
    paginate(
      docs.map((a: any) => ({
        id: String(a._id),
        actor: a.actorId ? { id: String(a.actorId._id), name: a.actorId.name, email: a.actorId.email } : undefined,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: a.metadata,
        ip: a.ip,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
    ),
  );
});
