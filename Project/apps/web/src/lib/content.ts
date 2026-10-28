import type { SiteContentDTO } from '@skyspace/shared';
import { serverApi } from './server-api';

export async function getSiteContent(): Promise<SiteContentDTO | null> {
  try {
    return await serverApi<SiteContentDTO>('/content/site', { revalidate: 120 });
  } catch {
    return null;
  }
}
