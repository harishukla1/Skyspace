import { z } from 'zod';
import {
  AMENITIES, AREA_UNITS, FURNISHING_STATUSES, INDIAN_STATES, LISTED_BY, POSSESSION_STATUSES,
  PROPERTY_CATEGORIES, PROPERTY_CONDITIONS, SORT_OPTIONS, TRANSACTION_TYPES, LISTING_STATUSES,
  PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX,
} from '../constants';
import { csvList, isoDate, pinCode, plainText, queryBool } from './common';

const money = z.coerce.number().int().min(0).max(1_000_00_00_000);
const count = z.coerce.number().int().min(0).max(50);
const area = z.coerce.number().min(1).max(10_000_000);

const PLOT_TYPES = ['residential-plot', 'commercial-plot'];
export const isPlotType = (t?: string) => !!t && PLOT_TYPES.includes(t);

export const nearbyPlaceSchema = z.object({
  type: z.enum(['transport', 'school', 'hospital', 'mall', 'office_hub', 'other']),
  name: plainText(100).min(2),
  distanceKm: z.coerce.number().min(0).max(100).optional(),
});

export const propertyBaseSchema = z.object({
  title: plainText(120).min(10, 'Title should be at least 10 characters'),
  description: plainText(5000).min(30, 'Description should be at least 30 characters'),
  transactionType: z.enum(TRANSACTION_TYPES),
  propertyCategory: z.enum(PROPERTY_CATEGORIES),
  propertyType: z.string().trim().min(2).max(40),
  listedBy: z.enum(LISTED_BY).default('owner'),

  price: money.optional(),
  monthlyRent: money.optional(),
  securityDeposit: money.optional(),
  maintenanceCharges: money.optional(),
  priceNegotiable: z.boolean().optional(),

  projectName: plainText(100).optional(),
  address: plainText(250).min(5),
  locality: plainText(80).min(2),
  city: plainText(60).min(2),
  state: z.enum(INDIAN_STATES),
  pinCode,
  location: z.object({ lat: z.coerce.number().min(6).max(38), lng: z.coerce.number().min(68).max(98) }).optional(),
  hideExactLocation: z.boolean().default(false),

  bedrooms: count.optional(),
  bathrooms: count.optional(),
  balconies: count.optional(),
  coveredParking: count.optional(),
  openParking: count.optional(),
  carpetArea: area.optional(),
  builtUpArea: area.optional(),
  plotArea: area.optional(),
  areaUnit: z.enum(AREA_UNITS).default('sqft'),
  furnishingStatus: z.enum(FURNISHING_STATUSES).optional(),
  floorNumber: z.coerce.number().int().min(-3).max(200).optional(),
  totalFloors: z.coerce.number().int().min(1).max(200).optional(),
  propertyAgeYears: z.coerce.number().int().min(0).max(150).optional(),
  possessionStatus: z.enum(POSSESSION_STATUSES).optional(),
  possessionDate: isoDate.optional(),
  condition: z.enum(PROPERTY_CONDITIONS).optional(),

  availableFrom: isoDate.optional(),
  leaseTermMonths: z.coerce.number().int().min(1).max(240).optional(),
  lockInMonths: z.coerce.number().int().min(0).max(120).optional(),
  preferredTenants: z.array(z.enum(['family', 'bachelors', 'company', 'any'])).max(4).optional(),

  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).default([]),
  nearby: z.array(nearbyPlaceSchema).max(20).default([]),
  reraNumber: plainText(60).optional(),
  showContactDetails: z.boolean().default(false),
});

type PropertyShape = z.infer<typeof propertyBaseSchema>;

