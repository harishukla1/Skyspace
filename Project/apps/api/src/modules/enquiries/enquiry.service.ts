import type { Request } from 'express';
import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { canTransitionLead, LEAD_STATUS_LABELS, type EnquiryDTO, type LeadStatus } from '@skyspace/shared';
import { Enquiry, AgentProfile } from '../../models/misc.models';
import { Property } from '../../models/property.model';
import { User } from '../../models/user.model';
import { AppError, badRequest, conflict, notFound } from '../../utils/errors';
import { escapeRegex, paginate, toIso } from '../../utils/http';
import { isAdmin } from '../../middleware/auth';
import { notify } from '../../services/notify';
import { audit } from '../../services/audit';
import { getSiteConfig } from '../../services/site-config';

type User = Express.AuthUser;
/* eslint-disable @typescript-eslint/no-explicit-any */

const POPULATE = [
  { path: 'propertyId', select: 'propertyId title slug city' },
  { path: 'assignedAgentId', select: 'name' },
  { path: 'notes.by', select: 'name' },
];

export function toEnquiryDTO(e: any): EnquiryDTO {
  const p = e.propertyId && typeof e.propertyId === 'object' && 'title' in e.propertyId ? e.propertyId : undefined;
  const a = e.assignedAgentId && typeof e.assignedAgentId === 'object' && 'name' in e.assignedAgentId ? e.assignedAgentId : undefined;
  return {
    id: String(e._id),
    property: p ? { id: String(p._id), propertyId: p.propertyId, title: p.title, slug: p.slug, city: p.city } : undefined,
    customerId: e.customerId ? String(e.customerId) : undefined,
    assignedAgent: a ? { id: String(a._id), name: a.name } : undefined,
    name: e.name,
    email: e.email,
    phone: e.phone,
    preferredContact: e.preferredContact,
    message: e.message,
    enquiryType: e.enquiryType,
    source: e.source,
    status: e.status,
    followUpAt: toIso(e.followUpAt),
    notes: (e.notes ?? []).map((n: any) => ({
      note: n.note,
      by: n.by && typeof n.by === 'object' && 'name' in n.by ? { id: String(n.by._id), name: n.by.name } : undefined,
      createdAt: toIso(n.createdAt)!,
    })),
    history: (e.history ?? []).map((h: any) => ({ from: h.from ?? undefined, to: h.to, by: h.by ? String(h.by) : undefined, at: toIso(h.at)! })),
    createdAt: toIso(e.createdAt)!,
    updatedAt: toIso(e.updatedAt)!,
  };
}

/** Customer's own view: internal notes and history are never exposed to the enquirer. */
const toCustomerDTO = (e: any) => ({ ...toEnquiryDTO(e), notes: [], history: [], assignedAgent: undefined });

export function canManageLead(user: User, e: { assignedAgentId?: unknown; ownerId?: unknown }) {
  if (isAdmin(user)) return true;
  if (e.assignedAgentId && String(e.assignedAgentId) === user.id) return true;
  return !e.assignedAgentId && !!e.ownerId && String(e.ownerId) === user.id;
}
const canViewLead = (user: User, e: any) => canManageLead(user, e) || String(e.ownerId) === user.id;

