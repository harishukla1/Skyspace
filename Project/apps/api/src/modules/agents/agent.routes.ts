import { Router } from 'express';
import { Types } from 'mongoose';
import { agentProfileSchema, slugify, type AgentPublicDTO } from '@skyspace/shared';
import { guard } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AgentProfile, Enquiry, SiteVisit } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { User } from '../../models/user.model';
import { notFound } from '../../utils/errors';
import { escapeRegex, pageParams, paginate, param, queryStr } from '../../utils/http';
import { SUMMARY_PROJECTION, toSummary } from '../properties/property.mapper';
import * as enquiries from '../enquiries/enquiry.service';
import * as visits from '../site-visits/site-visit.service';
import { listOpts } from '../enquiries/enquiry.routes';
import { visitListOpts } from '../site-visits/site-visit.routes';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function toAgentDTO(profile: any, user: any): Promise<AgentPublicDTO> {
  const activeListings = await Property.countDocuments({ agentId: user._id, status: 'published' });
  return {
    id: String(user._id),
    slug: profile.slug,
    name: user.name,
    agencyName: profile.agencyName ?? undefined,
    bio: profile.bio ?? undefined,
    reraAgentNumber: profile.reraAgentNumber ?? undefined,
    experienceYears: profile.experienceYears ?? undefined,
    cities: profile.cities ?? [],
    specialisations: profile.specialisations ?? [],
    languages: profile.languages ?? [],
    profileImage: user.profileImage ?? undefined,
    activeListings,
  };
}

export async function ensureAgentProfile(userId: string | Types.ObjectId, name: string) {
  const existing = await AgentProfile.findOne({ userId }).lean();
  if (existing) return existing;
  const slug = `${slugify(name)}-${String(userId).slice(-5)}`;
  return (await AgentProfile.create({ userId, slug })).toObject();
}

/* ----- public agent directory ----- */
export const agentsPublicRouter = Router();
agentsPublicRouter.get('/', async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const city = queryStr(req, 'city');
  const activeAgents = await User.find({ roles: 'agent', status: 'active' }).select('_id').lean();
  const filter: any = { publicProfile: true, userId: { $in: activeAgents.map((a) => a._id) } };
  if (city) filter.cities = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
  const [profiles, total] = await Promise.all([AgentProfile.find(filter).sort({ experienceYears: -1, _id: 1 }).skip(skip).limit(limit).lean(), AgentProfile.countDocuments(filter)]);
  const users = await User.find({ _id: { $in: profiles.map((p) => p.userId) } }).select('name profileImage').lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const items = await Promise.all(profiles.filter((p) => byId.has(String(p.userId))).map((p) => toAgentDTO(p, byId.get(String(p.userId)))));
  res.json(paginate(items, total, page, limit));
});
agentsPublicRouter.get('/:slug', async (req, res) => {
  const profile = await AgentProfile.findOne({ slug: param(req, 'slug'), publicProfile: true }).lean();
  const user = profile && (await User.findOne({ _id: profile.userId, status: 'active', roles: 'agent' }).select('name profileImage').lean());
  if (!profile || !user) throw notFound('Agent');
  const listings = await Property.find({ agentId: user._id, status: 'published' }).select(SUMMARY_PROJECTION).sort({ publishedAt: -1 }).limit(12).lean();
  res.json({ agent: await toAgentDTO(profile, user), listings: listings.map(toSummary) });
});

/* ----- agent workspace ----- */
export const agentRouter = Router();
agentRouter.get('/enquiries', ...guard('lead:manage_assigned'), async (req, res) => res.json(await enquiries.listForAgent(req.user!, listOpts(req))));
agentRouter.get('/site-visits', ...guard('visit:manage_for_own_listings'), async (req, res) => res.json(await visits.listForManager(req.user!, visitListOpts(req))));
agentRouter.get('/profile', ...guard('agent:profile_manage'), async (req, res) => {
  const profile = await ensureAgentProfile(req.user!.id, req.user!.name);
  res.json({ profile: { ...profile, id: String(profile._id), userId: String(profile.userId) } });
});
agentRouter.patch('/profile', ...guard('agent:profile_manage'), validate({ body: agentProfileSchema }), async (req, res) => {
  await ensureAgentProfile(req.user!.id, req.user!.name);
  const profile = await AgentProfile.findOneAndUpdate({ userId: req.user!.id }, { $set: req.body }, { new: true }).lean();
  res.json({ profile: { ...profile, id: String(profile!._id), userId: String(profile!.userId) } });
});

/** Listing performance for owners and agents, computed from live records. */
export async function performanceFor(userId: string) {
  const uid = new Types.ObjectId(userId);
  const scope = { $or: [{ ownerId: uid }, { agentId: uid }] };
  const [byStatus, totals, leadsByStatus, upcomingVisits, top] = await Promise.all([
    Property.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Property.aggregate([
      { $match: scope },
      { $group: { _id: null, views: { $sum: '$stats.views' }, enquiries: { $sum: '$stats.enquiries' }, shortlists: { $sum: '$stats.shortlists' }, visits: { $sum: '$stats.visits' } } },
    ]),
    Enquiry.aggregate([{ $match: { $or: [{ assignedAgentId: uid }, { ownerId: uid }] } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    SiteVisit.countDocuments({ $or: [{ assignedAgentId: uid }, { ownerId: uid }], status: { $in: ['confirmed', 'pending_confirmation', 'rescheduled'] }, scheduledAt: { $gte: new Date() } }),
    Property.find({ ...scope, status: 'published' }).select('propertyId title slug stats').sort({ 'stats.enquiries': -1, 'stats.views': -1 }).limit(10).lean(),
  ]);
  const t = totals[0] ?? { views: 0, enquiries: 0, shortlists: 0, visits: 0 };
  const leadTotal = leadsByStatus.reduce((s, r) => s + r.count, 0);
  const converted = leadsByStatus.find((r) => r._id === 'converted')?.count ?? 0;
  return {
    listingsByStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
    totals: { views: t.views, enquiries: t.enquiries, shortlists: t.shortlists, visitRequests: t.visits },
    leadsByStatus: Object.fromEntries(leadsByStatus.map((r) => [r._id, r.count])),
    conversionRate: leadTotal >= 5 ? Math.round((converted / leadTotal) * 1000) / 10 : null,
    upcomingVisits,
    topListings: top.map((p) => ({ id: String(p._id), propertyId: p.propertyId, title: p.title, slug: p.slug, stats: p.stats })),
  };
}
agentRouter.get('/reports', ...guard('property:view_own'), async (req, res) => res.json(await performanceFor(req.user!.id)));

/* ----- owner workspace: enquiries & visits on my listings ----- */
export const ownerWorkspaceRouter = Router();
ownerWorkspaceRouter.get('/enquiries', ...guard('enquiry:view_for_own_listings'), async (req, res) => res.json(await enquiries.listForOwner(req.user!, listOpts(req))));
ownerWorkspaceRouter.get('/site-visits', ...guard('visit:manage_for_own_listings'), async (req, res) => res.json(await visits.listForManager(req.user!, visitListOpts(req))));
ownerWorkspaceRouter.get('/reports', ...guard('property:view_own'), async (req, res) => res.json(await performanceFor(req.user!.id)));
