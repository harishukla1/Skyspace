'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { useShortlist } from '@/features/shortlist/ShortlistProvider';
import { useToast } from '@/components/ui/Toast';

export function ShortlistButton({ propertyId, withLabel = false }: { propertyId: string; withLabel?: boolean }) {
  const { user } = useAuth();
  const { ids, toggle } = useShortlist();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const active = ids.has(propertyId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remove from shortlist' : 'Add to shortlist'}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        setBusy(true);
        try {
          if (active) await api(`/users/me/shortlist/${propertyId}`, { method: 'DELETE' });
          else await api(`/users/me/shortlist/${propertyId}`, { method: 'POST' });
          toggle(propertyId, !active);
          toast(active ? 'Removed from shortlist' : 'Added to shortlist');
        } catch (err) {
          toast((err as Error).message, 'error');
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 p-2 shadow ring-1 ring-line transition hover:scale-105 ${active ? 'text-red-600' : 'text-ink'} ${withLabel ? 'px-4' : ''}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {withLabel && <span className="text-sm font-medium">{active ? 'Shortlisted' : 'Shortlist'}</span>}
    </button>
  );
}