export async function create(req: Request, input: any) {
  const { website: _hp, consent: _c, agentId, propertyId, ...data } = input;
  let property: any;
  let assignedAgentId: Types.ObjectId | undefined;
  if (propertyId) {
    property = await Property.findOne({ _id: propertyId, status: 'published' }).select('_id ownerId agentId propertyId title').lean();
    if (!property) throw notFound('Property');
    assignedAgentId = property.agentId ?? undefined;
  } else if (agentId) {
    const profile = await AgentProfile.findOne({ userId: agentId, publicProfile: true }).select('userId').lean();
    if (!profile) throw notFound('Agent');
    assignedAgentId = profile.userId as Types.ObjectId;
  }

  const { settings } = await getSiteConfig();
  const since = new Date(Date.now() - settings.enquiryDuplicateWindowHours * 3_600_000);
  const dup = await Enquiry.findOne({ propertyId: property?._id ?? null, phone: data.phone, createdAt: { $gte: since } }).select('_id').lean();
  if (dup) throw conflict('We already have your enquiry for this property. Our team will contact you shortly.');

  const e = await Enquiry.create({
    ...data,
    propertyId: property?._id,
    ownerId: property?.ownerId,
    assignedAgentId,
    customerId: req.user?.id,
    consentAt: new Date(),
    history: [{ to: 'new', by: req.user?.id }],
  });
  if (property) await Property.updateOne({ _id: property._id }, { $inc: { 'stats.enquiries': 1 } });
  const recipient = assignedAgentId ?? property?.ownerId;
  if (recipient) {
    await notify({
      userId: recipient,
      type: 'enquiry_received',
      title: property ? `New enquiry for ${property.propertyId}` : 'New enquiry',
      message: `${data.name} sent an enquiry${property ? ` about "${property.title}"` : ''}.`,
      link: assignedAgentId ? `/agent/leads/${e._id}` : `/owner/enquiries/${e._id}`,
      email: true,
    });
  }
  return { id: String(e._id), status: e.status };
}

