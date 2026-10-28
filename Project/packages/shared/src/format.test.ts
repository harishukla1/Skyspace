import { describe, expect, it } from 'vitest';
import { formatINR, formatRent, istToUtc, normalizeIndianPhone, maskPhone, slugify, formatArea, pricePerSqft } from './format';

describe('formatINR', () => {
  it('formats crore and lakh', () => {
    expect(formatINR(12_500_000)).toBe('₹1.25 Cr');
    expect(formatINR(7_500_000)).toBe('₹75 Lac');
    expect(formatINR(10_000_000)).toBe('₹1 Cr');
  });
  it('uses Indian grouping below a lakh and when not compact', () => {
    expect(formatINR(45_000)).toBe('₹45,000');
    expect(formatINR(1_234_567, { compact: false })).toBe('₹12,34,567');
  });
  it('returns empty string for missing values instead of zero', () => {
    expect(formatINR(undefined)).toBe('');
    expect(formatRent(undefined)).toBe('');
  });
  it('formats rent', () => expect(formatRent(35_000)).toBe('₹35,000/month'));
});

describe('phone normalisation', () => {
  it.each(['98765 43210', '+91-9876543210', '09876543210', '919876543210'])('normalises %s', (v) => {
    expect(normalizeIndianPhone(v)).toBe('+919876543210');
  });
  it('rejects invalid numbers', () => {
    expect(normalizeIndianPhone('12345')).toBeNull();
    expect(normalizeIndianPhone('5876543210')).toBeNull();
  });
  it('masks', () => expect(maskPhone('+919876543210')).toBe('+91 98XXX XX210'));
});

describe('misc', () => {
  it('converts IST to UTC', () => expect(istToUtc('2026-01-15', '10:00').toISOString()).toBe('2026-01-15T04:30:00.000Z'));
  it('slugifies', () => expect(slugify('3 BHK Flat in Powai, Mumbai!')).toBe('3-bhk-flat-in-powai-mumbai'));
  it('formats area & price per sqft', () => {
    expect(formatArea(1250)).toBe('1,250 sq.ft');
    expect(pricePerSqft(10_000_000, 1000)).toBe('₹10,000/sq.ft');
  });
});
