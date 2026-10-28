'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDateIN, type NotificationDTO, type Paginated } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<Paginated<NotificationDTO> & { unread: number }>('/users/me/notifications', { page });
  return (
    <>
      <PageHeader
        title="Notifications"
        description={data ? `${data.unread} unread` : undefined}
        actions={data?.unread ? <Button variant="outline" onClick={async () => { await api('/users/me/notifications/read-all', { method: 'POST' }); void reload(); }}>Mark all as read</Button> : null}
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? <EmptyState title="You’re all caught up" icon="🔔" /> : (
        <>
          <ul className="card divide-y divide-line">
            {data.items.map((n) => (
              <li key={n.id} className={`flex gap-3 p-4 ${n.readAt ? '' : 'bg-brand-50/50'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</p>
                  <p className="text-sm text-muted">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateIN(n.createdAt, true)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {n.link && <Link href={n.link} className="text-sm font-medium text-brand-700 hover:underline" onClick={() => !n.readAt && api(`/users/me/notifications/${n.id}/read`, { method: 'POST' })}>Open</Link>}
                  {!n.readAt && <button type="button" className="text-xs text-muted hover:text-ink" onClick={async () => { await api(`/users/me/notifications/${n.id}/read`, { method: 'POST' }); void reload(); }}>Mark read</button>}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
