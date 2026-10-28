'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEFAULT_PROPERTY_TYPES, FURNISHING_LABELS, amenityLabel, formatINR, type FurnishingStatus } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FilterPanel } from './FilterPanel';

const LABELS: Record<string, (v: string) => string> = {
  transactionType: (v) => (v === 'rent' ? 'Rent' : 'Buy'),
  category: (v) => (v === 'commercial' ? 'Commercial' : 'Residential'),
  city: (v) => v,
  locality: (v) => v,
  state: (v) => v,
  pinCode: (v) => `PIN ${v}`,
  q: (v) => `“${v}”`,
  minPrice: (v) => `Min ${formatINR(Number(v))}`,
  maxPrice: (v) => `Max ${formatINR(Number(v))}`,
  minArea: (v) => `≥ ${v} sq.ft`,
  maxArea: (v) => `≤ ${v} sq.ft`,
  possession: (v) => (v === 'ready_to_move' ? 'Ready to move' : 'Under construction'),
  condition: (v) => (v === 'new' ? 'New' : 'Resale'),
  listedBy: (v) => `By ${v}`,
  parking: () => 'Parking',
  verified: () => 'Verified',
  postedWithin: (v) => `Last ${v} day(s)`,
  project: (v) => v,
};
const LIST_LABELS: Record<string, (v: string) => string> = {
  type: (v) => DEFAULT_PROPERTY_TYPES.find((t) => t.slug === v)?.name ?? v,
  bedrooms: (v) => (v === '4' ? '4+ BHK' : `${v} BHK`),
  furnishing: (v) => FURNISHING_LABELS[v as FurnishingStatus] ?? v,
  amenities: (v) => amenityLabel(v),
};

export function SearchToolbar({ total, lockedValues = {} }: { total: number; lockedValues?: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem('ssr:lastSearch', `${pathname}?${params.toString()}`); } catch { /* ignore */ }
  }, [pathname, params]);

  const push = (next: URLSearchParams) => router.push(`${pathname}?${next.toString()}`, { scroll: false });
  const remove = (k: string, v?: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) {
      const rest = (next.get(k) ?? '').split(',').filter((x) => x && x !== v);
      if (rest.length) next.set(k, rest.join(','));
      else next.delete(k);
    } else next.delete(k);
    next.delete('page');
    push(next);
  };
  const chips: { key: string; value?: string; label: string }[] = [];
  for (const [k, v] of params.entries()) {
    if (LABELS[k]) chips.push({ key: k, label: LABELS[k]!(v) });
    else if (LIST_LABELS[k]) v.split(',').filter(Boolean).forEach((x) => chips.push({ key: k, value: x, label: LIST_LABELS[k]!(x) }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite"><strong className="text-ink">{total.toLocaleString('en-IN')}</strong> {total === 1 ? 'property' : 'properties'} found</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>Filters{chips.length ? ` (${chips.length})` : ''}</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!user) return router.push(`/login?next=${encodeURIComponent(`${pathname}?${params.toString()}`)}`);
              const filters = Object.fromEntries([...params.entries()].filter(([k]) => k !== 'page'));
              const name = [filters.city, filters.q, filters.transactionType === 'rent' ? 'Rent' : filters.transactionType ? 'Buy' : '', filters.category].filter(Boolean).join(' · ') || 'All properties';
              try {
                await api('/users/me/saved-searches', { body: { name, filters, notificationEnabled: false } });
                toast('Search saved to your dashboard');
              } catch (e) {
                toast((e as Error).message, 'error');
              }
            }}
          >
            Save search
          </Button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select
            id="sort"
            className="field h-8 w-auto py-0 text-sm"
            value={params.get('sort') ?? 'relevance'}
            onChange={(e) => {
              const next = new URLSearchParams(params.toString());
              if (e.target.value === 'relevance') next.delete('sort');
              else next.set('sort', e.target.value);
              next.delete('page');
              push(next);
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="area_asc">Area: small to large</option>
            <option value="area_desc">Area: large to small</option>
          </select>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <button key={`${c.key}-${c.value ?? ''}`} type="button" onClick={() => remove(c.key, c.value)} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100" aria-label={`Remove filter ${c.label}`}>
              {c.label} <span aria-hidden>✕</span>
            </button>
          ))}
          <button type="button" className="text-xs font-medium text-muted underline hover:text-ink" onClick={() => router.push(pathname)}>Reset filters</button>
        </div>
      )}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" footer={<Button onClick={() => setFiltersOpen(false)}>Show {total} results</Button>}>
        <FilterPanel lockedValues={lockedValues} />
      </Modal>
    </div>
  );
}
