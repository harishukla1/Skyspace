'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Single-series charts in the brand hue; categories are carried by axis labels, never colour alone. Every chart has a table view. */
const BRAND = '#0c84b8';
const GRID = '#e3e9ed';
const INK_MUTED = '#5b6b76';
const axis = { fontSize: 12, fill: INK_MUTED };

function ChartCard({ title, rows, children, empty }: { title: string; rows: { label: string; value: number }[]; children: React.ReactNode; empty?: boolean }) {
  const [table, setTable] = useState(false);
  return (
    <figure className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <figcaption className="font-semibold">{title}</figcaption>
        {!empty && <button type="button" className="text-xs font-medium text-brand-700 hover:underline" aria-pressed={table} onClick={() => setTable((t) => !t)}>{table ? 'Show chart' : 'Show table'}</button>}
      </div>
      {empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-muted">No data in this period</p>
      ) : table ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1.5 font-medium">Item</th><th className="py-1.5 text-right font-medium">Count</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.label} className="border-b border-line/60"><td className="py-1.5">{r.label}</td><td className="py-1.5 text-right tabular-nums">{r.value.toLocaleString('en-IN')}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </figure>
  );
}

const TooltipBox = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) =>
  active && payload?.length ? (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow">
      <p className="text-muted">{label}</p>
      <p className="font-semibold text-ink tabular-nums">{payload[0]!.value.toLocaleString('en-IN')}</p>
    </div>
  ) : null;

export function TrendChart({ title, data, granularity }: { title: string; data: { date: string; count: number }[]; granularity: string }) {
  const fmt = (d: string) => new Intl.DateTimeFormat('en-IN', granularity === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).format(new Date(d));
  const rows = data.map((d) => ({ label: fmt(d.date), value: d.count }));
  return (
    <ChartCard title={title} rows={rows} empty={!data.length}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: INK_MUTED, strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} dot={rows.length < 20 ? { r: 4, fill: BRAND, stroke: '#fff', strokeWidth: 2 } : false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BarList({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  return (
    <ChartCard title={title} rows={data} empty={!data.length}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap={4}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={axis} tickLine={false} axisLine={false} width={120} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: '#eef8fc' }} />
          <Bar dataKey="value" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', fontSize: 11, fill: INK_MUTED }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
