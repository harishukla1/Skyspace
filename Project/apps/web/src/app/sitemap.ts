import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { serverApi } from '@/lib/server-api';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ['', '/buy', '/rent', '/commercial', '/sell', '/cities', '/agents', '/about', '/contact', '/faq', '/privacy', '/terms'].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : 0.7,
  }));
  try {
    const data = await serverApi<{ properties: { slug: string; updatedAt: string }[]; cities: { slug: string; updatedAt: string }[] }>('/content/sitemap', { revalidate: 3600 });
    return [
      ...statics,
      ...data.cities.map((c) => ({ url: `${SITE_URL}/cities/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
      ...data.properties.map((p) => ({ url: `${SITE_URL}/property/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ];
  } catch {
    return statics;
  }
}
