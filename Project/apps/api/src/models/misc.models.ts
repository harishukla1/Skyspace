import { Schema, model, Types } from 'mongoose';
import {
  ENQUIRY_SOURCES, ENQUIRY_TYPES, LEAD_STATUSES, NOTIFICATION_TYPES, PROPERTY_CATEGORIES, REPORT_REASONS,
  REPORT_STATUSES, VISIT_STATUSES, CONTACT_METHODS,
} from '@skyspace/shared';

const noteSchema = new Schema({ note: String, by: { type: Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }, { _id: false });
const historySchema = new Schema({ from: String, to: String, by: { type: Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }, { _id: false });

/* ---------- Listing status history ---------- */
const listingStatusHistorySchema = new Schema(
  {
    propertyId: { type: Types.ObjectId, ref: 'Property', required: true },
    previousStatus: String,
    newStatus: { type: String, required: true },
    changedBy: { type: Types.ObjectId, ref: 'User' },
    comment: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
listingStatusHistorySchema.index({ propertyId: 1, createdAt: -1 });
export const ListingStatusHistory = model('ListingStatusHistory', listingStatusHistorySchema);

/* ---------- Enquiries / leads ---------- */
const enquirySchema = new Schema(
  {
    propertyId: { type: Types.ObjectId, ref: 'Property' },
    /** Denormalised owner of the property so owners can list enquiries on their listings efficiently. */
    ownerId: { type: Types.ObjectId, ref: 'User' },
    customerId: { type: Types.ObjectId, ref: 'User' },
    assignedAgentId: { type: Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    preferredContact: { type: String, enum: CONTACT_METHODS, default: 'phone' },
    message: { type: String, required: true },
    enquiryType: { type: String, enum: ENQUIRY_TYPES, default: 'general' },
    source: { type: String, enum: ENQUIRY_SOURCES, default: 'property_details' },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    followUpAt: Date,
    notes: { type: [noteSchema], default: [] },
    history: { type: [historySchema], default: [] },
    consentAt: Date,
    anonymisedAt: Date,
  },
  { timestamps: true },
);
enquirySchema.index({ assignedAgentId: 1, status: 1, createdAt: -1 });
enquirySchema.index({ ownerId: 1, createdAt: -1 });
enquirySchema.index({ customerId: 1, createdAt: -1 });
enquirySchema.index({ propertyId: 1, phone: 1, createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ followUpAt: 1 }, { sparse: true });
export const Enquiry = model('Enquiry', enquirySchema);

/* ---------- Site visits ---------- */
const siteVisitSchema = new Schema(
  {
    propertyId: { type: Types.ObjectId, ref: 'Property', required: true },
    ownerId: { type: Types.ObjectId, ref: 'User' },
    customerId: { type: Types.ObjectId, ref: 'User' },
    assignedAgentId: { type: Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: String,
    /** Appointment start in UTC. date/timeSlot are the IST values the customer picked. */
    scheduledAt: { type: Date, required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    status: { type: String, enum: VISIT_STATUSES, default: 'pending_confirmation' },
    confirmedAt: Date,
    /** Which side proposed the current time while status is "rescheduled"; the other side must confirm. */
    rescheduledBy: { type: String, enum: ['customer', 'manager'] },
    /** Set only while confirmed; unique indexes make double-booking impossible even under concurrency. */
    propertySlotLock: String,
    agentSlotLock: String,
    notes: { type: [noteSchema], default: [] },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);
siteVisitSchema.index({ propertySlotLock: 1 }, { unique: true, sparse: true });
siteVisitSchema.index({ agentSlotLock: 1 }, { unique: true, sparse: true });
siteVisitSchema.index({ customerId: 1, scheduledAt: -1 });
siteVisitSchema.index({ assignedAgentId: 1, scheduledAt: 1 });
siteVisitSchema.index({ ownerId: 1, scheduledAt: 1 });
siteVisitSchema.index({ propertyId: 1, status: 1, scheduledAt: 1 });
siteVisitSchema.index({ status: 1, scheduledAt: 1 });
export const SiteVisit = model('SiteVisit', siteVisitSchema);

/* ---------- Shortlist & saved searches ---------- */
const shortlistSchema = new Schema(
  { userId: { type: Types.ObjectId, ref: 'User', required: true }, propertyId: { type: Types.ObjectId, ref: 'Property', required: true } },
  { timestamps: { createdAt: true, updatedAt: false } },
);
shortlistSchema.index({ userId: 1, propertyId: 1 }, { unique: true });
shortlistSchema.index({ userId: 1, createdAt: -1 });
export const Shortlist = model('Shortlist', shortlistSchema);

const savedSearchSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    notificationEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);
savedSearchSchema.index({ userId: 1, createdAt: -1 });
export const SavedSearch = model('SavedSearch', savedSearchSchema);

/* ---------- Notifications ---------- */
const notificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86_400 });
export const Notification = model('Notification', notificationSchema);

/* ---------- Audit log ---------- */
const auditLogSchema = new Schema(
  {
    actorId: { type: Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    metadata: { type: Schema.Types.Mixed },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
export const AuditLog = model('AuditLog', auditLogSchema);

/* ---------- Configurable catalogue ---------- */
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: PROPERTY_CATEGORIES, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Category = model('Category', categorySchema);

const citySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    state: { type: String, required: true },
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    imageUrl: String,
    localities: { type: [{ name: String, slug: String, pinCodes: [String], _id: false }], default: [] },
  },
  { timestamps: true },
);
citySchema.index({ active: 1, popular: -1, name: 1 });
export const City = model('City', citySchema);

/* ---------- Agent profiles ---------- */
const agentProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    agencyName: String,
    bio: String,
    reraAgentNumber: String,
    experienceYears: Number,
    cities: { type: [String], default: [] },
    specialisations: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    publicProfile: { type: Boolean, default: true },
  },
  { timestamps: true },
);
agentProfileSchema.index({ publicProfile: 1, cities: 1 });
export const AgentProfile = model('AgentProfile', agentProfileSchema);

/* ---------- Listing reports / complaints ---------- */
const reportSchema = new Schema(
  {
    propertyId: { type: Types.ObjectId, ref: 'Property', required: true },
    reporterId: { type: Types.ObjectId, ref: 'User' },
    email: String,
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: String,
    status: { type: String, enum: REPORT_STATUSES, default: 'open' },
    resolution: String,
    resolvedBy: { type: Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true },
);
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ propertyId: 1 });
export const Report = model('Report', reportSchema);

/* ---------- Site configuration (singleton, key = "main") ---------- */
const siteConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    banners: { type: Schema.Types.Mixed, default: [] },
    faqs: { type: Schema.Types.Mixed, default: [] },
    testimonials: { type: Schema.Types.Mixed, default: [] },
    pages: { type: Schema.Types.Mixed, default: {} },
    seo: { type: Schema.Types.Mixed, default: {} },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);
export const SiteConfig = model('SiteConfig', siteConfigSchema);

/* ---------- Newsletter & counters ---------- */
const subscriberSchema = new Schema({ email: { type: String, required: true, unique: true }, consentAt: Date }, { timestamps: true });
export const Subscriber = model('Subscriber', subscriberSchema);

const counterSchema = new Schema({ _id: String, seq: Number });
export const Counter = model('Counter', counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return 100_000 + (c.seq ?? 1);
}
