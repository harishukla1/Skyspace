'use client';

import { useMemo, useState } from 'react';
import { LEAD_STATUS_LABELS, VISIT_STATUS_LABELS, type LeadStatus, type VisitStatus } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { KpiCard } from '@/components/dashboard/DashboardShell';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { propertyTypeLabel, humanize } from '@/lib/labels';
import { BarList, TrendChart } from './Charts';

interface Dash {
  range: { from: string; to: string; granularity: string };
  kpis: Record<'totalUsers' | 'totalAgents' | 'totalProperties' | 'published' | 'pending' | 'sold' | 'rented' | 'newEnquiries' | 'openLeads' | 'upcomingVisits', number>;
  charts: Record<'byCity' | 'byTransactionType' | 'byCategory' | 'byPropertyType' | 'leadStatus' | 'visitStatus', { key: string; count: number }[]> & { listingsOverTime: { date: string; count: number }[]; enquiriesOverTime: { date: string; count: number }[] };
  conversion: { leads: number; converted: number; rate: number | null };
}

const RANGES = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last 12 months']] as const;

export function DashboardView({ defaultDays = '90', full = false }: { defaultDays?: string; full?: boolean }) {
  const [days, setDays] = useState(defaultDays);
  // Memoised so the request key is stable between renders.
  const from = useMemo(() => new Date(Date.now() - Number(days) * 86_400_000).toISOString(), [days]);
  const { data, loading, error, reload } = useApi<Dash>('/admin/dashboard', { from });
  const kv = (rows: { key: string; count: number }[], label: (k: string) => string = (k) => k) => rows.map((r) => ({ label: label(r.key), value: r.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {RANGES.map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={days === v} onClick={() => setDays(v)}>{l}</button>)}
        <span className="ml-auto text-xs text-muted">Live figures from the database. Trend charts use the selected range; KPIs are current totals.</span>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <TableSkeleton /> : (
        <div className={loading ? 'opacity-60 transition' : 'transition'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Total users" value={data.kpis.totalUsers.toLocaleString('en-IN')} href="/admin/users" />
            <KpiCard label="Active agents" value={data.kpis.totalAgents} href="/admin/agents" />
            <KpiCard label="Total properties" value={data.kpis.totalProperties.toLocaleString('en-IN')} hint="Excludes archived" href="/admin/properties" />
            <KpiCard label="Published" value={data.kpis.published.toLocaleString('en-IN')} href="/admin/properties?status=published" />
            <KpiCard label="Pending approval" value={data.kpis.pending} href="/admin/approvals" />
            <KpiCard label="Sold" value={data.kpis.sold} />
            <KpiCard label="Rented" value={data.kpis.rented} />
            <KpiCard label="New enquiries" value={data.kpis.newEnquiries} href="/admin/enquiries" />
            <KpiCard label="Open leads" value={data.kpis.openLeads} href="/admin/enquiries" />
            <KpiCard label="Upcoming visits" value={data.kpis.upcomingVisits} href="/admin/site-visits" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TrendChart title="New listings" data={data.charts.listingsOverTime} granularity={data.range.granularity} />
            <TrendChart title="Enquiries received" data={data.charts.enquiriesOverTime} granularity={data.range.granularity} />
            <BarList title="Published listings by city" data={kv(data.charts.byCity)} />
            <BarList title="Published listings by type" data={kv(data.charts.byPropertyType, propertyTypeLabel)} />
            {full && <BarList title="By transaction type" data={kv(data.charts.byTransactionType, (k) => (k === 'rent' ? 'Rent' : 'Sale'))} />}
            {full && <BarList title="By category" data={kv(data.charts.byCategory, humanize)} />}
            <BarList title="Leads by status (in range)" data={kv(data.charts.leadStatus, (k) => LEAD_STATUS_LABELS[k as LeadStatus] ?? k)} />
            <BarList title="Site visits by status (in range)" data={kv(data.charts.visitStatus, (k) => VISIT_STATUS_LABELS[k as VisitStatus] ?? k)} />
          </div>
          <div className="card mt-6 p-5">
            <p className="text-sm text-muted">Lead conversion rate (selected range)</p>
            <p className="mt-1 font-display text-3xl font-semibold">{data.conversion.rate === null ? '—' : `${data.conversion.rate}%`}</p>
            <p className="text-xs text-muted">{data.conversion.converted} converted of {data.conversion.leads} leads{data.conversion.rate === null ? ' · shown once there are at least 10 leads in range' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
