'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Role } from '@skyspace/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { Logo } from '@/components/layout/Logo';
import { Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/labels';
import { NotificationBell } from './NotificationBell';

export interface NavItem { href: string; label: string; exact?: boolean }

const AREAS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/customer', label: 'My account', roles: ['customer'] },
  { href: '/owner', label: 'Owner', roles: ['owner'] },
  { href: '/agent', label: 'Agent', roles: ['agent'] },
  { href: '/admin', label: 'Admin', roles: ['admin'] },
];

/**
 * Layout for signed-in areas. `roles` hides the area from users who lack them; the API independently rejects
 * their requests, so this is a convenience, not the security boundary.
 */
export function DashboardShell({ title, nav, roles, children }: { title: string; nav: NavItem[]; roles: Role[]; children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?reason=expired&next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return <div className="container-page space-y-4 py-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  }
  const allowed = roles.some((r) => user.roles.includes(r));
  const areas = AREAS.filter((a) => a.roles.some((r) => user.roles.includes(r)));

  const navList = (
    <ul className="space-y-0.5">
      {nav.map((n) => {
        const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link href={n.href} aria-current={active ? 'page' : undefined} className={cn('block rounded-lg px-3 py-2 text-sm font-medium transition', active ? 'bg-brand-600 text-white' : 'text-ink hover:bg-white')}>
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-1.5 lg:hidden" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((v) => !v)}>☰</button>
            <Logo compact />
            <span className="hidden font-display font-semibold sm:inline">{title}</span>
          </div>
          <nav aria-label="Workspaces" className="hidden items-center gap-1 md:flex">
            {areas.map((a) => <Link key={a.href} href={a.href} className={cn('rounded-lg px-3 py-1.5 text-sm', pathname.startsWith(a.href) ? 'bg-brand-50 font-semibold text-brand-800' : 'hover:bg-surface')}>{a.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden text-sm text-muted hover:text-ink sm:inline">View site</Link>
            <NotificationBell />
            <span className="hidden text-sm font-medium sm:inline">{user.name.split(' ')[0]}</span>
            <button type="button" className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface hover:text-ink" onClick={async () => { await logout(); router.push('/'); }}>Sign out</button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={cn('fixed inset-y-14 left-0 z-20 w-64 border-r border-line bg-surface p-4 transition-transform lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')} aria-label={`${title} navigation`}>
          {navList}
          <div className="mt-6 border-t border-line pt-4 md:hidden">
            {areas.map((a) => <Link key={a.href} href={a.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-white">{a.label}</Link>)}
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {allowed ? children : (
            <div className="card mx-auto max-w-lg p-8 text-center">
              <h1 className="text-xl font-semibold">You don’t have access to this area</h1>
              <p className="mt-2 text-sm text-muted">Your account does not include the required role. Contact an administrator if you think this is a mistake.</p>
              <Link href="/" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">Back to home</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? <Link href={href} className="card block p-4 transition hover:border-brand-300">{body}</Link> : <div className="card p-4">{body}</div>;
}
