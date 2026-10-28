import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CityDTO, Paginated, PropertySummaryDTO } from '@skyspace/shared';
import { serverApi, serverApiOrNull } from '@/lib/server-api';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PropertyCard } from '@/components/property/PropertyCard';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

type P = { params: Promise<{ slug: string }> };
type CityWithCounts = Omit<CityDTO, 'localities'> & { localities: (CityDTO['localities'][number] & { propertyCount: number })[] };
const load = async (slug: string) => (await serverApiOrNull<{ city: CityWithCounts }>(`/cities/${encodeURIComponent(slug)}`, { revalidate: 300 }))?.city;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await load((await params).slug);
  return c ? { title: `Property in ${c.name} — buy, rent & commercial`, description: `Flats, houses, offices and shops for sale and rent in ${c.name}, ${c.state}.`, alternates: { canonical: `/cities/${c.slug}` } } : { title: 'City not found' };
}

export default async function CityPage({ params }: P) {
  const city = await load((await params).slug);
  if (!city) notFound();
  const [sale, rent] = await Promise.all([
    serverApi<Paginated<PropertySummaryDTO>>(`/properties?city=${encodeURIComponent(city.name)}&transactionType=sale&limit=6&sort=newest`, { revalidate: 120 }).catch(() => null),
    serverApi<Paginated<PropertySummaryDTO>>(`/properties?city=${encodeURIComponent(city.name)}&transactionType=rent&limit=6&sort=newest`, { revalidate: 120 }).catch(() => null),
  ]);
  const q = (extra: string) => `/search?city=${encodeURIComponent(city.name)}${extra}`;
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cities', href: '/cities' }, { label: city.name }]} />
      <h1 className="mt-4 text-3xl font-semibold">Property in {city.name}</h1>
      <p className="text-muted">{city.state} · {city.propertyCount ?? 0} active listings</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href={q('&transactionType=sale&category=residential')} variant="secondary" size="sm">Buy homes</LinkButton>
        <LinkButton href={q('&transactionType=rent&category=residential')} variant="secondary" size="sm">Rent homes</LinkButton>
        <LinkButton href={q('&category=commercial')} variant="secondary" size="sm">Commercial</LinkButton>
      </div>
      {city.localities.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Localities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {city.localities.map((l) => <li key={l.slug}><Link className="chip" href={q(`&locality=${encodeURIComponent(l.name)}`)}>{l.name} <span className="text-xs text-muted">({l.propertyCount})</span></Link></li>)}
          </ul>
        </section>
      )}
      {[{ t: 'For sale', d: sale, href: q('&transactionType=sale') }, { t: 'For rent', d: rent, href: q('&transactionType=rent') }].map((g) => (
        <section key={g.t} className="mt-10">
          <div className="flex items-end justify-between"><h2 className="text-xl font-semibold">{g.t} in {city.name}</h2><Link href={g.href} className="text-sm font-semibold text-brand-700 hover:underline">View all →</Link></div>
          <div className="mt-4">
            {g.d?.items.length ? <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{g.d.items.map((p) => <li key={p.id}><PropertyCard p={p} /></li>)}</ul> : <EmptyState title={`No properties ${g.t.toLowerCase()} yet`} />}
          </div>
        </section>
      ))}
    </div>
  );
}
