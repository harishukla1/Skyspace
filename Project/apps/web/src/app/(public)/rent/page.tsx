import type { Metadata } from 'next';
import { SearchView } from '@/components/search/SearchView';
import { parseSearch, type RawParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Property for rent in India',
  description: 'Flats, houses, offices, shops and warehouses for rent with deposit and maintenance details.',
  alternates: { canonical: '/rent' },
};

export default async function RentPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return (
    <SearchView
      search={parseSearch(await searchParams)}
      preset={{ transactionType: 'rent' }}
      basePath="/rent"
      heading="Property for rent"
      intro="Residential and commercial rentals. Monthly rent, deposit and lease terms are shown where the lister provides them."
    />
  );
}
