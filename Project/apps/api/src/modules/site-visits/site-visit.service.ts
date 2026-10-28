import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import {
  canTransitionVisit, canTransitionLead, istToUtc, istToday, RESCHEDULABLE_VISIT_STATUSES, VISIT_MAX_DAYS_AHEAD, VISIT_STATUS_LABELS,
  type SiteVisitDTO, type VisitActor, type VisitStatus,
} from '@skyspace/shared';
import { Enquiry, SiteVisit } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { AppError, badRequest, conflict, notFound } from '../../utils/errors';
import { paginate, toIso } from '../../utils/http';
import { isAdmin } from '../../middleware/auth';
import { notify } from '../../services/notify';

type User = Express.AuthUser;
/* eslint-disable @typescript-eslint/no-explicit-any */

const MIN_LEAD_TIME_MS = 2 * 3_600_000;
const POPULATE = [
  { path: 'propertyId', select: 'propertyId title slug city locality' },
  { path: 'assignedAgentId', select: 'name' },
  { path: 'notes.by', select: 'name' },
];

export function toVisitDTO(v: any): SiteVisitDTO {
  const p = v.propertyId ?? {};
  const a = v.assignedAgentId && typeof v.assignedAgentId === 'object' && 'name' in v.assignedAgentId ? v.assignedAgentId : undefined;
  return {
    id: String(v._id),
    property: { id: String(p._id ?? p), propertyId: p.propertyId, title: p.title, slug: p.slug, city: p.city, locality: p.locality },
    customerId: v.customerId ? String(v.customerId) : undefined,
    assignedAgent: a ? { id: String(a._id), name: a.name } : undefined,
    name: v.name,
    phone: v.phone,
    email: v.email,
    message: v.message ?? undefined,
    scheduledAt: toIso(v.scheduledAt)!,
    date: v.date,
    timeSlot: v.timeSlot,
    status: v.status,
    confirmedAt: toIso(v.confirmedAt),
    notes: (v.notes ?? []).map((n: any) => ({ note: n.note, by: n.by?.name ? { id: String(n.by._id), name: n.by.name } : undefined, createdAt: toIso(n.createdAt)! })),
    createdAt: toIso(v.createdAt)!,
    updatedAt: toIso(v.updatedAt)!,
  };
}

/** Validate an IST date + slot. Appointments are stored as UTC instants; date/timeSlot keep the IST wall-clock values. */
export function validateSlot(date: string, timeSlot: string, now = new Date()) {
  const scheduledAt = istToUtc(date, timeSlot);
  if (isNaN(scheduledAt.getTime())) throw badRequest('Invalid date');
  if (scheduledAt.getTime() < now.getTime() + MIN_LEAD_TIME_MS) throw badRequest('Choose a time at least 2 hours from now');
  const max = istToUtc(istToday(new Date(now.getTime() + VISIT_MAX_DAYS_AHEAD * 86_400_000)), '23:59');
  if (scheduledAt > max) throw badRequest(`Visits can be booked up to ${VISIT_MAX_DAYS_AHEAD} days ahead`);
  return scheduledAt;
}

function actorFor(user: User, v: any): VisitActor | null {
  if (isAdmin(user)) return 'manager';
  if (v.assignedAgentId && String(v.assignedAgentId._id ?? v.assignedAgentId) === user.id) return 'manager';
  if (v.ownerId && String(v.ownerId) === user.id) return 'manager';
  if (v.customerId && String(v.customerId) === user.id) return 'customer';
  return null;
}

export async function create(req: Request, input: any) {
  const property = await Property.findOne({ _id: input.propertyId, status: 'published' }).select('_id ownerId agentId propertyId title').lean();
  if (!property) throw notFound('Property');
  const scheduledAt = validateSlot(input.date, input.timeSlot);
  const active = await SiteVisit.findOne({
    propertyId: property._id,
    phone: input.phone,
    status: { $in: ['pending_confirmation', 'confirmed', 'rescheduled'] },
    scheduledAt: { $gte: new Date() },
  }).select('_id').lean();
  if (active) throw conflict('You already have an upcoming visit request for this property');
  const taken = await SiteVisit.exists({ propertySlotLock: `${property._id}:${scheduledAt.toISOString()}` });
  if (taken) throw conflict('This slot is already booked. Please choose another time.');

  const v = await SiteVisit.create({
    propertyId: property._id,
    ownerId: property.ownerId,
    assignedAgentId: property.agentId,
    customerId: req.user?.id,
    name: input.name,
    phone: input.phone,
    email: input.email,
    message: input.message,
    scheduledAt,
    date: input.date,
    timeSlot: input.timeSlot,
    status: 'pending_confirmation',
    history: [{ to: 'pending_confirmation', by: req.user?.id }],
  });
  await Property.updateOne({ _id: property._id }, { $inc: { 'stats.visits': 1 } });
  await notify({
    userId: property.agentId ?? property.ownerId,
    type: 'visit_requested',
    title: `Site visit requested — ${property.propertyId}`,
    message: `${input.name} requested a visit on ${input.date} at ${input.timeSlot} IST. Please confirm or reschedule.`,
    link: property.agentId ? '/agent/site-visits' : '/owner/site-visits',
    email: true,
  });
  return toVisitDTO(await v.populate(POPULATE));
}

async function load(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Site visit');
  const v = await SiteVisit.findById(id);
  if (!v) throw notFound('Site visit');
  return v;
}

const lockKeys = (v: any) => ({
  propertySlotLock: `${v.propertyId}:${v.scheduledAt.toISOString()}`,
  agentSlotLock: v.assignedAgentId ? `${v.assignedAgentId}:${v.scheduledAt.toISOString()}` : undefined,
});

