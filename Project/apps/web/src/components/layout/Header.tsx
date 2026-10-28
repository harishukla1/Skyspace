'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { buttonClass } from '@/components/ui/Button';
import { homeFor, useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/labels';

const NAV = [
  { href: '/buy', label: 'Buy' },
  { href: '/rent', label: 'Rent' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/cities', label: 'Cities' },
  { href: '/agents', label: 'Agents' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn('rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-surface hover:text-brand-700', pathname.startsWith(n.href) ? 'text-brand-700' : 'text-ink')}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/sell" className={buttonClass('secondary', 'md')}>
            Post Property <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Free</span>
          </Link>
          {loading ? (
            <span className="h-10 w-24" />
          ) : user ? (
            <>
              <Link href={homeFor(user)} className={buttonClass('outline')}>My Dashboard</Link>
              <button type="button" className={buttonClass('ghost')} onClick={async () => { await logout(); router.push('/'); }}>Sign out</button>
            </>
          ) : (
            <Link href="/login" className={buttonClass('primary')}>Sign in</Link>
          )}
        </div>
        <button type="button" className="rounded-lg p-2 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-surface">{n.label}</Link>)}
            <Link href="/sell" className="rounded-lg px-3 py-2.5 font-medium text-brand-700 hover:bg-surface">Post Property (Free)</Link>
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              {user ? (
                <>
                  <Link href={homeFor(user)} className={buttonClass('primary', 'md', 'flex-1')}>My Dashboard</Link>
                  <button type="button" className={buttonClass('outline', 'md', 'flex-1')} onClick={async () => { await logout(); router.push('/'); }}>Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className={buttonClass('primary', 'md', 'flex-1')}>Sign in</Link>
                  <Link href="/register" className={buttonClass('outline', 'md', 'flex-1')}>Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
