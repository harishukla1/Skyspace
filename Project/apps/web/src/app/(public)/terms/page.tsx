import type { Metadata } from 'next';
import { getSiteContent } from '@/lib/content';
import { StaticPage } from '@/components/layout/StaticPage';

export async function generateMetadata(): Promise<Metadata> {
  const page = (await getSiteContent())?.pages.terms;
  return { title: page?.seoTitle ?? page?.title ?? 'Terms and conditions', description: page?.seoDescription, alternates: { canonical: '/terms' } };
}

export default async function Page() {
  const page = (await getSiteContent())?.pages.terms;
  return <StaticPage title={page?.title ?? 'Terms and conditions'} body={page?.body} crumb="Terms and conditions" />;
}
