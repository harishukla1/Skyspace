'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LISTING_STATUSES, LISTING_STATUS_LABELS, formatDateIN, type PropertySummaryDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { AdminTable } from './AdminTable';
import { ListingStatusBadge, Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Price } from '@/components/property/Price';

type Row = PropertySummaryDTO & { owner?: { name: string; email: string }; agent?: { name: string }; submittedAt?: string; updatedAt?: string };

export function PropertyAdmin({ fixedStatus, featuredOnly, initialStatus = '' }: { fixedStatus?: string; featuredOnly?: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(fixedStatus ?? initialStatus);
  const [tx, setTx] = useState('');
  const [category, setCategory] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();
  return (
    <AdminTable<Row>
      endpoint="/admin/properties"
      searchPlaceholder="Title or SSR ID"
      reloadKey={reloadKey}
      query={{ status: status || undefined, transactionType: tx || undefined, category: category || undefined, featured: featuredOnly ? 'true' : undefined }}
      empty={fixedStatus === 'pending_approval' ? 'No listings awaiting approval 🎉' : 'No listings found'}
      filters={
        <>
          {!fixedStatus && (
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} wrapClassName="w-48">
              <option value="">All statuses</option>
              {LISTING_STATUSES.map((s) => <option key={s} value={s}>{LISTING_STATUS_LABELS[s]}</option>)}
            </Select>
          )}
          <Select label="Transaction" value={tx} onChange={(e) => setTx(e.target.value)} wrapClassName="w-36"><option value="">Any</option><option value="sale">Sale</option><option value="rent">Rent</option></Select>
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} wrapClassName="w-40"><option value="">Any</option><option value="residential">Residential</option><option value="commercial">Commercial</option></Select>
        </>
      }
      columns={[
        { key: 't', header: 'Listing', cell: (r) => <Link href={`/admin/properties/${r.id}`} className="font-medium hover:text-brand-700">{r.title || 'Untitled'}<span className="block text-xs font-normal text-muted">{r.propertyId} · {[r.locality, r.city].filter(Boolean).join(', ')}</span></Link> },
        { key: 'p', header: 'Price', cell: (r) => <Price p={r} /> },
        { key: 'o', header: 'Owner / agent', cell: (r) => <span>{r.owner?.name}<span className="block text-xs text-muted">{r.agent ? `Agent: ${r.agent.name}` : 'No agent'}</span></span> },
        { key: 's', header: 'Status', cell: (r) => <span className="flex flex-wrap gap-1"><ListingStatusBadge status={r.status} />{r.featured && <Badge tone="amber">Featured</Badge>}{r.verificationStatus === 'verified' && <Badge tone="green">Verified</Badge>}</span> },
        { key: 'd', header: fixedStatus === 'pending_approval' ? 'Submitted' : 'Updated', cell: (r) => formatDateIN(fixedStatus === 'pending_approval' ? r.submittedAt : r.updatedAt) },
        ...(featuredOnly ? [{ key: 'f', header: '', cell: (r: Row) => <Button size="sm" variant="outline" onClick={async () => { await api(`/admin/properties/${r.id}/feature`, { method: 'PATCH', body: { featured: false } }); toast('Removed from featured'); setReloadKey((k) => k + 1); }}>Unfeature</Button> }] : []),
      ]}
    />
  );
}