interface ListOpts {
  status?: string;
  q?: string;
  propertyId?: string;
  agentId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

function applyListFilters(f: FilterQuery<any>, o: ListOpts) {
  if (o.status) f.status = o.status;
  if (o.propertyId && Types.ObjectId.isValid(o.propertyId)) f.propertyId = new Types.ObjectId(o.propertyId);
  if (o.agentId === 'unassigned') f.assignedAgentId = { $exists: false };
  else if (o.agentId && Types.ObjectId.isValid(o.agentId)) f.assignedAgentId = new Types.ObjectId(o.agentId);
  if (o.from || o.to) f.createdAt = { ...(o.from && { $gte: o.from }), ...(o.to && { $lte: o.to }) };
  if (o.q) {
    const rx = { $regex: escapeRegex(o.q), $options: 'i' };
    f.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  return f;
}

async function list(filter: FilterQuery<any>, o: ListOpts, mapper = toEnquiryDTO) {
  const [docs, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip((o.page - 1) * o.limit).limit(o.limit).populate(POPULATE).lean(),
    Enquiry.countDocuments(filter),
  ]);
  return paginate(docs.map(mapper), total, o.page, o.limit);
}

export const listForCustomer = (user: User, o: ListOpts) => list({ customerId: user.id }, o, toCustomerDTO);
export const listForAgent = (user: User, o: ListOpts) => list(applyListFilters({ assignedAgentId: new Types.ObjectId(user.id) }, { ...o, agentId: undefined }), o);
export const listForOwner = (user: User, o: ListOpts) => list(applyListFilters({ ownerId: new Types.ObjectId(user.id) }, o), o);
export const listAll = (o: ListOpts) => list(applyListFilters({}, o), o);

async function load(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Enquiry');
  const e = await Enquiry.findById(id);
  if (!e) throw notFound('Enquiry');
  return e;
}

export async function get(user: User, id: string) {
  const e = await load(id);
  if (canViewLead(user, e)) return toEnquiryDTO(await e.populate(POPULATE));
  if (e.customerId && String(e.customerId) === user.id) return toCustomerDTO(await e.populate(POPULATE));
  throw notFound('Enquiry');
}

export async function updateStatus(req: Request, id: string, input: { status: LeadStatus; note?: string; followUpAt?: string }) {
  const user = req.user!;
  const e = await load(id);
  if (!canManageLead(user, e)) throw notFound('Enquiry');
  const from = e.status as LeadStatus;
  if (from !== input.status) {
    if (!canTransitionLead(from, input.status)) {
      throw new AppError(409, 'INVALID_TRANSITION', `Cannot move a lead from ${LEAD_STATUS_LABELS[from]} to ${LEAD_STATUS_LABELS[input.status]}`);
    }
    e.status = input.status;
    e.history.push({ from, to: input.status, by: new Types.ObjectId(user.id), at: new Date() });
  }
  if (input.status === 'follow_up_required' && !input.followUpAt && !e.followUpAt) throw badRequest('Set a follow-up date');
  if (input.followUpAt) e.followUpAt = new Date(input.followUpAt);
  if (['converted', 'closed', 'invalid'].includes(input.status)) e.followUpAt = undefined;
  if (input.note) e.notes.push({ note: input.note, by: new Types.ObjectId(user.id), createdAt: new Date() });
  await e.save();
  if (e.customerId && from !== input.status && ['contacted', 'site_visit_scheduled', 'closed'].includes(input.status)) {
    await notify({ userId: e.customerId, type: 'enquiry_update', title: 'Update on your enquiry', message: `Your enquiry status is now: ${LEAD_STATUS_LABELS[input.status]}.`, link: '/customer/enquiries' });
  }
  return toEnquiryDTO(await e.populate(POPULATE));
}

export async function addNote(req: Request, id: string, input: { note: string; followUpAt?: string }) {
  const e = await load(id);
  if (!canManageLead(req.user!, e)) throw notFound('Enquiry');
  e.notes.push({ note: input.note, by: new Types.ObjectId(req.user!.id), createdAt: new Date() });
  if (input.followUpAt) e.followUpAt = new Date(input.followUpAt);
  await e.save();
  return toEnquiryDTO(await e.populate(POPULATE));
}

export async function assign(req: Request, id: string, agentId: string | null) {
  const e = await load(id);
  if (agentId) {
    const agent = await User.findOne({ _id: agentId, roles: 'agent', status: 'active' }).select('_id name').lean();
    if (!agent) throw badRequest('Select an active agent');
    e.set('assignedAgentId', agent._id);
  } else {
    e.set('assignedAgentId', undefined);
  }
  e.history.push({ from: e.status, to: e.status, by: new Types.ObjectId(req.user!.id), at: new Date() });
  await e.save();
  await audit(req, 'lead.assigned', 'Enquiry', id, { agentId });
  if (agentId) await notify({ userId: agentId, type: 'lead_assigned', title: 'New lead assigned to you', message: `${e.name} — ${e.enquiryType}`, link: `/agent/leads/${id}`, email: true });
  return toEnquiryDTO(await e.populate(POPULATE));
}

const csvCell = (v: unknown) => {
  let s = v === undefined || v === null ? '' : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function exportCsv(req: Request, o: ListOpts) {
  const filter = applyListFilters({}, o);
  const docs = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(10_000).populate(POPULATE).lean();
  await audit(req, 'lead.exported', 'Enquiry', undefined, { count: docs.length, status: o.status });
  const header = ['Enquiry ID', 'Created (UTC)', 'Status', 'Name', 'Email', 'Phone', 'Preferred contact', 'Type', 'Source', 'Property ID', 'Property', 'Assigned agent', 'Follow-up'];
  const rows = docs.map((d) => {
    const e = toEnquiryDTO(d);
    return [e.id, e.createdAt, e.status, e.name, e.email, e.phone, e.preferredContact, e.enquiryType, e.source, e.property?.propertyId, e.property?.title, e.assignedAgent?.name, e.followUpAt];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/** Retention: anonymise contact details on closed/invalid leads older than `months`. Run from scripts/retention. */
export async function anonymiseOldLeads(months = 24) {
  const cutoff = new Date(Date.now() - months * 30 * 86_400_000);
  const r = await Enquiry.updateMany(
    { status: { $in: ['closed', 'invalid', 'converted'] }, updatedAt: { $lt: cutoff }, anonymisedAt: { $exists: false } },
    { $set: { name: 'Anonymised', email: 'anonymised@invalid', phone: '+910000000000', message: '[removed]', anonymisedAt: new Date() } },
  );
  return r.modifiedCount;
}
