import type { ReactNode } from 'react';
import { cn } from '@/lib/labels';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Responsive table: a real <table> on md+ and stacked cards on mobile. */
export function DataTable<T>({ columns, rows, rowKey, caption }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; caption?: string }) {
  return (
    <div className="card overflow-hidden">
      <table className="hidden w-full text-left text-sm md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-surface/60">
              {columns.map((c) => <td key={c.key} className={cn('px-4 py-3 align-top', c.className)}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="space-y-1.5 p-4 text-sm">
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-4">
                <span className="text-muted">{c.header}</span>
                <span className="text-right">{c.cell(r)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
