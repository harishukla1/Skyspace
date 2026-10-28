import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/approvals', label: 'Listing approvals' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/featured', label: 'Featured listings' },
  { href: '/admin/enquiries', label: 'Enquiries & leads' },
  { href: '/admin/site-visits', label: 'Site visits' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/roles', label: 'Roles & permissions' },
  { href: '/admin/categories', label: 'Property categories' },
  { href: '/admin/cities', label: 'Cities & localities' },
  { href: '/admin/content', label: 'Homepage & content' },
  { href: '/admin/analytics', label: 'Reports & analytics' },
  { href: '/admin/complaints', label: 'Complaints & moderation' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
  { href: '/admin/settings', label: 'Platform settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell title="Admin" nav={NAV} roles={['admin']}>{children}</DashboardShell>;
}
