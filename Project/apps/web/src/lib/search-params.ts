import { propertySearchSchema, type PropertySearch } from '@skyspace/shared';

export type RawParams = Record<string, string | string[] | undefined>;

/** Parse untrusted URL params; invalid values are dropped rather than breaking the page. */
export function parseSearch(raw: RawParams): PropertySearch {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (v !== undefined) flat[k] = Array.isArray(v) ? v.join(',') : v;
  const r = propertySearchSchema.safeParse(flat);
  if (r.success) return r.data;
  const bad = new Set(r.error.issues.map((i) => String(i.path[0])));
  const cleaned = Object.fromEntries(Object.entries(flat).filter(([k]) => !bad.has(k)));
  return propertySearchSchema.parse(cleaned);
}

export function toQueryString(params: Record<string, unknown>, omitDefaults = true): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (omitDefaults && ((k === 'page' && v === 1) || (k === 'limit' && v === 12) || (k === 'sort' && v === 'relevance'))) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return p.toString();
}

export const BUDGETS = {
  sale: [
    { label: '₹25 Lac', value: 2_500_000 }, { label: '₹50 Lac', value: 5_000_000 }, { label: '₹75 Lac', value: 7_500_000 },
    { label: '₹1 Cr', value: 10_000_000 }, { label: '₹1.5 Cr', value: 15_000_000 }, { label: '₹2 Cr', value: 20_000_000 },
    { label: '₹3 Cr', value: 30_000_000 }, { label: '₹5 Cr', value: 50_000_000 }, { label: '₹10 Cr', value: 100_000_000 },
  ],
  rent: [
    { label: '₹10,000', value: 10_000 }, { label: '₹20,000', value: 20_000 }, { label: '₹35,000', value: 35_000 },
    { label: '₹50,000', value: 50_000 }, { label: '₹75,000', value: 75_000 }, { label: '₹1 Lac', value: 100_000 },
    { label: '₹2 Lac', value: 200_000 }, { label: '₹5 Lac', value: 500_000 }, { label: '₹10 Lac', value: 1_000_000 },
  ],
};
