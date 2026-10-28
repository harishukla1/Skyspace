'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LISTING_STATUS_LABELS, LISTING_TRANSITIONS, formatDateIN, type ListingStatus, type ManagedPropertyDTO, type StatusHistoryDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ListingStatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Alert, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { KpiCard } from '@/components/dashboard/DashboardShell';
import { Price } from '@/components/property/Price';

const OWNER_LABEL: Partial<Record<ListingStatus, string>> = { sold: 'Mark as sold', rented: 'Mark as rented', unavailable: 'Mark unavailable', archived: 'Archive', draft: 'Move back to draft', pending_approval: 'Resubmit for approval' };

export function ManagedListing({ id, basePath }: { id: string; basePath: string }) {
  const { data, loading, error, reload } = useApi<{ property: ManagedPropertyDTO; history: StatusHistoryDTO[] }>(`/owner/properties/${id}`);
  const [confirm, setConfirm] = useState<ListingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  const p = data.property;
  const ownerActions = Object.entries(LISTING_TRANSITIONS[p.status]).filter(([, actors]) => actors?.includes('owner')).map(([s]) => s as ListingStatus).filter((s) => s !== 'pending_approval');
  const canSubmit = ['draft', 'rejected', 'unavailable', 'rented'].includes(p.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={basePath} className="text-sm text-brand-700 hover:underline">‹ My listings</Link>
          <h1 className="mt-1 text-2xl font-semibold">{p.title || 'Untitled draft'}</h1>
          <p className="text-sm text-muted">{p.propertyId} · {[p.locality, p.city].filter(Boolean).join(', ')}</p>
          <div className="mt-2 flex items-center gap-3"><ListingStatusBadge status={p.status} /><Price p={p} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['published', 'sold', 'rented'].includes(p.status) && <LinkButton href={`/property/${p.slug}`} variant="outline" target="_blank">View public page ↗</LinkButton>}
          <LinkButton href={`${basePath}/${p.id}/edit`} variant="outline">Edit</LinkButton>
          {canSubmit && <LinkButton href={`${basePath}/${p.id}/edit`}>Complete & submit</LinkButton>}
        </div>
      </div>
      {p.moderationComment && <Alert tone="error"><strong>Moderator note:</strong> {p.moderationComment}</Alert>}
      {p.status === 'pending_approval' && <Alert>Awaiting review by our moderation team. You’ll be notified of the outcome.</Alert>}

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard label="Views" value={p.stats.views} />
        <KpiCard label="Enquiries" value={p.stats.enquiries} />
        <KpiCard label="Shortlisted" value={p.stats.shortlists} />
        <KpiCard label="Visit requests" value={p.stats.visits} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <h2 className="font-semibold">Photos ({p.images.length})</h2>
          {p.images.length ? (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{p.images.map((i) => <li key={i.id} className="relative aspect-square overflow-hidden rounded-lg"><Image src={i.url} alt={i.altText} fill sizes="120px" className="object-cover" /></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No photos yet. At least one is required to submit.</p>}
          {ownerActions.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h2 className="mb-2 font-semibold">Status actions</h2>
              <div className="flex flex-wrap gap-2">
                {ownerActions.map((s) => <Button key={s} size="sm" variant={s === 'archived' ? 'outline' : 'secondary'} onClick={() => setConfirm(s)}>{OWNER_LABEL[s] ?? LISTING_STATUS_LABELS[s]}</Button>)}
              </div>
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Status history</h2>
          <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
            {data.history.map((h) => (
              <li key={h.id}>
                <p className="font-medium">{LISTING_STATUS_LABELS[h.newStatus as ListingStatus] ?? h.newStatus}</p>
                {h.comment && <p className="text-muted">{h.comment}</p>}
                <p className="text-xs text-muted">{h.changedBy?.name ?? 'System'} · {formatDateIN(h.createdAt, true)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? OWNER_LABEL[confirm] ?? 'Change status' : ''}
        message={confirm === 'archived' ? 'Archived listings are removed from search and cannot be restored without an administrator.' : 'This updates the listing’s public status immediately.'}
        tone={confirm === 'archived' ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/properties/${p.id}/status`, { body: { status: confirm } });
            toast('Status updated');
            setConfirm(null);
            void reload();
          } catch (e) {
            toast((e as Error).message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
