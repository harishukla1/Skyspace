import type {
  AreaUnit, FurnishingStatus, LeadStatus, ListedBy, ListingStatus, NotificationType, PossessionStatus,
  PropertyCategory, PropertyCondition, Role, TransactionType, UserStatus, VerificationStatus, VisitStatus,
} from './constants';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { path: string; message: string }[] };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: Role[];
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImage?: string;
  city?: string;
  marketingOptIn?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PropertyImageDTO {
  id: string;
  url: string;
  altText: string;
  order: number;
}

export interface ContactCardDTO {
  name: string;
  role: 'owner' | 'agent';
  agencyName?: string;
  phone?: string;
  email?: string;
  agentSlug?: string;
}

export interface PropertySummaryDTO {
  id: string;
  propertyId: string;
  slug: string;
  title: string;
  transactionType: TransactionType;
  propertyCategory: PropertyCategory;
  propertyType: string;
  price?: number;
  monthlyRent?: number;
  locality: string;
  city: string;
  state: string;
  bedrooms?: number;
  bathrooms?: number;
  carpetArea?: number;
  builtUpArea?: number;
  plotArea?: number;
  areaUnit: AreaUnit;
  furnishingStatus?: FurnishingStatus;
  possessionStatus?: PossessionStatus;
  status: ListingStatus;
  verificationStatus: VerificationStatus;
  featured: boolean;
  coverImage?: PropertyImageDTO;
  imageCount: number;
  publishedAt?: string;
  createdAt: string;
}

export interface NearbyPlaceDTO {
  type: string;
  name: string;
  distanceKm?: number;
}

export interface PropertyDetailDTO extends PropertySummaryDTO {
  description: string;
  listedBy: ListedBy;
  securityDeposit?: number;
  maintenanceCharges?: number;
  priceNegotiable?: boolean;
  projectName?: string;
  address?: string;
  pinCode: string;
  location?: { lat: number; lng: number };
  hideExactLocation: boolean;
  balconies?: number;
  coveredParking?: number;
  openParking?: number;
  floorNumber?: number;
  totalFloors?: number;
  propertyAgeYears?: number;
  possessionDate?: string;
  condition?: PropertyCondition;
  availableFrom?: string;
  leaseTermMonths?: number;
  lockInMonths?: number;
  preferredTenants?: string[];
  amenities: string[];
  nearby: NearbyPlaceDTO[];
  reraNumber?: string;
  images: PropertyImageDTO[];
  contact?: ContactCardDTO;
  updatedAt: string;
}

/** Owner/agent/admin view of a listing. */
export interface ManagedPropertyDTO extends PropertyDetailDTO {
  ownerId: string;
  agentId?: string;
  showContactDetails: boolean;
  moderationComment?: string;
  stats: { views: number; enquiries: number; shortlists: number; visits: number };
}

export interface StatusHistoryDTO {
  id: string;
  previousStatus?: string;
  newStatus: string;
  changedBy?: { id: string; name: string };
  comment?: string;
  createdAt: string;
}

export interface LeadNoteDTO {
  note: string;
  by?: { id: string; name: string };
  createdAt: string;
}

export interface EnquiryDTO {
  id: string;
  property?: { id: string; propertyId: string; title: string; slug: string; city: string };
  customerId?: string;
  assignedAgent?: { id: string; name: string };
  name: string;
  email: string;
  phone: string;
  preferredContact: string;
  message: string;
  enquiryType: string;
  source: string;
  status: LeadStatus;
  followUpAt?: string;
  notes: LeadNoteDTO[];
  history: { from?: string; to: string; by?: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SiteVisitDTO {
  id: string;
  property: { id: string; propertyId: string; title: string; slug: string; city: string; locality: string };
  customerId?: string;
  assignedAgent?: { id: string; name: string };
  name: string;
  phone: string;
  email: string;
  message?: string;
  scheduledAt: string;
  date: string;
  timeSlot: string;
  status: VisitStatus;
  confirmedAt?: string;
  notes: LeadNoteDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export interface CityDTO {
  id: string;
  name: string;
  slug: string;
  state: string;
  popular: boolean;
  active: boolean;
  imageUrl?: string;
  localities: { name: string; slug: string; pinCodes: string[] }[];
  propertyCount?: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  category: PropertyCategory;
  active: boolean;
  order: number;
}

export interface AgentPublicDTO {
  id: string;
  slug: string;
  name: string;
  agencyName?: string;
  bio?: string;
  reraAgentNumber?: string;
  experienceYears?: number;
  cities: string[];
  specialisations: string[];
  languages: string[];
  profileImage?: string;
  activeListings: number;
}

export interface SiteContentDTO {
  banners: { title: string; subtitle?: string; imageUrl: string; ctaLabel?: string; ctaHref?: string }[];
  faqs: { question: string; answer: string }[];
  testimonials: { name: string; city?: string; quote: string; isSample: boolean }[];
  pages: Partial<Record<'about' | 'privacy' | 'terms', { title: string; body: string; seoTitle?: string; seoDescription?: string }>>;
  seo: { homeTitle?: string; homeDescription?: string };
  settings: { supportEmail?: string; supportPhone?: string; officeAddress?: string };
}

export interface HomeDTO {
  featured: PropertySummaryDTO[];
  recent: PropertySummaryDTO[];
  popularCities: CityDTO[];
  categoryCounts: { slug: string; name: string; category: PropertyCategory; count: number }[];
  content: SiteContentDTO;
}
