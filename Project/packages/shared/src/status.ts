import type { LeadStatus, ListingStatus, VisitStatus } from './constants';

export type ListingActor = 'owner' | 'admin' | 'system';

/**
 * Listing state machine. Each entry lists the transitions an actor may perform.
 * "owner" covers the listing's owner and its assigned agent. Admins can perform every owner transition too.
 */
export const LISTING_TRANSITIONS: Record<ListingStatus, Partial<Record<ListingStatus, ListingActor[]>>> = {
  draft: { pending_approval: ['owner', 'admin'], archived: ['owner', 'admin'] },
  pending_approval: {
    approved: ['admin'],
    published: ['admin'],
    rejected: ['admin'],
    draft: ['owner', 'admin'],
    archived: ['owner', 'admin'],
  },
  approved: { published: ['admin'], suspended: ['admin'], archived: ['admin'] },
  published: {
    sold: ['owner', 'admin'],
    rented: ['owner', 'admin'],
    unavailable: ['owner', 'admin'],
    suspended: ['admin'],
    archived: ['owner', 'admin'],
    pending_approval: ['system'],
  },
  rejected: { draft: ['owner', 'admin'], pending_approval: ['owner', 'admin'], archived: ['owner', 'admin'] },
  suspended: { published: ['admin'], archived: ['admin'], pending_approval: ['admin'] },
  sold: { archived: ['owner', 'admin'], published: ['admin'] },
  rented: { archived: ['owner', 'admin'], pending_approval: ['owner', 'admin'], published: ['admin'] },
  unavailable: { pending_approval: ['owner', 'admin'], archived: ['owner', 'admin'], published: ['admin'] },
  archived: { draft: ['admin'] },
};

export function canTransitionListing(from: ListingStatus, to: ListingStatus, actor: ListingActor): boolean {
  if (from === to) return false;
  const allowed = LISTING_TRANSITIONS[from]?.[to];
  if (!allowed) return false;
  if (allowed.includes(actor)) return true;
  // Admins may perform any owner-level transition.
  return actor === 'admin' && allowed.includes('owner');
}

/** Statuses in which the owner may edit listing content. */
export const OWNER_EDITABLE_STATUSES: ListingStatus[] = ['draft', 'rejected', 'pending_approval', 'published', 'unavailable', 'rented'];

/**
 * Fields whose change on a live (published) listing sends it back for moderation.
 * Other fields (amenities, furnishing, availability dates, nearby places) are applied without re-approval.
 */
export const MATERIAL_LISTING_FIELDS = [
  'title', 'description', 'transactionType', 'propertyCategory', 'propertyType', 'price', 'monthlyRent',
  'securityDeposit', 'address', 'locality', 'city', 'state', 'pinCode', 'location', 'carpetArea',
  'builtUpArea', 'bedrooms', 'reraNumber', 'images',
] as const;

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'qualified', 'site_visit_scheduled', 'follow_up_required', 'closed', 'invalid'],
  contacted: ['qualified', 'site_visit_scheduled', 'follow_up_required', 'converted', 'closed', 'invalid'],
  qualified: ['site_visit_scheduled', 'follow_up_required', 'converted', 'closed', 'invalid'],
  site_visit_scheduled: ['follow_up_required', 'qualified', 'converted', 'closed'],
  follow_up_required: ['contacted', 'qualified', 'site_visit_scheduled', 'converted', 'closed', 'invalid'],
  converted: ['closed'],
  closed: ['follow_up_required'],
  invalid: [],
};

export const canTransitionLead = (from: LeadStatus, to: LeadStatus) => LEAD_TRANSITIONS[from].includes(to);

export type VisitActor = 'customer' | 'manager';
/** manager = property owner, assigned agent, or admin. */
export const VISIT_TRANSITIONS: Record<VisitStatus, Partial<Record<VisitStatus, VisitActor[]>>> = {
  pending_confirmation: { confirmed: ['manager'], rejected: ['manager'], cancelled: ['customer', 'manager'] },
  rescheduled: { confirmed: ['customer', 'manager'], cancelled: ['customer', 'manager'], rejected: ['manager'] },
  confirmed: { completed: ['manager'], no_show: ['manager'], cancelled: ['customer', 'manager'] },
  rejected: {},
  cancelled: {},
  completed: {},
  no_show: {},
};

export const canTransitionVisit = (from: VisitStatus, to: VisitStatus, actor: VisitActor) =>
  !!VISIT_TRANSITIONS[from]?.[to]?.includes(actor);

export const RESCHEDULABLE_VISIT_STATUSES: VisitStatus[] = ['pending_confirmation', 'confirmed', 'rescheduled'];
