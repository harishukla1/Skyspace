'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  VISIT_STATUSES, VISIT_STATUS_LABELS, VISIT_TIME_SLOTS, VISIT_TRANSITIONS, displayPhone, formatDateIN, istToday,
  type Paginated, type SiteVisitDTO, type VisitStatus,
} from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { VisitStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';

const ACTION_LABEL: Partial<Record<VisitStatus, string>> = { confirmed: 'Confirm', rejected: 'Reject', cancelled: 'Cancel visit', completed: 'Mark completed', no_show: 'Mark no-show' };

/** Shared site-visit list for customers (own requests) and managers (owner / agent / admin). */
export function VisitManager({ endpoint, perspective }: { endpoint: string; perspective: 'customer' | 'manager' }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [upcoming, setUpcoming] = useState(perspective === 'manager');
  const { data, loading, error, reload } = useApi<Paginated<SiteVisitDTO>>(endpoint, { page, status, upcoming: upcoming || undefined });
  const [action, setAction] = useState<{ v: SiteVisitDTO; to: VisitStatus | 'reschedule' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const actor = perspective === 'customer' ? 'customer' : 'manager';

  const run = async (form?: FormData) => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.to === 'reschedule') {
        await api(`/site-visits/${action.v.id}/reschedule`, { method: 'PATCH', body: { date: form?.get('date'), timeSlot: form?.get('timeSlot'), note: note || undefined } });
      } else {
        await api(`/site-visits/${action.v.id}/status`, { method: 'PATCH', body: { status: action.to, note: note || undefined } });
      }
      toast('Visit updated');
      setAction(null);
      setNote('');
      void reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} wrapClassName="w-56">
          <option value="">All statuses</option>
          {VISIT_STATUSES.map((s) => <option key={s} value={s}>{VISIT_STATUS_LABELS[s]}</option>)}
        </Select>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={upcoming} onChange={(e) => { setUpcoming(e.target.checked); setPage(1); }} /> Upcoming only</label>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? <EmptyState title="No site visits" icon="📅" /> : (
        <>
          <ul className="space-y-3">
            {data.items.map((v) => {
              const allowed = Object.entries(VISIT_TRANSITIONS[v.status] ?? {}).filter(([, actors]) => actors?.includes(actor)).map(([s]) => s as VisitStatus);
              const isPast = new Date(v.scheduledAt) < new Date();
              const actions = allowed.filter((s) => (['completed', 'no_show'].includes(s) ? isPast : s === 'confirmed' ? !isPast : true));
              const canReschedule = ['pending_confirmation', 'confirmed', 'rescheduled'].includes(v.status);
              return (
                <li key={v.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/property/${v.property.slug}`} className="font-medium hover:text-brand-700">{v.property.title}</Link>
                      <p className="text-sm text-muted">{v.property.propertyId} · {v.property.locality}, {v.property.city}</p>
                      <p className="mt-1 text-sm font-medium">{formatDateIN(v.scheduledAt, true)} IST</p>
                      {perspective === 'manager' && (
                        <p className="mt-1 text-sm">{v.name} · <a href={`tel:${v.phone}`} className="text-brand-700">{displayPhone(v.phone)}</a> · <a href={`mailto:${v.email}`} className="text-brand-700">{v.email}</a></p>
                      )}
                      {v.message && <p className="mt-1 text-sm text-muted">“{v.message}”</p>}
                      {v.notes.length > 0 && <p className="mt-1 text-xs text-muted">Latest note: {v.notes.at(-1)!.note}</p>}
                    </div>
                    <VisitStatusBadge status={v.status} />
                  </div>
                  {(actions.length > 0 || canReschedule) && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      {actions.map((s) => (
                        <Button key={s} size="sm" variant={s === 'confirmed' || s === 'completed' ? 'primary' : s === 'rejected' || s === 'cancelled' ? 'outline' : 'secondary'} onClick={() => setAction({ v, to: s })}>
                          {v.status === 'rescheduled' && s === 'confirmed' ? 'Accept new time' : ACTION_LABEL[s] ?? s}
                        </Button>
                      ))}
                      {canReschedule && <Button size="sm" variant="ghost" onClick={() => setAction({ v, to: 'reschedule' })}>Propose another time</Button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
      <Modal open={!!action} onClose={() => setAction(null)} title={action?.to === 'reschedule' ? 'Propose a new time' : `${ACTION_LABEL[action?.to as VisitStatus] ?? 'Update'} visit`}>
        <form
          id="visit-action"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(new FormData(e.currentTarget));
          }}
        >
          {action?.to === 'reschedule' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date" name="date" type="date" min={istToday()} required />
              <Select label="Time (IST)" name="timeSlot" required>{VISIT_TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
            </div>
          )}
          <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAction(null)}>Close</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
