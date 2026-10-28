import type { Metadata } from 'next';
import Link from 'next/link';
import type { CityDTO } from '@skyspace/shared';
import { serverApi } from '@/lib/server-api';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/Feedback';

export const metadata: Metadata = { title: 'Popular cities and localities', alternates: { canonical: '/cities' } };

export default async function CitiesPage() {
  const data = await serverApi<{ items: CityDTO[] }>('/cities', { revalidate: 300 }).catch(() => null);
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cities' }]} />
      <h1 className="mt-4 text-3xl font-semibold">Property by city</h1>
      {!data ? <div className="mt-6"><ErrorState message="Could not load cities." /></div> : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((c) => (
            <li key={c.id} className="card p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold"><Link href={`/cities/${c.slug}`} className="hover:text-brand-700">{c.name}</Link></h2>
                <span className="text-xs text-muted">{c.propertyCount ?? 0} listings</span>
              </div>
              <p className="text-sm text-muted">{c.state}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {c.localities.slice(0, 8).map((l) => <li key={l.slug}><Link href={`/search?city=${encodeURIComponent(c.name)}&locality=${encodeURIComponent(l.name)}`} className="chip text-xs">{l.name}</Link></li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
