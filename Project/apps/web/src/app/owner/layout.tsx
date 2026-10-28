import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = { title: 'Owner dashboard', robots: { index: false, follow: false } };

const NAV = [
  { href: '/owner', label: 'Dashboard', exact: true },
  { href: '/owner/listings', label: 'My listings' },
  { href: '/owner/listings/new', label: 'Add property', exact: true },
  { href: '/owner/approval-status', label: 'Approval status' },
  { href: '/owner/enquiries', label: 'Property enquiries' },
  { href: '/owner/site-visits', label: 'Site visits' },
  { href: '/owner/reports', label: 'Listing performance' },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="Owner" nav={NAV} roles={['owner', 'agent', 'admin']}>{children}</DashboardShell>;
}