export async function updateStatus(req: Request, id: string, to: VisitStatus, note?: string) {
  const user = req.user!;
  const v = await load(id);
  const actor = actorFor(user, v);
  if (!actor) throw notFound('Site visit');
  const from = v.status as VisitStatus;
  if (!canTransitionVisit(from, to, actor)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot change a ${VISIT_STATUS_LABELS[from]} visit to ${VISIT_STATUS_LABELS[to]}`);
  }
  // A rescheduled visit must be accepted by the party that did not propose the new time.
  if (from === 'rescheduled' && to === 'confirmed' && v.rescheduledBy === actor) {
    throw new AppError(409, 'INVALID_TRANSITION', 'The other party must confirm the new time');
  }
  if (to === 'confirmed' && v.scheduledAt < new Date()) throw badRequest('This visit time has already passed. Reschedule instead.');
  if (['completed', 'no_show'].includes(to) && v.scheduledAt > new Date()) throw badRequest('A visit can only be marked completed or no-show after its scheduled time');

  v.status = to;
  v.history.push({ from, to, by: new Types.ObjectId(user.id), at: new Date() });
  if (note) v.notes.push({ note, by: new Types.ObjectId(user.id), createdAt: new Date() });
  if (to === 'confirmed') {
    v.confirmedAt = new Date();
    Object.assign(v, lockKeys(v));
  } else if (to !== 'completed') {
    v.propertySlotLock = undefined;
    v.agentSlotLock = undefined;
  }
  try {
    await v.save();
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict('Another visit is already confirmed for this time slot');
    throw e;
  }

  if (to === 'confirmed') {
    const lead = await Enquiry.findOne({ propertyId: v.propertyId, phone: v.phone }).sort({ createdAt: -1 });
    if (lead && canTransitionLead(lead.status as never, 'site_visit_scheduled')) {
      lead.history.push({ from: lead.status, to: 'site_visit_scheduled', by: new Types.ObjectId(user.id), at: new Date() });
      lead.status = 'site_visit_scheduled';
      await lead.save();
    }
  }
  const notifyUser = actor === 'manager' ? v.customerId : v.assignedAgentId ?? v.ownerId;
  await notify({
    userId: notifyUser,
    type: 'visit_update',
    title: `Site visit ${VISIT_STATUS_LABELS[to].toLowerCase()}`,
    message: `Visit on ${v.date} at ${v.timeSlot} IST is now ${VISIT_STATUS_LABELS[to]}.${note ? ` Note: ${note}` : ''}`,
    link: actor === 'manager' ? '/customer/site-visits' : '/owner/site-visits',
    email: ['confirmed', 'rejected', 'cancelled'].includes(to),
  });
  return toVisitDTO(await v.populate(POPULATE));
}

export async function reschedule(req: Request, id: string, input: { date: string; timeSlot: string; note?: string }) {
  const user = req.user!;
  const v = await load(id);
  const actor = actorFor(user, v);
  if (!actor) throw notFound('Site visit');
  if (!RESCHEDULABLE_VISIT_STATUSES.includes(v.status as VisitStatus)) throw new AppError(409, 'INVALID_TRANSITION', 'This visit can no longer be rescheduled');
  const scheduledAt = validateSlot(input.date, input.timeSlot);
  if (await SiteVisit.exists({ propertySlotLock: `${v.propertyId}:${scheduledAt.toISOString()}`, _id: { $ne: v._id } })) {
    throw conflict('This slot is already booked. Please choose another time.');
  }
  const from = v.status;
  Object.assign(v, { scheduledAt, date: input.date, timeSlot: input.timeSlot, status: 'rescheduled', rescheduledBy: actor, propertySlotLock: undefined, agentSlotLock: undefined, confirmedAt: undefined });
  v.history.push({ from, to: 'rescheduled', by: new Types.ObjectId(user.id), at: new Date() });
  if (input.note) v.notes.push({ note: input.note, by: new Types.ObjectId(user.id), createdAt: new Date() });
  await v.save();
  await notify({
    userId: actor === 'manager' ? v.customerId : v.assignedAgentId ?? v.ownerId,
    type: 'visit_update',
    title: 'Site visit rescheduled',
    message: `New proposed time: ${input.date} at ${input.timeSlot} IST. Please confirm.`,
    link: actor === 'manager' ? '/customer/site-visits' : '/owner/site-visits',
    email: true,
  });
  return toVisitDTO(await v.populate(POPULATE));
}

interface ListOpts {
  status?: string;
  upcoming?: boolean;
  page: number;
  limit: number;
}
async function list(filter: FilterQuery<any>, o: ListOpts) {
  if (o.status) filter.status = o.status;
  if (o.upcoming) filter.scheduledAt = { $gte: new Date() };
  const [docs, total] = await Promise.all([
    SiteVisit.find(filter).sort({ scheduledAt: o.upcoming ? 1 : -1 }).skip((o.page - 1) * o.limit).limit(o.limit).populate(POPULATE).lean(),
    SiteVisit.countDocuments(filter),
  ]);
  return paginate(docs.map(toVisitDTO), total, o.page, o.limit);
}

export const listForCustomer = (user: User, o: ListOpts) => list({ customerId: new Types.ObjectId(user.id) }, o);
export const listForManager = (user: User, o: ListOpts) => {
  const uid = new Types.ObjectId(user.id);
  return list({ $or: [{ assignedAgentId: uid }, { ownerId: uid }] }, o);
};
export const listAll = (o: ListOpts) => list({}, o);
