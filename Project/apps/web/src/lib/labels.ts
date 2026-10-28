import { DEFAULT_PROPERTY_TYPES } from '@skyspace/shared';

const typeNames = new Map(DEFAULT_PROPERTY_TYPES.map((t) => [t.slug, t.name]));
export const propertyTypeLabel = (slug: string) =>
  typeNames.get(slug) ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const humanize = (s?: string) => (s ? s.replace(/_/g, ' ').replace(/\b\w/, (m) => m.toUpperCase()) : '');
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
