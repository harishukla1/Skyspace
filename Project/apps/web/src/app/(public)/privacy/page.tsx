import type { Metadata } from 'next';
import { getSiteContent } from '@/lib/content';
import { StaticPage } from '@/components/layout/StaticPage';

export async function generateMetadata(): Promise<Metadata> {
  const page = (await getSiteContent())?.pages.privacy;
  return { title: page?.seoTitle ?? page?.title ?? 'Privacy policy', description: page?.seoDescription, alternates: { canonical: '/privacy' } };
}

export default async function Page() {
  const page = (await getSiteContent())?.pages.privacy;
  return <StaticPage title={page?.title ?? 'Privacy policy'} body={page?.body} crumb="Privacy policy" />;
}
