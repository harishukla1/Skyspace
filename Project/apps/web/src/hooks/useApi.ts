'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs, type RequestOpts } from '@/lib/api';

/** Minimal client-side data hook for dashboards: loading / error / data / reload, with request cancellation. */
export function useApi<T>(path: string | null, query?: RequestOpts['query']) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const key = path ? `${path}${qs(query)}` : null;
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!key) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    try {
      const r = await api<T>(key, { signal: c.signal });
      if (!c.signal.aborted) setData(r);
    } catch (e) {
      if (!c.signal.aborted) setError((e as Error).message);
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
    return () => ctrl.current?.abort();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
