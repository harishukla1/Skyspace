import type { Metadata } from 'next';
import Link from 'next/link';
import type { AgentPublicDTO, Paginated } from '@skyspace/shared';
import { serverApi } from '@/lib/server-api';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = { title: 'Our agents', description: 'Meet Sky Space Realty property agents across India.', alternates: { canonical: '/agents' } };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ page?: string; city?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await serverApi<Paginated<AgentPublicDTO>>(`/agents?page=${page}&limit=12${sp.city ? `&city=${encodeURIComponent(sp.city)}` : ''}`, { revalidate: 120 }).catch(() => null);
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Our agents' }]} />
      <h1 className="mt-4 text-3xl font-semibold">Our agents</h1>
      <p className="mt-1 text-muted">Experienced advisors for residential and commercial property.</p>
      <div className="mt-6">
        {!data ? <ErrorState message="Could not load agents." /> : !data.items.length ? <EmptyState title="No agents listed yet" /> : (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((a) => (
                <li key={a.id} className="card relative p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-display text-lg font-semibold text-brand-800" aria-hidden>{a.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                    <div>
                      <h2 className="font-sans text-base font-semibold"><Link href={`/agents/${a.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">{a.name}</Link></h2>
                      {a.agencyName && <p className="text-sm text-muted">{a.agencyName}</p>}
                    </div>
                  </div>
                  <dl className="mt-4 space-y-1 text-sm">
                    {a.cities.length > 0 && <div className="flex gap-2"><dt className="text-muted">Cities:</dt><dd>{a.cities.join(', ')}</dd></div>}
                    {a.experienceYears !== undefined && <div className="flex gap-2"><dt className="text-muted">Experience:</dt><dd>{a.experienceYears} years</dd></div>}
                    <div className="flex gap-2"><dt className="text-muted">Active listings:</dt><dd>{a.activeListings}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => `/agents?page=${p}`} />
          </>
        )}
      </div>
    </div>
  );
}
