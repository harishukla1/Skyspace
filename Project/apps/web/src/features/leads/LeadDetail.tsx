'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LEAD_STATUS_LABELS, LEAD_TRANSITIONS, displayPhone, formatDateIN, type EnquiryDTO, type LeadStatus, type Paginated, type UserDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { LeadStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { humanize } from '@/lib/labels';

export function LeadDetail({ id, backHref }: { id: string; backHref: string }) {
  const { data, loading, error, reload, setData } = useApi<{ enquiry: EnquiryDTO }>(`/enquiries/${id}`);
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const agents = useApi<Paginated<UserDTO>>(isAdmin ? '/admin/agents' : null, { limit: 50 });
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton rows={4} />;
  const e = data.enquiry;
  const next = LEAD_TRANSITIONS[e.status];

  const save = async (path: string, method: 'PATCH' | 'POST', body: unknown, msg: string) => {
    setBusy(true);
    try {
      const r = await api<{ enquiry: EnquiryDTO }>(path, { method, body });
      setData(r);
      toast(msg);
      return true;
    } catch (err) {
      toast((err as Error).message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={backHref} className="text-sm text-brand-700 hover:underline">‹ All leads</Link>
              <h1 className="mt-1 text-2xl font-semibold">{e.name}</h1>
              <p className="text-sm text-muted">Received {formatDateIN(e.createdAt, true)} · via {humanize(e.source)} · {humanize(e.enquiryType)}</p>
            </div>
            <LeadStatusBadge status={e.status} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Phone</dt><dd><a className="font-medium text-brand-700" href={`tel:${e.phone}`}>{displayPhone(e.phone)}</a></dd></div>
            <div><dt className="text-muted">Email</dt><dd><a className="font-medium text-brand-700" href={`mailto:${e.email}`}>{e.email}</a></dd></div>
            <div><dt className="text-muted">Prefers</dt><dd>{humanize(e.preferredContact)}</dd></div>
            {e.property && <div className="sm:col-span-3"><dt className="text-muted">Property</dt><dd><Link className="font-medium hover:text-brand-700" href={`/property/${e.property.slug}`}>{e.property.propertyId} — {e.property.title}</Link></dd></div>}
          </dl>
          <blockquote className="mt-4 rounded-xl bg-surface p-4 text-sm">{e.message}</blockquote>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Follow-up notes</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={async (ev) => {
              ev.preventDefault();
              const form = ev.currentTarget;
              const fd = new FormData(form);
              const followUp = String(fd.get('followUpAt') || '');
              if (await save(`/enquiries/${id}/notes`, 'POST', { note: fd.get('note'), followUpAt: followUp ? new Date(followUp).toISOString() : undefined }, 'Note added')) form.reset();
            }}
          >
            <Textarea label="Add a note" name="note" rows={3} required />
            <Input label="Next follow-up (optional)" name="followUpAt" type="datetime-local" wrapClassName="max-w-xs" />
            <Button type="submit" size="sm" loading={busy}>Add note</Button>
          </form>
          <ol className="mt-6 space-y-3 border-l-2 border-line pl-4">
            {[...e.notes].reverse().map((n, i) => (
              <li key={i} className="text-sm">
                <p>{n.note}</p>
                <p className="text-xs text-muted">{n.by?.name ?? 'System'} · {formatDateIN(n.createdAt, true)}</p>
              </li>
            ))}
            {!e.notes.length && <li className="text-sm text-muted">No notes yet.</li>}
          </ol>
        </div>
      </div>

      <aside className="space-y-6">
        <form
          className="card space-y-3 p-5"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            const followUp = String(fd.get('followUpAt') || '');
            await save(`/enquiries/${id}/status`, 'PATCH', { status: fd.get('status'), note: fd.get('note') || undefined, followUpAt: followUp ? new Date(followUp).toISOString() : undefined }, 'Lead updated');
          }}
        >
          <h2 className="font-semibold">Update status</h2>
          {next.length ? (
            <>
              <Select label="New status" name="status" defaultValue={next[0]}>
                {next.map((s: LeadStatus) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
              </Select>
              <Input label="Follow-up date" name="followUpAt" type="datetime-local" hint="Required for “Follow-up required”" />
              <Textarea label="Note" name="note" rows={2} />
              <Button type="submit" className="w-full" loading={busy}>Update</Button>
            </>
          ) : <p className="text-sm text-muted">This lead is in a final state.</p>}
          {e.followUpAt && <p className="text-xs text-muted">Current follow-up: {formatDateIN(e.followUpAt, true)}</p>}
        </form>

        {isAdmin && (
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">Assignment</h2>
            <Select
              label="Assigned agent"
              value={e.assignedAgent?.id ?? ''}
              onChange={(ev) => save(`/enquiries/${id}/assignment`, 'PATCH', { agentId: ev.target.value || null }, 'Assignment updated')}
            >
              <option value="">Unassigned</option>
              {agents.data?.items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
        )}

        <div className="card p-5">
          <h2 className="font-semibold">History</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {[...e.history].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{h.from && h.from !== h.to ? `${LEAD_STATUS_LABELS[h.from as LeadStatus]} → ` : ''}{LEAD_STATUS_LABELS[h.to as LeadStatus]}</span>
                <span className="text-xs text-muted">{formatDateIN(h.at, true)}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
