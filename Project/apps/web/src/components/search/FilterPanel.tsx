'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { AMENITIES, DEFAULT_PROPERTY_TYPES, FURNISHING_LABELS, FURNISHING_STATUSES, amenityLabel } from '@skyspace/shared';
import { BUDGETS } from '@/lib/search-params';

/** All state lives in the URL; this panel only edits query params, and the server renders results. */
export function FilterPanel({ lockedValues = {} }: { lockedValues?: Record<string, string> }) {
  const locked = Object.keys(lockedValues);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');
  const first = useRef(true);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const list = (k: string) => (params.get(k) ?? '').split(',').filter(Boolean);
  const toggleIn = (k: string, v: string) => {
    const cur = new Set(list(k));
    if (cur.has(v)) cur.delete(v);
    else cur.add(v);
    update({ [k]: [...cur].join(',') || undefined });
  };

  // Debounced keyword search
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) update({ q: q || undefined });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const tx = (lockedValues.transactionType ?? params.get('transactionType') ?? 'sale') as 'sale' | 'rent';
  const category = lockedValues.category ?? params.get('category') ?? '';
  const types = DEFAULT_PROPERTY_TYPES.filter((t) => !category || t.category === category);
  const residential = category !== 'commercial';

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div>
        <label htmlFor="f-q" className="label">Keyword</label>
        <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field" placeholder="Locality, project, PIN, SSR ID" />
      </div>
      {!locked.includes('transactionType') && <Group title="Looking to">
        {[['sale', 'Buy'], ['rent', 'Rent']].map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={(params.get('transactionType') ?? '') === v} onClick={() => update({ transactionType: params.get('transactionType') === v ? undefined : v, minPrice: undefined, maxPrice: undefined })}>{l}</button>
        ))}
      </Group>}
      {!locked.includes('category') && <Group title="Category">
        {[['residential', 'Residential'], ['commercial', 'Commercial']].map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={category === v} onClick={() => update({ category: category === v ? undefined : v, type: undefined })}>{l}</button>
        ))}
      </Group>}
      <Group title="Property type">
        {types.map((t) => <button key={t.slug} type="button" className="chip" aria-pressed={list('type').includes(t.slug)} onClick={() => toggleIn('type', t.slug)}>{t.name}</button>)}
      </Group>
      <fieldset>
        <legend className="label">Budget</legend>
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Minimum price" className="field" value={params.get('minPrice') ?? ''} onChange={(e) => update({ minPrice: e.target.value })}>
            <option value="">No min</option>
            {BUDGETS[tx].map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select aria-label="Maximum price" className="field" value={params.get('maxPrice') ?? ''} onChange={(e) => update({ maxPrice: e.target.value })}>
            <option value="">No max</option>
            {BUDGETS[tx].map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </fieldset>
      {residential && (
        <Group title="Bedrooms">
          {['1', '2', '3', '4'].map((b) => <button key={b} type="button" className="chip" aria-pressed={list('bedrooms').includes(b)} onClick={() => toggleIn('bedrooms', b)}>{b === '4' ? '4+ BHK' : `${b} BHK`}</button>)}
        </Group>
      )}
      <fieldset>
        <legend className="label">Area (sq.ft)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Minimum area" type="number" min={0} inputMode="numeric" placeholder="Min" className="field" defaultValue={params.get('minArea') ?? ''} onBlur={(e) => update({ minArea: e.target.value })} />
          <input aria-label="Maximum area" type="number" min={0} inputMode="numeric" placeholder="Max" className="field" defaultValue={params.get('maxArea') ?? ''} onBlur={(e) => update({ maxArea: e.target.value })} />
        </div>
      </fieldset>
      <Group title="Furnishing">
        {FURNISHING_STATUSES.map((f) => <button key={f} type="button" className="chip" aria-pressed={list('furnishing').includes(f)} onClick={() => toggleIn('furnishing', f)}>{FURNISHING_LABELS[f]}</button>)}
      </Group>
      <Group title="Possession">
        {[['ready_to_move', 'Ready to move'], ['under_construction', 'Under construction']].map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={params.get('possession') === v} onClick={() => update({ possession: params.get('possession') === v ? undefined : v })}>{l}</button>
        ))}
      </Group>
      {tx === 'sale' && (
        <Group title="Sale type">
          {[['new', 'New'], ['resale', 'Resale']].map(([v, l]) => (
            <button key={v} type="button" className="chip" aria-pressed={params.get('condition') === v} onClick={() => update({ condition: params.get('condition') === v ? undefined : v })}>{l}</button>
          ))}
        </Group>
      )}
      <Group title="Listed by">
        {[['owner', 'Owner'], ['agent', 'Agent'], ['builder', 'Builder']].map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={params.get('listedBy') === v} onClick={() => update({ listedBy: params.get('listedBy') === v ? undefined : v })}>{l}</button>
        ))}
      </Group>
      <div className="space-y-2">
        <Toggle label="Parking available" checked={params.get('parking') === 'true'} onChange={(v) => update({ parking: v ? 'true' : undefined })} />
        <Toggle label="Verified listings only" checked={params.get('verified') === 'true'} onChange={(v) => update({ verified: v ? 'true' : undefined })} />
      </div>
      <div>
        <label htmlFor="f-posted" className="label">Posted</label>
        <select id="f-posted" className="field" value={params.get('postedWithin') ?? ''} onChange={(e) => update({ postedWithin: e.target.value })}>
          <option value="">Any time</option>
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>
      <details>
        <summary className="label cursor-pointer">Amenities {list('amenities').length ? `(${list('amenities').length})` : ''}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMENITIES.map((a) => <button key={a} type="button" className="chip text-xs" aria-pressed={list('amenities').includes(a)} onClick={() => toggleIn('amenities', a)}>{amenityLabel(a)}</button>)}
        </div>
      </details>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="h-4 w-4 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
