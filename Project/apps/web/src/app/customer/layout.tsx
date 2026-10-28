import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

const NAV = [
  { href: '/customer', label: 'Dashboard', exact: true },
  { href: '/customer/shortlist', label: 'Shortlisted properties' },
  { href: '/customer/saved-searches', label: 'Saved searches' },
  { href: '/customer/enquiries', label: 'My enquiries' },
  { href: '/customer/site-visits', label: 'My site visits' },
  { href: '/customer/notifications', label: 'Notifications' },
  { href: '/customer/profile', label: 'My profile' },
  { href: '/customer/settings', label: 'Account settings' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="My account" nav={NAV} roles={['customer', 'owner', 'agent', 'admin']}>{children}</DashboardShell>;
}
