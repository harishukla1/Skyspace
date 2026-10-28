import type { Metadata } from 'next';
import { SearchView } from '@/components/search/SearchView';
import { parseSearch, type RawParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Commercial property — offices, shops & warehouses',
  description: 'Rent or buy office space, retail shops, showrooms, warehouses, co-working and commercial plots.',
  alternates: { canonical: '/commercial' },
};

export default async function CommercialPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return (
    <SearchView
      search={parseSearch(await searchParams)}
      preset={{ category: 'commercial' }}
      basePath="/commercial"
      heading="Commercial property"
      intro="Office space, retail units, showrooms, warehouses, co-working and commercial plots — for rent or sale."
    />
  );
}
