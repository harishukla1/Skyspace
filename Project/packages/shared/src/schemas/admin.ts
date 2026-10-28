import { z } from 'zod';
import { INDIAN_STATES, PROPERTY_CATEGORIES, REPORT_STATUSES, ROLES, USER_STATUSES } from '../constants';
import { email, indianPhone, objectId, pinCode, plainText } from './common';

export const userStatusSchema = z.object({ status: z.enum(USER_STATUSES), reason: plainText(500).optional() });
export const userRolesSchema = z.object({ roles: z.array(z.enum(ROLES)).min(1).max(4) });

export const categorySchema = z.object({
  name: plainText(60).min(2),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/),
  category: z.enum(PROPERTY_CATEGORIES),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(1000).default(0),
});

export const localitySchema = z.object({
  name: plainText(80).min(2),
  pinCodes: z.array(pinCode).max(20).default([]),
});
export const citySchema = z.object({
  name: plainText(60).min(2),
  state: z.enum(INDIAN_STATES),
  popular: z.boolean().default(false),
  active: z.boolean().default(true),
  imageUrl: z.string().url().optional().or(z.literal('')),
  localities: z.array(localitySchema).max(500).default([]),
});

export const agentCreateSchema = z.object({
  name: plainText(80).min(2),
  email,
  phone: indianPhone,
  agencyName: plainText(100).optional(),
  reraAgentNumber: plainText(60).optional(),
  cities: z.array(plainText(60)).max(20).default([]),
});
export const agentProfileSchema = z.object({
  agencyName: plainText(100).optional(),
  bio: plainText(1500).optional(),
  reraAgentNumber: plainText(60).optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  cities: z.array(plainText(60)).max(20).optional(),
  specialisations: z.array(plainText(40)).max(10).optional(),
  languages: z.array(plainText(30)).max(10).optional(),
  publicProfile: z.boolean().optional(),
});

export const assignAgentSchema = z.object({ agentId: objectId.nullable() });
export const featureSchema = z.object({ featured: z.boolean() });
export const verificationSchema = z.object({
  verificationStatus: z.enum(['unverified', 'pending', 'verified', 'failed']),
  comment: plainText(500).optional(),
});
export const reportStatusSchema = z.object({ status: z.enum(REPORT_STATUSES), resolution: plainText(1000).optional() });

export const faqSchema = z.object({ question: plainText(250).min(5), answer: plainText(2000).min(5) });
export const testimonialSchema = z.object({
  name: plainText(80).min(2),
  city: plainText(60).optional(),
  quote: plainText(600).min(10),
  isSample: z.boolean().default(true),
});
export const bannerSchema = z.object({
  title: plainText(120).min(2),
  subtitle: plainText(250).optional(),
  imageUrl: z.string().url(),
  ctaLabel: plainText(40).optional(),
  ctaHref: z.string().startsWith('/').max(200).optional(),
});
export const staticPageSchema = z.object({
  title: plainText(120),
  body: plainText(20000),
  seoTitle: plainText(70).optional(),
  seoDescription: plainText(170).optional(),
});
export const siteContentSchema = z.object({
  banners: z.array(bannerSchema).max(10).optional(),
  faqs: z.array(faqSchema).max(50).optional(),
  testimonials: z.array(testimonialSchema).max(30).optional(),
  pages: z.record(z.enum(['about', 'privacy', 'terms']), staticPageSchema).optional(),
  seo: z.object({ homeTitle: plainText(70).optional(), homeDescription: plainText(170).optional() }).optional(),
});
export const platformSettingsSchema = z.object({
  supportEmail: email.optional(),
  supportPhone: indianPhone.optional(),
  officeAddress: plainText(300).optional(),
  enquiryDuplicateWindowHours: z.coerce.number().int().min(1).max(168).optional(),
  autoPublishOnApprove: z.boolean().optional(),
  reraRequiredStates: z.array(z.enum(INDIAN_STATES)).optional(),
});

export const contactFormSchema = z.object({
  name: plainText(80).min(2),
  email,
  phone: indianPhone,
  message: plainText(2000).min(5),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const newsletterSchema = z.object({ email, consent: z.literal(true) });
