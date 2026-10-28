import { describe, expect, it } from 'vitest';
import { canTransitionLead, canTransitionListing, canTransitionVisit } from './status';
import { hasPermission } from './permissions';
import { propertyInputSchema, propertySearchSchema } from './schemas/property';
import { enquiryCreateSchema } from './schemas/leads';
import { registerSchema } from './schemas/auth';

const validSale = {
  title: '3 BHK Apartment in Powai', description: 'Spacious lake-facing apartment with modern amenities and parking.',
  transactionType: 'sale', propertyCategory: 'residential', propertyType: 'apartment', price: 25_000_000,
  address: 'Hiranandani Gardens', locality: 'Powai', city: 'Mumbai', state: 'Maharashtra', pinCode: '400076',
  bedrooms: 3, carpetArea: 1200,
};

describe('listing transitions', () => {
  it('owner cannot approve or publish own listing', () => {
    expect(canTransitionListing('pending_approval', 'published', 'owner')).toBe(false);
    expect(canTransitionListing('pending_approval', 'approved', 'owner')).toBe(false);
  });
  it('owner can submit a draft and mark published as sold', () => {
    expect(canTransitionListing('draft', 'pending_approval', 'owner')).toBe(true);
    expect(canTransitionListing('published', 'sold', 'owner')).toBe(true);
  });
  it('admin can approve, suspend and perform owner transitions', () => {
    expect(canTransitionListing('pending_approval', 'published', 'admin')).toBe(true);
    expect(canTransitionListing('published', 'suspended', 'admin')).toBe(true);
    expect(canTransitionListing('published', 'sold', 'admin')).toBe(true);
  });
  it('rejects undefined transitions', () => expect(canTransitionListing('archived', 'published', 'admin')).toBe(false));
});

describe('lead & visit transitions', () => {
  it('invalid is terminal', () => expect(canTransitionLead('invalid', 'contacted')).toBe(false));
  it('new -> contacted allowed', () => expect(canTransitionLead('new', 'contacted')).toBe(true));
  it('customers cannot confirm their own visit request', () => {
    expect(canTransitionVisit('pending_confirmation', 'confirmed', 'customer')).toBe(false);
    expect(canTransitionVisit('pending_confirmation', 'confirmed', 'manager')).toBe(true);
    expect(canTransitionVisit('rescheduled', 'confirmed', 'customer')).toBe(true);
  });
});

describe('permissions', () => {
  it('enforces least privilege', () => {
    expect(hasPermission(['customer'], 'property:create')).toBe(false);
    expect(hasPermission(['owner'], 'property:create')).toBe(true);
    expect(hasPermission(['agent'], 'admin:dashboard')).toBe(false);
    expect(hasPermission(['admin'], 'admin:dashboard')).toBe(true);
    expect(hasPermission([], 'profile:manage_own')).toBe(false);
  });
});

describe('property validation', () => {
  it('accepts a valid sale listing', () => expect(propertyInputSchema.safeParse(validSale).success).toBe(true));
  it('requires price for sale and rent for rent', () => {
    expect(propertyInputSchema.safeParse({ ...validSale, price: undefined }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validSale, transactionType: 'rent', price: undefined, monthlyRent: 60000 }).success).toBe(true);
  });
  it('validates PIN code and carpet vs built-up', () => {
    expect(propertyInputSchema.safeParse({ ...validSale, pinCode: '012345' }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validSale, carpetArea: 1500, builtUpArea: 1200 }).success).toBe(false);
  });
  it('plots need plot area and no bedrooms', () => {
    const plot = { ...validSale, propertyType: 'residential-plot', bedrooms: undefined, carpetArea: undefined, plotArea: 2400 };
    expect(propertyInputSchema.safeParse(plot).success).toBe(true);
    expect(propertyInputSchema.safeParse({ ...plot, bedrooms: 2 }).success).toBe(false);
  });
});

describe('search filter parsing', () => {
  it('parses csv lists, numbers and booleans from query strings', () => {
    const r = propertySearchSchema.parse({ bedrooms: '2,3', type: 'apartment,villa', minPrice: '5000000', parking: 'true', limit: '20' });
    expect(r.bedrooms).toEqual([2, 3]);
    expect(r.type).toEqual(['apartment', 'villa']);
    expect(r.minPrice).toBe(5_000_000);
    expect(r.parking).toBe(true);
    expect(r.sort).toBe('relevance');
  });
  it('caps page size', () => expect(propertySearchSchema.safeParse({ limit: '500' }).success).toBe(false));
  it('rejects unknown enum values', () => expect(propertySearchSchema.safeParse({ transactionType: 'lease' }).success).toBe(false));
});

describe('enquiry & registration', () => {
  it('normalises phone and requires consent', () => {
    const base = { name: 'Asha', email: 'ASHA@Example.com ', phone: '98765 43210', message: 'Is this available?', consent: true };
    const r = enquiryCreateSchema.parse(base);
    expect(r.phone).toBe('+919876543210');
    expect(r.email).toBe('asha@example.com');
    expect(enquiryCreateSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(enquiryCreateSchema.safeParse({ ...base, website: 'spam.com' }).success).toBe(false);
  });
  it('does not allow self-registration as admin or agent', () => {
    const base = { name: 'Asha', email: 'a@b.co', phone: '9876543210', password: 'secret123', acceptTerms: true };
    expect(registerSchema.safeParse({ ...base, role: 'admin' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: 'owner' }).success).toBe(true);
  });
});
