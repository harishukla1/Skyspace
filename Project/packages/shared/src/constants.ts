export const ROLES = ['customer', 'owner', 'agent', 'admin'] as const;
export type Role = (typeof ROLES)[number];
/** Roles a user may pick for themselves at registration. Agent/admin are granted by an administrator. */
export const SELF_ASSIGNABLE_ROLES = ['customer', 'owner'] as const;

export const USER_STATUSES = ['active', 'suspended', 'deactivated'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TRANSACTION_TYPES = ['sale', 'rent'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PROPERTY_CATEGORIES = ['residential', 'commercial'] as const;
export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

/** Default property types. The live list is stored in the Category collection and is admin-configurable. */
export const DEFAULT_PROPERTY_TYPES: { slug: string; name: string; category: PropertyCategory }[] = [
  { slug: 'apartment', name: 'Apartment / Flat', category: 'residential' },
  { slug: 'villa', name: 'Villa', category: 'residential' },
  { slug: 'independent-house', name: 'Independent House', category: 'residential' },
  { slug: 'builder-floor', name: 'Builder Floor', category: 'residential' },
  { slug: 'residential-plot', name: 'Residential Plot', category: 'residential' },
  { slug: 'penthouse', name: 'Penthouse', category: 'residential' },
  { slug: 'office', name: 'Office Space', category: 'commercial' },
  { slug: 'shop', name: 'Shop / Retail', category: 'commercial' },
  { slug: 'showroom', name: 'Showroom', category: 'commercial' },
  { slug: 'warehouse', name: 'Warehouse / Godown', category: 'commercial' },
  { slug: 'commercial-plot', name: 'Commercial Plot', category: 'commercial' },
  { slug: 'coworking', name: 'Co-working Space', category: 'commercial' },
];

export const LISTING_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'published',
  'rejected',
  'suspended',
  'sold',
  'rented',
  'unavailable',
  'archived',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
  suspended: 'Suspended',
  sold: 'Sold',
  rented: 'Rented',
  unavailable: 'Unavailable',
  archived: 'Archived',
};

/** Statuses whose detail page is publicly reachable. Sold/rented stay visible (clearly labelled) for SEO continuity. */
export const PUBLIC_VISIBLE_STATUSES: ListingStatus[] = ['published', 'sold', 'rented'];
/** Statuses returned by public search. */
export const SEARCHABLE_STATUSES: ListingStatus[] = ['published'];

export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'failed'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const FURNISHING_STATUSES = ['unfurnished', 'semi_furnished', 'furnished'] as const;
export type FurnishingStatus = (typeof FURNISHING_STATUSES)[number];
export const FURNISHING_LABELS: Record<FurnishingStatus, string> = {
  unfurnished: 'Unfurnished',
  semi_furnished: 'Semi-furnished',
  furnished: 'Fully furnished',
};

export const POSSESSION_STATUSES = ['ready_to_move', 'under_construction'] as const;
export type PossessionStatus = (typeof POSSESSION_STATUSES)[number];

export const PROPERTY_CONDITIONS = ['new', 'resale'] as const;
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number];

export const LISTED_BY = ['owner', 'agent', 'builder'] as const;
export type ListedBy = (typeof LISTED_BY)[number];

export const AREA_UNITS = ['sqft', 'sqm'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];
export const SQM_TO_SQFT = 10.7639;

export const AMENITIES = [
  'lift', 'power_backup', 'security', 'cctv', 'gym', 'swimming_pool', 'club_house', 'park',
  'children_play_area', 'gated_community', 'intercom', 'rain_water_harvesting', 'gas_pipeline',
  'visitor_parking', 'fire_safety', 'wifi', 'cafeteria', 'conference_room', 'loading_dock',
  'air_conditioning', 'water_supply_24x7', 'maintenance_staff',
] as const;
export type Amenity = (typeof AMENITIES)[number];
export const amenityLabel = (a: string) =>
  a.replace(/_/g, ' ').replace(/\b(\w)/g, (m) => m.toUpperCase()).replace('24x7', '24×7').replace('Cctv', 'CCTV').replace('Wifi', 'Wi-Fi');

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'site_visit_scheduled',
  'follow_up_required',
  'converted',
  'closed',
  'invalid',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_scheduled: 'Site Visit Scheduled',
  follow_up_required: 'Follow-up Required',
  converted: 'Converted',
  closed: 'Closed',
  invalid: 'Invalid',
};

export const ENQUIRY_TYPES = ['buy', 'rent', 'price_info', 'site_visit', 'general'] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export const ENQUIRY_SOURCES = ['property_details', 'contact_form', 'agent_profile', 'sell_page', 'other'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];
export const CONTACT_METHODS = ['phone', 'email', 'whatsapp'] as const;

export const VISIT_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'rescheduled',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];
export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled (awaiting confirmation)',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No-show',
};

/** One-hour visit slots, interpreted in Indian Standard Time. */
export const VISIT_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
] as const;
export type VisitTimeSlot = (typeof VISIT_TIME_SLOTS)[number];
export const VISIT_MAX_DAYS_AHEAD = 60;
export const PLATFORM_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330;

export const REPORT_REASONS = ['incorrect_info', 'fraud', 'already_sold', 'duplicate', 'offensive', 'other'] as const;
export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;

export const SORT_OPTIONS = ['relevance', 'newest', 'price_asc', 'price_desc', 'area_asc', 'area_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const PAGE_SIZE_DEFAULT = 12;
export const PAGE_SIZE_MAX = 50;

export const MAX_IMAGES_PER_PROPERTY = 20;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

export const NOTIFICATION_TYPES = [
  'listing_status', 'enquiry_received', 'enquiry_update', 'visit_requested', 'visit_update', 'lead_assigned', 'account', 'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
