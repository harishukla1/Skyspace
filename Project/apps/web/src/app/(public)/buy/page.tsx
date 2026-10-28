import type { Metadata } from 'next';
import { SearchView } from '@/components/search/SearchView';
import { parseSearch, type RawParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Buy residential property in India',
  description: 'Apartments, villas, independent houses, builder floors and plots for sale across Indian cities.',
  alternates: { canonical: '/buy' },
};

export default async function BuyPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return (
    <SearchView
      search={parseSearch(await searchParams)}
      preset={{ transactionType: 'sale', category: 'residential' }}
      basePath="/buy"
      heading="Buy residential property"
      intro="Homes for sale — ready-to-move and under-construction apartments, villas, houses and plots."
    />
  );
}
