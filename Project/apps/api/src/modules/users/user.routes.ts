import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { changePasswordSchema, objectId, savedSearchSchema, savedSearchUpdateSchema, updateProfileSchema } from '@skyspace/shared';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { User } from '../../models/user.model';
import { Notification, SavedSearch, Shortlist } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { conflict, notFound } from '../../utils/errors';
import { clearAuthCookies } from '../../utils/cookies';
import { pageParams, paginate, param } from '../../utils/http';
import { audit } from '../../services/audit';
import { changePassword, revokeAllSessions } from '../auth/auth.service';
import { SUMMARY_PROJECTION, toSummary } from '../properties/property.mapper';
import * as enquiries from '../enquiries/enquiry.service';
import * as visits from '../site-visits/site-visit.service';
import { listOpts } from '../enquiries/enquiry.routes';
import { visitListOpts } from '../site-visits/site-visit.routes';
import { toUserDTO } from './user.mapper';

export const meRouter = Router();
meRouter.use(requireAuth);

/* ----- profile & account ----- */
meRouter.get('/', async (req, res) => {
  const u = await User.findById(req.user!.id).lean();
  if (!u) throw notFound('User');
  res.json({ user: toUserDTO(u) });
});
meRouter.patch('/', validate({ body: updateProfileSchema }), async (req, res) => {
  if (req.body.phone) {
    const clash = await User.exists({ phone: req.body.phone, _id: { $ne: req.user!.id } });
    if (clash) throw conflict('This phone number is linked to another account');
  }
  const current = await User.findById(req.user!.id).select('phone').lean();
  const update = { ...req.body, ...(req.body.phone && req.body.phone !== current?.phone ? { phoneVerified: false } : {}) };
  const u = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true }).lean();
  res.json({ user: toUserDTO(u) });
});
meRouter.post('/password', validate({ body: changePasswordSchema }), async (req, res) => {
  await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  clearAuthCookies(res);
  res.json({ message: 'Password changed. Please sign in again.' });
});
meRouter.post('/logout-all', async (req, res) => {
  await revokeAllSessions(req.user!.id);
  clearAuthCookies(res);
  res.status(204).end();
});
meRouter.post('/deactivate', async (req, res) => {
  await User.updateOne({ _id: req.user!.id }, { $set: { status: 'deactivated', statusReason: 'Self-deactivated' } });
  await revokeAllSessions(req.user!.id);
  await audit(req, 'user.self_deactivated', 'User', req.user!.id);
  clearAuthCookies(res);
  res.status(204).end();
});

/* ----- shortlist ----- */
meRouter.get('/shortlist', requirePermission('shortlist:manage_own'), async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const [rows, total] = await Promise.all([
    Shortlist.find({ userId: req.user!.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Shortlist.countDocuments({ userId: req.user!.id }),
  ]);
  const props = await Property.find({ _id: { $in: rows.map((r) => r.propertyId) } }).select(SUMMARY_PROJECTION).lean();
  const byId = new Map(props.map((p) => [String(p._id), p]));
  // Listings that are no longer public are still shown (with their status) so users understand why they disappeared.
  const items = rows.map((r) => byId.get(String(r.propertyId))).filter(Boolean).map((p) => toSummary(p));
  res.json(paginate(items, total, page, limit));
});
meRouter.get('/shortlist/ids', async (req, res) => {
  const rows = await Shortlist.find({ userId: req.user!.id }).select('propertyId').limit(1000).lean();
  res.json({ ids: rows.map((r) => String(r.propertyId)) });
});
meRouter.post('/shortlist/:propertyId', validate({ params: z.object({ propertyId: objectId }) }), async (req, res) => {
  const pid = param(req, 'propertyId');
  const exists = await Property.exists({ _id: pid, status: 'published' });
  if (!exists) throw notFound('Property');
  const r = await Shortlist.updateOne({ userId: req.user!.id, propertyId: pid }, { $setOnInsert: { userId: req.user!.id, propertyId: pid } }, { upsert: true });
  if (r.upsertedCount) await Property.updateOne({ _id: pid }, { $inc: { 'stats.shortlists': 1 } });
  res.status(r.upsertedCount ? 201 : 200).json({ shortlisted: true });
});
meRouter.delete('/shortlist/:propertyId', validate({ params: z.object({ propertyId: objectId }) }), async (req, res) => {
  const pid = param(req, 'propertyId');
  const r = await Shortlist.deleteOne({ userId: req.user!.id, propertyId: pid });
  if (r.deletedCount) await Property.updateOne({ _id: pid, 'stats.shortlists': { $gt: 0 } }, { $inc: { 'stats.shortlists': -1 } });
  res.json({ shortlisted: false });
});

/* ----- saved searches ----- */
const ssDTO = (s: { _id: unknown; name: string; filters: unknown; notificationEnabled: boolean; createdAt: Date; updatedAt: Date }) => ({
  id: String(s._id),
  name: s.name,
  filters: s.filters,
  notificationEnabled: s.notificationEnabled,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});
meRouter.get('/saved-searches', async (req, res) => {
  const rows = await SavedSearch.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items: rows.map(ssDTO) });
});
meRouter.post('/saved-searches', validate({ body: savedSearchSchema }), async (req, res) => {
  if ((await SavedSearch.countDocuments({ userId: req.user!.id })) >= 50) throw conflict('You can save up to 50 searches');
  const s = await SavedSearch.create({ ...req.body, userId: req.user!.id });
  res.status(201).json({ savedSearch: ssDTO(s) });
});
const ssParams = validate({ params: z.object({ id: objectId }) });
meRouter.patch('/saved-searches/:id', ssParams, validate({ body: savedSearchUpdateSchema }), async (req, res) => {
  const s = await SavedSearch.findOneAndUpdate({ _id: param(req, 'id'), userId: req.user!.id }, { $set: req.body }, { new: true }).lean();
  if (!s) throw notFound('Saved search');
  res.json({ savedSearch: ssDTO(s) });
});
meRouter.delete('/saved-searches/:id', ssParams, async (req, res) => {
  const r = await SavedSearch.deleteOne({ _id: param(req, 'id'), userId: req.user!.id });
  if (!r.deletedCount) throw notFound('Saved search');
  res.status(204).end();
});

/* ----- enquiries & visits made by me ----- */
meRouter.get('/enquiries', async (req, res) => res.json(await enquiries.listForCustomer(req.user!, listOpts(req))));
meRouter.get('/site-visits', async (req, res) => res.json(await visits.listForCustomer(req.user!, visitListOpts(req))));

/* ----- notifications ----- */
meRouter.get('/notifications', async (req: Request, res: Response) => {
  const { page, limit, skip } = pageParams(req);
  const filter = { userId: req.user!.id, ...(req.query.unread === 'true' ? { readAt: { $exists: false } } : {}) };
  const [rows, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user!.id, readAt: { $exists: false } }),
  ]);
  const items = rows.map((n) => ({
    id: String(n._id),
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link ?? undefined,
    readAt: n.readAt?.toISOString(),
    createdAt: (n.createdAt as Date).toISOString(),
  }));
  res.json({ ...paginate(items, total, page, limit), unread });
});
meRouter.post('/notifications/:id/read', validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  await Notification.updateOne({ _id: param(req, 'id'), userId: req.user!.id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.status(204).end();
});
meRouter.post('/notifications/read-all', async (req, res) => {
  await Notification.updateMany({ userId: req.user!.id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.status(204).end();
});
