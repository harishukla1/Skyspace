'use client';

import { cn } from '@/lib/labels';

export function SegmentedTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition', value === o.value ? 'bg-brand-600 text-white shadow' : 'text-ink hover:bg-surface')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
