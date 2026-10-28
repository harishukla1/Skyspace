import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import {
  AMENITIES, AREA_UNITS, FURNISHING_STATUSES, LISTED_BY, LISTING_STATUSES, POSSESSION_STATUSES, PROPERTY_CATEGORIES,
  PROPERTY_CONDITIONS, TRANSACTION_TYPES, VERIFICATION_STATUSES,
} from '@skyspace/shared';

const imageSchema = new Schema(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    altText: { type: String, default: '' },
    order: { type: Number, default: 0 },
    mimeType: String,
    size: Number,
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const propertySchema = new Schema(
  {
    /** Human-friendly public reference, e.g. SSR100123. */
    propertyId: { type: String, required: true },
    slug: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    transactionType: { type: String, enum: TRANSACTION_TYPES, required: true },
    propertyCategory: { type: String, enum: PROPERTY_CATEGORIES, required: true },
    propertyType: { type: String, required: true },
    listedBy: { type: String, enum: LISTED_BY, default: 'owner' },

    price: Number,
    monthlyRent: Number,
    securityDeposit: Number,
    maintenanceCharges: Number,
    priceNegotiable: Boolean,
    /** Denormalised: price for sale, monthlyRent for rent. Drives price filters and sorting. */
    priceValue: Number,

    projectName: String,
    address: String,
    locality: String,
    localitySlug: String,
    city: String,
    citySlug: String,
    state: String,
    pinCode: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
    hideExactLocation: { type: Boolean, default: false },

    bedrooms: Number,
    bathrooms: Number,
    balconies: Number,
    coveredParking: Number,
    openParking: Number,
    carpetArea: Number,
    builtUpArea: Number,
    plotArea: Number,
    areaUnit: { type: String, enum: AREA_UNITS, default: 'sqft' },
    /** Denormalised: best available area converted to sq.ft, for area filters and sorting. */
    areaSqft: Number,
    furnishingStatus: { type: String, enum: FURNISHING_STATUSES },
    floorNumber: Number,
    totalFloors: Number,
    propertyAgeYears: Number,
    possessionStatus: { type: String, enum: POSSESSION_STATUSES },
    possessionDate: Date,
    condition: { type: String, enum: PROPERTY_CONDITIONS },
    availableFrom: Date,
    leaseTermMonths: Number,
    lockInMonths: Number,
    preferredTenants: [String],
    amenities: { type: [String], enum: AMENITIES, default: [] },
    nearby: { type: [{ type: { type: String }, name: String, distanceKm: Number, _id: false }], default: [] },
    reraNumber: String,
    showContactDetails: { type: Boolean, default: false },
    images: { type: [imageSchema], default: [] },

    ownerId: { type: Types.ObjectId, ref: 'User', required: true },
    agentId: { type: Types.ObjectId, ref: 'User' },
    status: { type: String, enum: LISTING_STATUSES, default: 'draft' },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'unverified' },
    verifiedAt: Date,
    verifiedBy: { type: Types.ObjectId, ref: 'User' },
    featured: { type: Boolean, default: false },
    moderationComment: String,
    submittedAt: Date,
    publishedAt: Date,
    stats: {
      views: { type: Number, default: 0 },
      enquiries: { type: Number, default: 0 },
      shortlists: { type: Number, default: 0 },
      visits: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// Each index below is documented with the query it supports in docs/database-schema.md.
propertySchema.index({ propertyId: 1 }, { unique: true });
propertySchema.index({ slug: 1 }, { unique: true });
propertySchema.index({ status: 1, transactionType: 1, propertyCategory: 1, citySlug: 1, priceValue: 1 });
propertySchema.index({ status: 1, citySlug: 1, localitySlug: 1, publishedAt: -1 });
propertySchema.index({ status: 1, publishedAt: -1 });
propertySchema.index({ status: 1, featured: 1, publishedAt: -1 });
propertySchema.index({ status: 1, propertyType: 1, publishedAt: -1 });
propertySchema.index({ status: 1, pinCode: 1 });
propertySchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
propertySchema.index({ agentId: 1, status: 1, updatedAt: -1 });
propertySchema.index({ status: 1, submittedAt: 1 });
propertySchema.index({ location: '2dsphere' }, { sparse: true });
propertySchema.index(
  { title: 'text', projectName: 'text', locality: 'text', city: 'text', description: 'text' },
  { weights: { title: 10, projectName: 8, locality: 6, city: 4, description: 1 }, name: 'property_text', default_language: 'english' },
);

export type PropertyFields = InferSchemaType<typeof propertySchema>;
export type PropertyDoc = HydratedDocument<PropertyFields>;
export const Property = model('Property', propertySchema);
