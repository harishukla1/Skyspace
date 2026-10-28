'use client';

import Link from 'next/link';
import { formatDateIN } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { toQueryString } from '@/lib/search-params';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Button, LinkButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Saved { id: string; name: string; filters: Record<string, string>; notificationEnabled: boolean; createdAt: string }

export default function SavedSearchesPage() {
  const { data, loading, error, reload } = useApi<{ items: Saved[] }>('/users/me/saved-searches');
  const toast = useToast();
  return (
    <>
      <PageHeader title="Saved searches" description="Re-run searches you saved from the results page." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? (
        <EmptyState title="No saved searches" description="Use “Save search” on any results page." action={<LinkButton href="/search">Start a search</LinkButton>} icon="🔎" />
      ) : (
        <ul className="space-y-3">
          {data.items.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/search?${toQueryString(s.filters)}`} className="font-medium hover:text-brand-700">{s.name}</Link>
                <p className="text-xs text-muted">Saved {formatDateIN(s.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={s.notificationEnabled}
                    onChange={async (e) => {
                      await api(`/users/me/saved-searches/${s.id}`, { method: 'PATCH', body: { notificationEnabled: e.target.checked } });
                      toast(e.target.checked ? 'Alerts preference saved' : 'Alerts turned off');
                      void reload();
                    }}
                  />
                  Alert me about new matches
                </label>
                <LinkButton href={`/search?${toQueryString(s.filters)}`} size="sm" variant="outline">Run</LinkButton>
                <Button size="sm" variant="ghost" onClick={async () => { await api(`/users/me/saved-searches/${s.id}`, { method: 'DELETE' }); toast('Search deleted'); void reload(); }}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">New-match alerts are stored as a preference. Delivery requires a configured email provider and the alert job (see docs/deployment.md).</p>
    </>
  );
}
