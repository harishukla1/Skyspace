'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => api<{ unread: number }>('/users/me/notifications', { query: { limit: 1 } }).then((r) => alive && setUnread(r.unread)).catch(() => undefined);
    void load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return (
    <Link href="/customer/notifications" className="relative rounded-lg p-1.5 hover:bg-surface" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
    </Link>
  );
}
