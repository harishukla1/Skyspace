'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useState } from 'react';
import {
  LISTING_STATUS_LABELS, LISTING_TRANSITIONS, VERIFICATION_STATUSES, displayPhone, formatDateIN, type ListingStatus, type ManagedPropertyDTO, type Paginated, type UserDTO,
} from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { ListingStatusBadge, Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Alert, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Price } from '@/components/property/Price';
import { humanize, propertyTypeLabel } from '@/lib/labels';

interface Detail {
  property: ManagedPropertyDTO;
  owner?: { id: string; name: string; email: string; phone: string; status: string };
  history: { id: string; previousStatus?: string; newStatus: string; comment?: string; changedBy?: { name: string }; createdAt: string }[];
  reports: { id: string; reason: string; details?: string; status: string; createdAt: string }[];
}

const NEEDS_REASON: ListingStatus[] = ['rejected', 'suspended'];

export default function AdminPropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<Detail>(`/admin/properties/${id}`);
  const agents = useApi<Paginated<UserDTO>>('/admin/agents', { limit: 50 });
  const toast = useToast();
  const [action, setAction] = useState<ListingStatus | 'approve' | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  const p = data.property;
  const isOwnListing = p.ownerId === user?.id;
  const transitions = Object.keys(LISTING_TRANSITIONS[p.status]).filter((s) => !['pending_approval', 'approved'].includes(s)) as ListingStatus[];

  const call = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      setAction(null);
      setComment('');
      void reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const runAction = () => {
    if (!action) return;
    if (action === 'approve') return call(() => api(`/admin/properties/${id}/approve`, { body: { comment: comment || undefined } }), 'Listing approved');
    if (action === 'rejected') return call(() => api(`/admin/properties/${id}/reject`, { body: { comment } }), 'Listing rejected');
    if (action === 'suspended') return call(() => api(`/admin/properties/${id}/suspend`, { body: { comment } }), 'Listing suspended');
    return call(() => api(`/admin/properties/${id}/status`, { body: { status: action, comment: comment || undefined } }), 'Status updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/properties" className="text-sm text-brand-700 hover:underline">‹ Properties</Link>
          <h1 className="mt-1 text-2xl font-semibold">{p.title || 'Untitled'}</h1>
          <p className="text-sm text-muted">{p.propertyId} · {propertyTypeLabel(p.propertyType)} · {p.transactionType === 'rent' ? 'Rent' : 'Sale'} · {[p.address, p.locality, p.city, p.state, p.pinCode].filter(Boolean).join(', ')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ListingStatusBadge status={p.status} />{p.featured && <Badge tone="amber">Featured</Badge>}<Badge tone={p.verificationStatus === 'verified' ? 'green' : 'gray'}>{humanize(p.verificationStatus)}</Badge><Price p={p} /></div>
        </div>
        {['published', 'sold', 'rented'].includes(p.status) && <LinkButton href={`/property/${p.slug}`} variant="outline" target="_blank">Public page ↗</LinkButton>}
      </div>

      {p.status === 'pending_approval' && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm">This listing is awaiting moderation.</p>
          {isOwnListing ? <Alert tone="warning">You own this listing, so another administrator must review it.</Alert> : (
            <div className="flex gap-2">
              <Button onClick={() => setAction('approve')}>Approve & publish</Button>
              <Button variant="danger" onClick={() => setAction('rejected')}>Reject</Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Photos ({p.images.length})</h2>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{p.images.map((i) => <li key={i.id} className="relative aspect-square overflow-hidden rounded-lg"><Image src={i.url} alt={i.altText} fill sizes="150px" className="object-cover" /></li>)}</ul>
            <h2 className="mt-5 font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm">{p.description || '—'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[['Bedrooms', p.bedrooms], ['Bathrooms', p.bathrooms], ['Carpet', p.carpetArea], ['Built-up', p.builtUpArea], ['Plot', p.plotArea], ['RERA', p.reraNumber], ['Listed by', p.listedBy], ['Show contact', p.showContactDetails ? 'Yes' : 'No'], ['Hide exact location', p.hideExactLocation ? 'Yes' : 'No']]
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => <div key={String(k)} className="rounded-lg bg-surface p-2"><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{String(v)}</dd></div>)}
            </dl>
          </div>
          {data.reports.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold">Reports against this listing ({data.reports.length})</h2>
              <ul className="mt-3 divide-y divide-line text-sm">{data.reports.map((r) => <li key={r.id} className="py-2"><Badge tone={r.status === 'open' ? 'red' : 'gray'}>{humanize(r.status)}</Badge> <strong>{humanize(r.reason)}</strong> — {r.details ?? 'No details'} <span className="text-xs text-muted">({formatDateIN(r.createdAt)})</span></li>)}</ul>
              <Link href="/admin/complaints" className="mt-2 inline-block text-sm text-brand-700 hover:underline">Manage complaints →</Link>
            </div>
          )}
          <div className="card p-5">
            <h2 className="font-semibold">Status history</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
              {data.history.map((h) => (
                <li key={h.id}>
                  <p className="font-medium">{h.previousStatus ? `${LISTING_STATUS_LABELS[h.previousStatus as ListingStatus] ?? h.previousStatus} → ` : ''}{LISTING_STATUS_LABELS[h.newStatus as ListingStatus] ?? h.newStatus}</p>
                  {h.comment && <p className="text-muted">{h.comment}</p>}
                  <p className="text-xs text-muted">{h.changedBy?.name ?? 'System'} · {formatDateIN(h.createdAt, true)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-5">
          {data.owner && (
            <div className="card p-5 text-sm">
              <h2 className="font-semibold">Owner</h2>
              <p className="mt-2"><Link href={`/admin/users/${data.owner.id}`} className="font-medium hover:text-brand-700">{data.owner.name}</Link></p>
              <p className="text-muted">{data.owner.email}</p>
              <p className="text-muted">{displayPhone(data.owner.phone)}</p>
              {data.owner.status !== 'active' && <Badge tone="red">{humanize(data.owner.status)}</Badge>}
            </div>
          )}
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">Moderation</h2>
            <div className="flex flex-wrap gap-2">
              {transitions.map((s) => <Button key={s} size="sm" variant={NEEDS_REASON.includes(s) || s === 'archived' ? 'outline' : 'secondary'} onClick={() => setAction(s)}>{LISTING_STATUS_LABELS[s]}</Button>)}
            </div>
            {p.status === 'published' && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => call(() => api(`/admin/properties/${id}/feature`, { method: 'PATCH', body: { featured: !p.featured } }), p.featured ? 'Removed from featured' : 'Featured on homepage')}>
                {p.featured ? 'Remove from featured' : 'Feature on homepage'}
              </Button>
            )}
          </div>
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">Verification</h2>
            <p className="text-xs text-muted">Mark “Verified” only after documents or a physical inspection have been checked.</p>
            <Select label="Verification status" value={p.verificationStatus} onChange={(e) => call(() => api(`/admin/properties/${id}/verification`, { method: 'PATCH', body: { verificationStatus: e.target.value } }), 'Verification updated')}>
              {VERIFICATION_STATUSES.map((v) => <option key={v} value={v}>{humanize(v)}</option>)}
            </Select>
          </div>
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">Assigned agent</h2>
            <Select label="Agent" value={p.agentId ?? ''} onChange={(e) => call(() => api(`/admin/properties/${id}/agent`, { method: 'PATCH', body: { agentId: e.target.value || null } }), 'Agent updated')}>
              <option value="">No agent (owner managed)</option>
              {agents.data?.items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <div className="card p-5 text-sm">
            <h2 className="font-semibold">Stats</h2>
            <p className="mt-2 text-muted">{p.stats.views} views · {p.stats.enquiries} enquiries · {p.stats.shortlists} shortlists · {p.stats.visits} visit requests</p>
          </div>
        </aside>
      </div>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action === 'approve' ? 'Approve listing' : `Change status to ${action ? LISTING_STATUS_LABELS[action as ListingStatus] : ''}`}
        footer={<><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button loading={busy} variant={action && NEEDS_REASON.includes(action as ListingStatus) ? 'danger' : 'primary'} disabled={!!action && NEEDS_REASON.includes(action as ListingStatus) && comment.trim().length < 5} onClick={runAction}>Confirm</Button></>}
      >
        <Textarea
          label={action && NEEDS_REASON.includes(action as ListingStatus) ? 'Reason (sent to the owner)' : 'Comment (optional, sent to the owner)'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required={!!action && NEEDS_REASON.includes(action as ListingStatus)}
          rows={4}
        />
      </Modal>
    </div>
  );
}
