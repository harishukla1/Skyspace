'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEFAULT_PROPERTY_TYPES } from '@skyspace/shared';
import { SegmentedTabs } from '@/components/ui/Tabs';
import { BUDGETS, toQueryString } from '@/lib/search-params';

type Tab = 'buy' | 'rent' | 'sell';

export function HeroSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('buy');
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const tx = tab === 'rent' ? 'rent' : 'sale';
  const types = DEFAULT_PROPERTY_TYPES.filter((t) => t.category === category);

  return (
    <div className="w-full max-w-4xl">
      <SegmentedTabs<Tab> label="What are you looking for?" value={tab} onChange={setTab} options={[{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }, { value: 'sell', label: 'Sell / Rent out' }]} />
      {tab === 'sell' ? (
        <div className="mt-3 flex flex-col items-start gap-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">List your property for free</p>
            <p className="text-sm text-muted">Reach verified buyers and tenants. Our team reviews every listing before it goes live.</p>
          </div>
          <button type="button" onClick={() => router.push('/sell')} className="h-12 shrink-0 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">Post property</button>
        </div>
      ) : (
        <form
          role="search"
          className="mt-3 grid gap-2 rounded-2xl bg-white p-3 shadow-[var(--shadow-lift)] md:grid-cols-[1.2fr_2fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get('q') ?? '').trim();
            const city = String(fd.get('city') ?? '');
            const type = String(fd.get('type') ?? '');
            const maxPrice = String(fd.get('maxPrice') ?? '');
            router.push(`/search?${toQueryString({ transactionType: tx, category, city, q, type, maxPrice })}`);
          }}
        >
          <label className="sr-only" htmlFor="hero-city">City</label>
          <select id="hero-city" name="city" className="field h-12 border-0 bg-surface" defaultValue="">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="hero-q">Locality, PIN code, project or property ID</label>
          <input id="hero-q" name="q" className="field h-12 border-0 bg-surface" placeholder="Locality, PIN code, project or SSR ID" autoComplete="off" />
          <label className="sr-only" htmlFor="hero-type">Property type</label>
          <select id="hero-type" name="type" className="field h-12 border-0 bg-surface" defaultValue="">
            <option value="">All types</option>
            {types.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="hero-budget">Maximum budget</label>
          <select id="hero-budget" name="maxPrice" className="field h-12 border-0 bg-surface" defaultValue="">
            <option value="">Any budget</option>
            {BUDGETS[tx].map((b) => <option key={b.value} value={b.value}>Up to {b.label}</option>)}
          </select>
          <button type="submit" className="h-12 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">Search</button>
          <div className="flex gap-2 md:col-span-5">
            {(['residential', 'commercial'] as const).map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className="chip text-xs">
                {c === 'residential' ? 'Residential' : 'Commercial'}
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
