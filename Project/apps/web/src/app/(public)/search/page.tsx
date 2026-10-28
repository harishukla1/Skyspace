import type { Metadata } from 'next';
import { SearchView } from '@/components/search/SearchView';
import { parseSearch, type RawParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Search properties', alternates: { canonical: '/search' } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const search = parseSearch(await searchParams);
  const where = search.locality ?? search.city;
  const heading = `${search.transactionType === 'rent' ? 'Properties for rent' : search.transactionType === 'sale' ? 'Properties for sale' : 'Properties'}${where ? ` in ${where}` : ''}`;
  return <SearchView search={search} basePath="/search" heading={heading} />;
}
