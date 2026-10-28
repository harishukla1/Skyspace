import type { FilterQuery, SortOrder } from 'mongoose';
import { SEARCHABLE_STATUSES, slugify, type PropertySearch } from '@skyspace/shared';
import type { PropertyFields } from '../../models/property.model';
import { escapeRegex } from '../../utils/http';

const EARTH_RADIUS_KM = 6378.1;

/** Translate validated search params into a MongoDB filter. Only indexed/bounded operators are produced. */
export function buildSearchFilter(s: PropertySearch, statuses = SEARCHABLE_STATUSES): FilterQuery<PropertyFields> {
  const f: FilterQuery<PropertyFields> = { status: { $in: statuses } };
  if (s.transactionType) f.transactionType = s.transactionType;
  if (s.category) f.propertyCategory = s.category;
  if (s.type?.length) f.propertyType = { $in: s.type };
  if (s.city) f.citySlug = slugify(s.city);
  if (s.state) f.state = s.state;
  if (s.locality) f.localitySlug = slugify(s.locality);
  if (s.pinCode) f.pinCode = s.pinCode;
  if (s.project) f.projectName = { $regex: `^${escapeRegex(s.project)}`, $options: 'i' };
  if (s.propertyId) f.propertyId = s.propertyId.toUpperCase();

  if (s.minPrice !== undefined || s.maxPrice !== undefined) {
    f.priceValue = { ...(s.minPrice !== undefined && { $gte: s.minPrice }), ...(s.maxPrice !== undefined && { $lte: s.maxPrice }) };
  }
  if (s.minArea !== undefined || s.maxArea !== undefined) {
    f.areaSqft = { ...(s.minArea !== undefined && { $gte: s.minArea }), ...(s.maxArea !== undefined && { $lte: s.maxArea }) };
  }
  if (s.bedrooms?.length) {
    // "4" in the UI means 4 or more.
    const exact = s.bedrooms.filter((b) => b < 4);
    const fourPlus = s.bedrooms.some((b) => b >= 4);
    f.$or = [...(exact.length ? [{ bedrooms: { $in: exact } }] : []), ...(fourPlus ? [{ bedrooms: { $gte: 4 } }] : [])];
  }
  if (s.minBathrooms) f.bathrooms = { $gte: s.minBathrooms };
  if (s.furnishing?.length) f.furnishingStatus = { $in: s.furnishing };
  if (s.possession) f.possessionStatus = s.possession;
  if (s.possessionBy) f.possessionDate = { $lte: new Date(s.possessionBy) };
  if (s.condition) f.condition = s.condition;
  if (s.listedBy) f.listedBy = s.listedBy;
  if (s.parking) f.$and = [...(f.$and ?? []), { $or: [{ coveredParking: { $gt: 0 } }, { openParking: { $gt: 0 } }] }];
  if (s.amenities?.length) f.amenities = { $all: s.amenities };
  if (s.verified) f.verificationStatus = 'verified';
  if (s.postedWithin) f.publishedAt = { $gte: new Date(Date.now() - s.postedWithin * 86_400_000) };
  if (s.lat !== undefined && s.lng !== undefined) {
    f.location = { $geoWithin: { $centerSphere: [[s.lng, s.lat], (s.radiusKm ?? 5) / EARTH_RADIUS_KM] } };
  }

  if (s.q) {
    const q = s.q.trim();
    if (/^SSR\d{4,}$/i.test(q)) f.propertyId = q.toUpperCase();
    else if (/^[1-9]\d{5}$/.test(q)) f.pinCode = q;
    else f.$text = { $search: q };
  }
  return f;
}

export function buildSort(s: PropertySearch, hasText: boolean): Record<string, SortOrder | { $meta: 'textScore' }> {
  switch (s.sort) {
    case 'newest':
      return { publishedAt: -1, _id: -1 };
    case 'price_asc':
      return { priceValue: 1, _id: 1 };
    case 'price_desc':
      return { priceValue: -1, _id: -1 };
    case 'area_asc':
      return { areaSqft: 1, _id: 1 };
    case 'area_desc':
      return { areaSqft: -1, _id: -1 };
    default:
      return hasText ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { featured: -1, publishedAt: -1, _id: -1 };
  }
}
