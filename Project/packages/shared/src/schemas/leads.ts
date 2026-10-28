import { z } from 'zod';
import { CONTACT_METHODS, ENQUIRY_SOURCES, ENQUIRY_TYPES, LEAD_STATUSES, VISIT_STATUSES, VISIT_TIME_SLOTS } from '../constants';
import { email, indianPhone, isoDate, objectId, plainText } from './common';

export const enquiryCreateSchema = z.object({
  propertyId: objectId.optional(),
  agentId: objectId.optional(),
  name: plainText(80).min(2, 'Enter your name'),
  email,
  phone: indianPhone,
  preferredContact: z.enum(CONTACT_METHODS).default('phone'),
  message: plainText(2000).min(5, 'Please add a short message'),
  enquiryType: z.enum(ENQUIRY_TYPES).default('general'),
  source: z.enum(ENQUIRY_SOURCES).default('property_details'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required so we can contact you' }) }),
  /** Honeypot. Real users never fill this hidden field. */
  website: z.string().max(0).optional(),
});
export type EnquiryCreateInput = z.input<typeof enquiryCreateSchema>;

export const enquiryStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  note: plainText(1000).optional(),
  followUpAt: z.string().datetime().optional(),
});
export const enquiryNoteSchema = z.object({ note: plainText(1000).min(1), followUpAt: z.string().datetime().optional() });
export const enquiryAssignSchema = z.object({ agentId: objectId.nullable() });

export const siteVisitCreateSchema = z.object({
  propertyId: objectId,
  date: isoDate,
  timeSlot: z.enum(VISIT_TIME_SLOTS),
  name: plainText(80).min(2),
  phone: indianPhone,
  email,
  message: plainText(1000).optional(),
});
export type SiteVisitCreateInput = z.input<typeof siteVisitCreateSchema>;

export const siteVisitStatusSchema = z.object({
  status: z.enum(VISIT_STATUSES),
  note: plainText(1000).optional(),
});
export const siteVisitRescheduleSchema = z.object({
  date: isoDate,
  timeSlot: z.enum(VISIT_TIME_SLOTS),
  note: plainText(1000).optional(),
});

export const savedSearchSchema = z.object({
  name: plainText(80).min(2),
  filters: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).refine((o) => Object.keys(o).length <= 40),
  notificationEnabled: z.boolean().default(false),
});
export const savedSearchUpdateSchema = savedSearchSchema.partial();
