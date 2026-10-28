import 'server-only';
import { SERVER_API } from './config';
import { toApiError } from './api-error';

/** Server Component fetch for public data. No user credentials are forwarded. */
export async function serverApi<T>(path: string, init: { revalidate?: number | false; tags?: string[] } = {}): Promise<T> {
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
