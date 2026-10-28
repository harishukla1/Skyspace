import { IST_OFFSET_MINUTES, PLATFORM_TIMEZONE, SQM_TO_SQFT, type AreaUnit } from './constants';

const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

const trim = (n: number, digits: number) => Number(n.toFixed(digits)).toString();

/** "₹75 Lac", "₹1.25 Cr", "₹45,000". Indian grouping is used for values below one lakh. */
export function formatINR(amount: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';
  const compact = opts.compact ?? true;
  if (compact && amount >= CRORE) return `₹${trim(amount / CRORE, 2)} Cr`;
  if (compact && amount >= LAKH) return `₹${trim(amount / LAKH, 2)} Lac`;
  return `₹${formatIndianNumber(amount)}`;
}

/** 1234567 -> "12,34,567" */
export function formatIndianNumber(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

export function formatRent(amount: number | null | undefined): string {
  const v = formatINR(amount, { compact: (amount ?? 0) >= LAKH });
  return v ? `${v}/month` : '';
}

export function formatArea(value: number | null | undefined, unit: AreaUnit = 'sqft'): string {
  if (!value) return '';
  return `${formatIndianNumber(value)} ${unit === 'sqft' ? 'sq.ft' : 'sq.m'}`;
}

export const toSqft = (value: number, unit: AreaUnit) => (unit === 'sqm' ? Math.round(value * SQM_TO_SQFT) : value);

export function pricePerSqft(price?: number | null, area?: number | null, unit: AreaUnit = 'sqft'): string {
  if (!price || !area) return '';
  return `₹${formatIndianNumber(Math.round(price / toSqft(area, unit)))}/sq.ft`;
}

export function formatDateIN(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: PLATFORM_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  }).format(date);
}

/** Convert an IST calendar date (YYYY-MM-DD) and HH:mm slot into a UTC Date. */
export function istToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const utcMs = Date.UTC(y!, m! - 1, d!, hh!, mm!) - IST_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(now = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return ist.toISOString().slice(0, 10);
}

/**
 * Normalise an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts "98765 43210", "+91-9876543210", "09876543210", "919876543210". Returns null if invalid.
 */
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** "+919876543210" -> "+91 98765 43210" */
export const displayPhone = (e164: string) =>
  e164.startsWith('+91') && e164.length === 13 ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}` : e164;

/** "+919876543210" -> "+91 98XXX XX210" */
export const maskPhone = (e164: string) =>
  e164.length === 13 ? `+91 ${e164.slice(3, 5)}XXX XX${e164.slice(10)}` : 'Hidden';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const bhkLabel = (bedrooms?: number | null) => (bedrooms ? `${bedrooms} BHK` : '');
