import type { Metadata } from 'next';
import { getSiteContent } from '@/lib/content';
import { StaticPage } from '@/components/layout/StaticPage';

export async function generateMetadata(): Promise<Metadata> {
  const page = (await getSiteContent())?.pages.about;
  return { title: page?.seoTitle ?? page?.title ?? 'About us', description: page?.seoDescription, alternates: { canonical: '/about' } };
}

export default async function Page() {
  const page = (await getSiteContent())?.pages.about;
  return <StaticPage title={page?.title ?? 'About us'} body={page?.body} crumb="About us" />;
}