/** Business rules that depend on transaction type and property type. */
export function refineProperty(p: Partial<PropertyShape>, ctx: z.RefinementCtx) {
  const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  if (p.transactionType === 'sale' && !p.price) issue('price', 'Sale price is required');
  if (p.transactionType === 'rent' && !p.monthlyRent) issue('monthlyRent', 'Monthly rent is required');
  if (p.transactionType === 'sale' && p.monthlyRent) issue('monthlyRent', 'Monthly rent applies to rental listings only');
  const plot = isPlotType(p.propertyType);
  if (plot && !p.plotArea) issue('plotArea', 'Plot area is required for plots');
  if (!plot && !p.carpetArea && !p.builtUpArea) issue('carpetArea', 'Enter carpet area or built-up area');
  if (p.carpetArea && p.builtUpArea && p.carpetArea > p.builtUpArea) issue('carpetArea', 'Carpet area cannot exceed built-up area');
  if (p.propertyCategory === 'residential' && !plot && p.bedrooms === undefined) issue('bedrooms', 'Number of bedrooms is required');
  if (plot && p.bedrooms) issue('bedrooms', 'Plots cannot have bedrooms');
  if (p.floorNumber !== undefined && p.totalFloors !== undefined && p.floorNumber > p.totalFloors) issue('floorNumber', 'Floor cannot exceed total floors');
  if (p.possessionStatus === 'under_construction' && !p.possessionDate) issue('possessionDate', 'Expected possession date is required');
}

/** Full validation used when a listing is submitted for approval. */
export const propertyInputSchema = propertyBaseSchema.superRefine(refineProperty);
export type PropertyInput = z.input<typeof propertyBaseSchema>;

/** Drafts may be incomplete, but every supplied field must still be valid. */
export const propertyDraftSchema = propertyBaseSchema
  .partial()
  .extend({
    transactionType: z.enum(TRANSACTION_TYPES),
    propertyCategory: z.enum(PROPERTY_CATEGORIES),
    propertyType: z.string().trim().min(2).max(40),
  });
export const propertyUpdateSchema = propertyBaseSchema.partial();

export const propertySearchSchema = z.object({
  q: plainText(100).optional(),
  city: plainText(60).optional(),
  state: plainText(60).optional(),
  locality: plainText(80).optional(),
  pinCode: z.string().regex(/^\d{6}$/).optional(),
  project: plainText(100).optional(),
  propertyId: plainText(20).optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  category: z.enum(PROPERTY_CATEGORIES).optional(),
  type: csvList(z.string().max(40)),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  bedrooms: csvList(z.coerce.number().int().min(0).max(10)),
  minBathrooms: z.coerce.number().int().min(0).max(10).optional(),
  minArea: z.coerce.number().min(0).optional(),
  maxArea: z.coerce.number().min(0).optional(),
  furnishing: csvList(z.enum(FURNISHING_STATUSES)),
  possession: z.enum(POSSESSION_STATUSES).optional(),
  condition: z.enum(PROPERTY_CONDITIONS).optional(),
  parking: queryBool,
  amenities: csvList(z.enum(AMENITIES)),
  possessionBy: isoDate.optional(),
  postedWithin: z.coerce.number().int().min(1).max(365).optional(),
  listedBy: z.enum(LISTED_BY).optional(),
  verified: queryBool,
  lat: z.coerce.number().min(6).max(38).optional(),
  lng: z.coerce.number().min(68).max(98).optional(),
  radiusKm: z.coerce.number().min(1).max(50).optional(),
  sort: z.enum(SORT_OPTIONS).default('relevance'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});
export type PropertySearch = z.infer<typeof propertySearchSchema>;

export const listingStatusChangeSchema = z.object({
  status: z.enum(LISTING_STATUSES),
  comment: plainText(1000).optional(),
});
export const moderationCommentSchema = z.object({ comment: plainText(1000).optional() });
export const rejectSchema = z.object({ comment: plainText(1000).min(5, 'Give the owner a reason') });

export const reportListingSchema = z.object({
  reason: z.enum(['incorrect_info', 'fraud', 'already_sold', 'duplicate', 'offensive', 'other']),
  details: plainText(1000).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const imageMetaSchema = z.object({
  altText: plainText(150).optional(),
  order: z.coerce.number().int().min(0).max(100).optional(),
});
