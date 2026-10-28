import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = { title: 'Agent dashboard', robots: { index: false, follow: false } };

const NAV = [
  { href: '/agent', label: 'Dashboard', exact: true },
  { href: '/agent/leads', label: 'My leads' },
  { href: '/agent/site-visits', label: 'Site visits' },
  { href: '/agent/listings', label: 'Assigned listings' },
  { href: '/agent/listings/new', label: 'Add listing', exact: true },
  { href: '/agent/reports', label: 'Performance' },
  { href: '/agent/profile', label: 'Agent profile' },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="Agent" nav={NAV} roles={['agent', 'admin']}>{children}</DashboardShell>;
}
