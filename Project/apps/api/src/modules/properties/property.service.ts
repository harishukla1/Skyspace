import crypto from 'node:crypto';
import type { Request } from 'express';
import { Types } from 'mongoose';
import {
  MATERIAL_LISTING_FIELDS, MAX_IMAGES_PER_PROPERTY, OWNER_EDITABLE_STATUSES, PUBLIC_VISIBLE_STATUSES, canTransitionListing,
  propertyInputSchema, slugify, toSqft, LISTING_STATUS_LABELS, type ListingActor, type ListingStatus, type PropertySearch,
  type PropertyInput, type ContactCardDTO,
} from '@skyspace/shared';
import { Property, type PropertyDoc } from '../../models/property.model';
import { AgentProfile, ListingStatusHistory, Report, nextSequence } from '../../models/misc.models';
import { User } from '../../models/user.model';
import { AppError, badRequest, forbidden, notFound, unprocessable } from '../../utils/errors';
import { paginate } from '../../utils/http';
import { zodDetails } from '../../middleware/validate';
import { isAdmin } from '../../middleware/auth';
import { storage } from '../../services/storage';
import { notify } from '../../services/notify';
import { audit } from '../../services/audit';
import { sniffImageType } from '../../middleware/upload';
import { buildSearchFilter, buildSort } from './property.search';
import { SUMMARY_PROJECTION, toManaged, toPublicDetail, toSummary } from './property.mapper';

type User = Express.AuthUser;

/* ---------------- Public discovery ---------------- */

export async function search(s: PropertySearch) {
  const filter = buildSearchFilter(s);
  const hasText = !!filter.$text;
  const sort = buildSort(s, hasText);
  const skip = (s.page - 1) * s.limit;
  const projection = hasText ? { score: { $meta: 'textScore' as const } } : {};
  const [docs, total] = await Promise.all([
    Property.find(filter, projection).select(SUMMARY_PROJECTION).sort(sort).skip(skip).limit(s.limit).lean(),
    Property.countDocuments(filter),
  ]);
  return paginate(docs.map(toSummary), total, s.page, s.limit);
}

async function contactFor(p: { ownerId: unknown; agentId?: unknown; showContactDetails?: boolean | null }): Promise<ContactCardDTO | undefined> {
  const contactUserId = p.agentId ?? p.ownerId;
  const u = await User.findById(contactUserId).select('name phone email roles status').lean();
  if (!u || u.status !== 'active') return undefined;
  const isAgentContact = !!p.agentId;
  const profile = isAgentContact ? await AgentProfile.findOne({ userId: u._id }).select('slug agencyName publicProfile').lean() : null;
  return {
    name: u.name,
    role: isAgentContact ? 'agent' : 'owner',
    agencyName: profile?.agencyName ?? undefined,
    agentSlug: profile?.publicProfile ? profile.slug : undefined,
    ...(p.showContactDetails ? { phone: u.phone, email: u.email } : {}),
  };
}

export async function getPublicBySlug(slug: string, viewer?: User) {
  const p = await Property.findOne({ slug }).lean();
  if (!p) throw notFound('Property');
  const canManage = viewer && (isAdmin(viewer) || String(p.ownerId) === viewer.id || String(p.agentId) === viewer.id);
  if (!PUBLIC_VISIBLE_STATUSES.includes(p.status as ListingStatus) && !canManage) throw notFound('Property');
  if (p.status === 'published' && !canManage) {
    void Property.updateOne({ _id: p._id }, { $inc: { 'stats.views': 1 } }).exec();
  }
  return toPublicDetail(p, await contactFor(p));
}

export async function similar(id: string) {
  const p = await Property.findById(id).select('transactionType propertyCategory propertyType citySlug priceValue').lean();
  if (!p) throw notFound('Property');
  const base = { status: 'published', _id: { $ne: p._id }, transactionType: p.transactionType, citySlug: p.citySlug };
  const price = p.priceValue ?? 0;
  const priceBand = price ? { priceValue: { $gte: price * 0.6, $lte: price * 1.4 } } : {};
  let docs = await Property.find({ ...base, propertyType: p.propertyType, ...priceBand }).select(SUMMARY_PROJECTION).sort({ publishedAt: -1 }).limit(6).lean();
  if (docs.length < 3) {
    docs = await Property.find({ ...base, propertyCategory: p.propertyCategory }).select(SUMMARY_PROJECTION).sort({ publishedAt: -1 }).limit(6).lean();
  }
  return docs.map(toSummary);
}

