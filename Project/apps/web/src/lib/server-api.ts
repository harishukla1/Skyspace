import 'server-only';
import { SERVER_API } from './config';
import { toApiError } from './api-error';

/** Server Component fetch for public data. No user credentials are forwarded. */
/**
 * `next build` must not depend on a running API. During the build phase we skip the network call;
 * callers already fall back to empty states, and ISR fills the pages with live data at runtime.
 */
const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build' && process.env.BUILD_WITH_API !== 'true';

export async function serverApi<T>(path: string, init: { revalidate?: number | false; tags?: string[] } = {}): Promise<T> {
  if (IS_BUILD) throw Object.assign(new Error('API not fetched during build'), { status: 503 });
  const res = await fetch(`${SERVER_API}${path}`, {
    headers: { accept: 'application/json' },
    ...(init.revalidate === false ? { cache: 'no-store' as const } : { next: { revalidate: init.revalidate ?? 60, tags: init.tags } }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export async function serverApiOrNull<T>(path: string, init: Parameters<typeof serverApi>[1] = {}): Promise<T | null> {
  try {
    return await serverApi<T>(path, init);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}
