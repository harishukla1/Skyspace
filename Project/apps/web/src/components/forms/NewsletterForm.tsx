'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('loading');
        try {
          await api('/content/newsletter', { body: { email, consent: true } });
          setState('done');
          setMsg('Subscribed. You can unsubscribe at any time.');
        } catch (err) {
          setState('error');
          setMsg(err instanceof ApiError ? err.message : 'Could not subscribe');
        }
      }}
    >
      <label htmlFor="nl-email" className="sr-only">Email address</label>
      <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none" />
      <button type="submit" disabled={state === 'loading'} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60">Subscribe</button>
      {msg && <p className={`sr-only`} role="status">{msg}</p>}
      {msg && <span className="sr-only" />}
      {state !== 'idle' && state !== 'loading' && <p className="absolute mt-12 text-xs text-white/80" aria-hidden>{msg}</p>}
    </form>
  );
}
