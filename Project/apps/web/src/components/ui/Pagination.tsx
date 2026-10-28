import Link from 'next/link';
import { cn } from '@/lib/labels';

/** Link-based pagination (works without JavaScript; crawlable). Pass `onPage` for client-side tables instead. */
export function Pagination({ page, totalPages, hrefFor, onPage }: { page: number; totalPages: number; hrefFor?: (p: number) => string; onPage?: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const list = [...pages].sort((a, b) => a - b);
  const item = (p: number, label: string | number, disabled = false, current = false) => {
    const cls = cn('inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm', current ? 'bg-brand-600 text-white' : 'border border-line bg-white hover:border-brand-400', disabled && 'pointer-events-none opacity-40');
    if (onPage) return <button key={`${label}-${p}`} type="button" className={cls} onClick={() => onPage(p)} disabled={disabled} aria-current={current ? 'page' : undefined}>{label}</button>;
    return <Link key={`${label}-${p}`} href={hrefFor!(p)} className={cls} aria-current={current ? 'page' : undefined} aria-disabled={disabled || undefined} scroll>{label}</Link>;
  };
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {item(Math.max(1, page - 1), '‹ Prev', page === 1)}
      {list.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - list[i - 1]! > 1 && <span className="px-1 text-muted">…</span>}
          {item(p, p, false, p === page)}
        </span>
      ))}
      {item(Math.min(totalPages, page + 1), 'Next ›', page === totalPages)}
    </nav>
  );
}
