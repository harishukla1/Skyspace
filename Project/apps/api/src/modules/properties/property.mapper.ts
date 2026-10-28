import type { ManagedPropertyDTO, PropertyDetailDTO, PropertyImageDTO, PropertySummaryDTO, ContactCardDTO } from '@skyspace/shared';
import { toIso } from '../../utils/http';

/* eslint-disable @typescript-eslint/no-explicit-any */
const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);
const dateOnly = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

export const SUMMARY_PROJECTION =
  'propertyId slug title transactionType propertyCategory propertyType price monthlyRent locality city state bedrooms bathrooms carpetArea builtUpArea plotArea areaUnit furnishingStatus possessionStatus status verificationStatus featured images publishedAt createdAt';

function images(p: any): PropertyImageDTO[] {
  return [...(p.images ?? [])]
    .sort((a: any, b: any) => a.order - b.order)
    .map((i: any) => ({ id: String(i._id), url: i.url, altText: i.altText || p.title, order: i.order }));
}

export function toSummary(p: any): PropertySummaryDTO {
  const imgs = images(p);
  return {
    id: String(p._id),
    propertyId: p.propertyId,
    slug: p.slug,
    title: p.title,
    transactionType: p.transactionType,
    propertyCategory: p.propertyCategory,
    propertyType: p.propertyType,
    price: opt(p.price),
    monthlyRent: opt(p.monthlyRent),
    locality: p.locality ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    bedrooms: opt(p.bedrooms),
    bathrooms: opt(p.bathrooms),
    carpetArea: opt(p.carpetArea),
    builtUpArea: opt(p.builtUpArea),
    plotArea: opt(p.plotArea),
    areaUnit: p.areaUnit ?? 'sqft',
    furnishingStatus: opt(p.furnishingStatus),
    possessionStatus: opt(p.possessionStatus),
    status: p.status,
    verificationStatus: p.verificationStatus,
    featured: !!p.featured,
    coverImage: imgs[0],
    imageCount: imgs.length,
    publishedAt: toIso(p.publishedAt),
    createdAt: toIso(p.createdAt)!,
  };
}

function detailFields(p: any) {
  return {
    description: p.description,
    listedBy: p.listedBy,
    securityDeposit: opt(p.securityDeposit),
    maintenanceCharges: opt(p.maintenanceCharges),
    priceNegotiable: opt(p.priceNegotiable),
    projectName: opt(p.projectName),
    pinCode: p.pinCode ?? '',
    balconies: opt(p.balconies),
    coveredParking: opt(p.coveredParking),
    openParking: opt(p.openParking),
    floorNumber: opt(p.floorNumber),
    totalFloors: opt(p.totalFloors),
    propertyAgeYears: opt(p.propertyAgeYears),
    possessionDate: dateOnly(p.possessionDate),
    condition: opt(p.condition),
    availableFrom: dateOnly(p.availableFrom),
    leaseTermMonths: opt(p.leaseTermMonths),
    lockInMonths: opt(p.lockInMonths),
    preferredTenants: p.preferredTenants?.length ? p.preferredTenants : undefined,
    amenities: p.amenities ?? [],
    nearby: (p.nearby ?? []).map((n: any) => ({ type: n.type, name: n.name, distanceKm: opt(n.distanceKm) })),
    reraNumber: opt(p.reraNumber),
    images: images(p),
    hideExactLocation: !!p.hideExactLocation,
    updatedAt: toIso(p.updatedAt)!,
  };
}

const coords = (p: any) => (p.location?.coordinates?.length === 2 ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] } : undefined);

/**
 * Public detail view. Privacy rules:
 *  - exact address & coordinates are withheld when hideExactLocation is set (coordinates rounded to ~1 km)
 *  - owner/agent phone & email are shown only when the lister opted in (showContactDetails)
 */
export function toPublicDetail(p: any, contact?: ContactCardDTO): PropertyDetailDTO {
  const loc = coords(p);
  return {
    ...toSummary(p),
    ...detailFields(p),
    address: p.hideExactLocation ? undefined : opt(p.address),
    location: loc && p.hideExactLocation ? { lat: Math.round(loc.lat * 100) / 100, lng: Math.round(loc.lng * 100) / 100 } : loc,
    contact,
  };
}

export function toManaged(p: any): ManagedPropertyDTO {
  return {
    ...toSummary(p),
    ...detailFields(p),
    address: opt(p.address),
    location: coords(p),
    ownerId: String(p.ownerId),
    agentId: p.agentId ? String(p.agentId) : undefined,
    showContactDetails: !!p.showContactDetails,
    moderationComment: opt(p.moderationComment),
    stats: { views: p.stats?.views ?? 0, enquiries: p.stats?.enquiries ?? 0, shortlists: p.stats?.shortlists ?? 0, visits: p.stats?.visits ?? 0 },
  };
}