/* ---------------- Access control helpers ---------------- */

export function actorFor(user: User, p: { ownerId: unknown; agentId?: unknown }): ListingActor | null {
  if (isAdmin(user)) return 'admin';
  if (String(p.ownerId) === user.id || (p.agentId && String(p.agentId) === user.id)) return 'owner';
  return null;
}

export async function loadManaged(user: User, id: string): Promise<PropertyDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Property');
  const p = await Property.findById(id);
  if (!p) throw notFound('Property');
  // Respond 404 rather than 403 so listing IDs owned by others are not disclosed.
  if (!actorFor(user, p)) throw notFound('Property');
  return p;
}

/* ---------------- Status workflow ---------------- */

export async function transition(
  p: PropertyDoc,
  to: ListingStatus,
  actor: ListingActor,
  changedBy: string | undefined,
  comment?: string,
) {
  const from = p.status as ListingStatus;
  if (!canTransitionListing(from, to, actor)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot change status from ${LISTING_STATUS_LABELS[from]} to ${LISTING_STATUS_LABELS[to]}`);
  }
  p.status = to;
  if (to === 'pending_approval') p.submittedAt = new Date();
  if (to === 'published' && !p.publishedAt) p.publishedAt = new Date();
  if (['rejected', 'suspended'].includes(to)) p.moderationComment = comment;
  if (to === 'published' || to === 'approved') p.moderationComment = undefined;
  await p.save();
  await ListingStatusHistory.create({ propertyId: p._id, previousStatus: from, newStatus: to, changedBy, comment });
  if (changedBy !== String(p.ownerId)) {
    await notify({
      userId: p.ownerId,
      type: 'listing_status',
      title: `Listing ${p.propertyId}: ${LISTING_STATUS_LABELS[to]}`,
      message: comment ? `"${p.title}" is now ${LISTING_STATUS_LABELS[to]}. Note: ${comment}` : `"${p.title}" is now ${LISTING_STATUS_LABELS[to]}.`,
      link: `/owner/listings/${p._id}`,
      email: ['published', 'rejected', 'suspended'].includes(to),
    });
  }
  return p;
}

/* ---------------- Create / update ---------------- */

/** Apply input onto the document, maintaining denormalised search fields. */
function applyInput(p: PropertyDoc, input: Partial<PropertyInput>) {
  const { location, possessionDate, availableFrom, ...rest } = input;
  p.set(rest);
  if (location !== undefined) p.set('location', location ? { type: 'Point', coordinates: [location.lng, location.lat] } : undefined);
  if (possessionDate !== undefined) p.possessionDate = possessionDate ? new Date(possessionDate) : undefined;
  if (availableFrom !== undefined) p.availableFrom = availableFrom ? new Date(availableFrom) : undefined;
  if (p.transactionType === 'sale') p.monthlyRent = undefined;
  p.priceValue = (p.transactionType === 'rent' ? p.monthlyRent : p.price) ?? undefined;
  const area = p.carpetArea ?? p.builtUpArea ?? p.plotArea;
  p.areaSqft = area ? toSqft(area, (p.areaUnit as 'sqft' | 'sqm') ?? 'sqft') : undefined;
  if (p.city) p.citySlug = slugify(p.city);
  if (p.locality) p.localitySlug = slugify(p.locality);
}

function makeSlug(p: { title?: string | null; locality?: string | null; city?: string | null; propertyId: string }) {
  const base = slugify([p.title, p.locality, p.city].filter(Boolean).join(' ')) || 'property';
  return `${base}-${p.propertyId.toLowerCase()}`;
}

export async function create(user: User, input: Partial<PropertyInput>) {
  const seq = await nextSequence('property');
  const propertyId = `SSR${seq}`;
  const isAgentUser = user.roles.includes('agent');
  const p = new Property({
    propertyId,
    slug: `draft-${propertyId.toLowerCase()}-${crypto.randomBytes(3).toString('hex')}`,
    transactionType: input.transactionType,
    propertyCategory: input.propertyCategory,
    propertyType: input.propertyType,
    ownerId: user.id,
    agentId: isAgentUser ? user.id : undefined,
    listedBy: input.listedBy ?? (isAgentUser ? 'agent' : 'owner'),
    status: 'draft',
  });
  applyInput(p, input);
  p.slug = makeSlug(p);
  await p.save();
  await ListingStatusHistory.create({ propertyId: p._id, newStatus: 'draft', changedBy: user.id, comment: 'Listing created' });
  return toManaged(p.toObject());
}

export async function update(user: User, id: string, input: Partial<PropertyInput>) {
  const p = await loadManaged(user, id);
  const actor = actorFor(user, p)!;
  if (actor !== 'admin' && !OWNER_EDITABLE_STATUSES.includes(p.status as ListingStatus)) {
    throw forbidden(`Listings in status "${LISTING_STATUS_LABELS[p.status as ListingStatus]}" cannot be edited`);
  }
  const before = p.toObject();
  applyInput(p, input);
  const changed = MATERIAL_LISTING_FIELDS.filter((f) => f !== 'images' && f in input && JSON.stringify(before[f as keyof typeof before]) !== JSON.stringify(p.get(f)));
  if (p.isModified('title') || p.isModified('locality') || p.isModified('city')) p.slug = makeSlug(p);

  // Live listings edited by their owner go back to moderation when material fields change.
  const needsReapproval = actor !== 'admin' && p.status === 'published' && changed.length > 0;
  if (p.status !== 'draft') {
    const check = propertyInputSchema.safeParse(toInputShape(p));
    if (!check.success) throw new AppError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields', zodDetails(check.error));
  }
  await p.save();
  if (needsReapproval) {
    await transition(p, 'pending_approval', 'system', user.id, `Re-approval required: changed ${changed.join(', ')}`);
  }
  return { property: toManaged(p.toObject()), reapprovalRequired: needsReapproval, changedFields: changed };
}

/** Rebuild the API input shape from a stored document so the full Zod schema can validate it. */
function toInputShape(p: PropertyDoc): Record<string, unknown> {
  const o = p.toObject() as Record<string, unknown> & { location?: { coordinates?: number[] }; possessionDate?: Date; availableFrom?: Date };
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined) clean[k] = v;
  clean.location = o.location?.coordinates?.length === 2 ? { lng: o.location.coordinates[0], lat: o.location.coordinates[1] } : undefined;
  clean.possessionDate = o.possessionDate ? o.possessionDate.toISOString().slice(0, 10) : undefined;
  clean.availableFrom = o.availableFrom ? o.availableFrom.toISOString().slice(0, 10) : undefined;
  return clean;
}

export async function submit(user: User, id: string) {
  const p = await loadManaged(user, id);
  const check = propertyInputSchema.safeParse(toInputShape(p));
  if (!check.success) throw new AppError(400, 'VALIDATION_ERROR', 'Complete the required details before submitting', zodDetails(check.error));
  if (!p.images.length) throw unprocessable('Add at least one photo before submitting');
  await transition(p, 'pending_approval', actorFor(user, p)!, user.id, 'Submitted for approval');
  const admins = await User.find({ roles: 'admin', status: 'active' }).select('_id').limit(20).lean();
  await Promise.all(
    admins.map((a) =>
      notify({ userId: a._id, type: 'listing_status', title: 'New listing awaiting approval', message: `${p.propertyId}: ${p.title}`, link: `/admin/approvals` }),
    ),
  );
  return toManaged(p.toObject());
}

export async function changeStatusByOwner(user: User, id: string, to: ListingStatus, comment?: string) {
  const p = await loadManaged(user, id);
  await transition(p, to, actorFor(user, p)!, user.id, comment);
  return toManaged(p.toObject());
}

export async function archive(user: User, id: string) {
  const p = await loadManaged(user, id);
  if (p.status === 'archived') return toManaged(p.toObject());
  await transition(p, 'archived', actorFor(user, p)!, user.id, 'Archived');
  return toManaged(p.toObject());
}

export async function getManaged(user: User, id: string) {
  const p = await loadManaged(user, id);
  const history = await ListingStatusHistory.find({ propertyId: p._id }).sort({ createdAt: -1 }).limit(50).populate('changedBy', 'name').lean();
  return {
    property: toManaged(p.toObject()),
    history: history.map((h) => ({
      id: String(h._id),
      previousStatus: h.previousStatus ?? undefined,
      newStatus: h.newStatus,
      changedBy: h.changedBy ? { id: String((h.changedBy as { _id: unknown })._id), name: (h.changedBy as unknown as { name: string }).name } : undefined,
      comment: h.comment ?? undefined,
      createdAt: (h.createdAt as Date).toISOString(),
    })),
  };
}

export async function listMine(user: User, opts: { status?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { $or: [{ ownerId: user.id }, { agentId: user.id }] };
  if (opts.status) filter.status = opts.status;
  const [docs, total] = await Promise.all([
    Property.find(filter).select(`${SUMMARY_PROJECTION} stats moderationComment updatedAt`).sort({ updatedAt: -1 }).skip((opts.page - 1) * opts.limit).limit(opts.limit).lean(),
    Property.countDocuments(filter),
  ]);
  return paginate(
    docs.map((d) => ({ ...toSummary(d), stats: d.stats, moderationComment: d.moderationComment ?? undefined, updatedAt: d.updatedAt?.toISOString() })),
    total,
    opts.page,
    opts.limit,
  );
}

/* ---------------- Images ---------------- */

export async function addImages(user: User, id: string, files: Express.Multer.File[], altText?: string) {
  const p = await loadManaged(user, id);
  if (!files?.length) throw badRequest('Attach at least one image');
  if (p.images.length + files.length > MAX_IMAGES_PER_PROPERTY) throw badRequest(`A listing can have at most ${MAX_IMAGES_PER_PROPERTY} photos`);
  const actor = actorFor(user, p)!;
  for (const file of files) {
    const type = sniffImageType(file.buffer);
    if (!type) throw badRequest(`${file.originalname} is not a valid JPEG, PNG or WebP image`);
    const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
    const key = `properties/${p.propertyId.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const stored = await storage.put(key, file.buffer, type);
    p.images.push({ key: stored.key, url: stored.url, altText: altText ?? p.title ?? '', order: p.images.length, mimeType: type, size: file.size, uploadedBy: new Types.ObjectId(user.id) });
  }
  await p.save();
  if (actor !== 'admin' && p.status === 'published') {
    await transition(p, 'pending_approval', 'system', user.id, 'Re-approval required: new photos added');
  }
  return toManaged(p.toObject()).images;
}

export async function removeImage(user: User, id: string, imageId: string) {
  const p = await loadManaged(user, id);
  const img = p.images.id(imageId);
  if (!img) throw notFound('Image');
  const key = img.key;
  img.deleteOne();
  p.images.forEach((im, i) => (im.order = i));
  await p.save();
  await storage.remove(key).catch(() => undefined);
  return toManaged(p.toObject()).images;
}

export async function updateImages(user: User, id: string, items: { id: string; order?: number; altText?: string }[]) {
  const p = await loadManaged(user, id);
  for (const it of items) {
    const img = p.images.id(it.id);
    if (!img) continue;
    if (it.order !== undefined) img.order = it.order;
    if (it.altText !== undefined) img.altText = it.altText;
  }
  await p.save();
  return toManaged(p.toObject()).images;
}

/* ---------------- Reports ---------------- */

export async function report(req: Request, id: string, input: { reason: string; details?: string; email?: string }) {
  const p = await Property.findOne({ _id: id, status: { $in: PUBLIC_VISIBLE_STATUSES } }).select('_id propertyId').lean();
  if (!p) throw notFound('Property');
  const r = await Report.create({ propertyId: p._id, reporterId: req.user?.id, email: input.email ?? req.user?.email, reason: input.reason, details: input.details });
  await audit(req, 'listing.reported', 'Property', String(p._id), { reason: input.reason, reportId: String(r._id) });
  return { id: String(r._id) };
}
