import type { ReactNode } from 'react';
import { LEAD_STATUS_LABELS, LISTING_STATUS_LABELS, VISIT_STATUS_LABELS, type LeadStatus, type ListingStatus, type VisitStatus } from '@skyspace/shared';
import { cn } from '@/lib/labels';

type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-brand-50 text-brand-800 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  purple: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}

const listingTone: Record<ListingStatus, Tone> = {
  draft: 'gray', pending_approval: 'amber', approved: 'blue', published: 'green', rejected: 'red', suspended: 'red',
  sold: 'purple', rented: 'purple', unavailable: 'gray', archived: 'gray',
};
export const ListingStatusBadge = ({ status }: { status: ListingStatus }) => <Badge tone={listingTone[status]}>{LISTING_STATUS_LABELS[status]}</Badge>;

const leadTone: Record<LeadStatus, Tone> = {
  new: 'blue', contacted: 'amber', qualified: 'purple', site_visit_scheduled: 'purple', follow_up_required: 'amber', converted: 'green', closed: 'gray', invalid: 'red',
};
export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => <Badge tone={leadTone[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;

const visitTone: Record<VisitStatus, Tone> = {
  pending_confirmation: 'amber', confirmed: 'green', rescheduled: 'blue', rejected: 'red', cancelled: 'gray', completed: 'green', no_show: 'red',
};
export const VisitStatusBadge = ({ status }: { status: VisitStatus }) => <Badge tone={visitTone[status]}>{VISIT_STATUS_LABELS[status]}</Badge>;
