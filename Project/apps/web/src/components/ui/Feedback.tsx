import type { ReactNode } from 'react';
import { cn } from '@/lib/labels';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12" />)}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = '🏙️' }: { title: string; description?: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mb-3 text-4xl" aria-hidden>{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <h3 className="font-semibold text-red-800">{title}</h3>
      {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning' | 'error'; children: ReactNode }) {
  const tones = {
    info: 'border-brand-200 bg-brand-50 text-brand-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
}
