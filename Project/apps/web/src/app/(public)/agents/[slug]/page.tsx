import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { AgentPublicDTO, PropertySummaryDTO } from '@skyspace/shared';
import { serverApiOrNull } from '@/lib/server-api';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { EmptyState } from '@/components/ui/Feedback';

type P = { params: Promise<{ slug: string }> };
const load = async (slug: string) => serverApiOrNull<{ agent: AgentPublicDTO; listings: PropertySummaryDTO[] }>(`/agents/${encodeURIComponent(slug)}`, { revalidate: 120 });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await load((await params).slug);
  return d ? { title: `${d.agent.name} — Property agent`, description: d.agent.bio, alternates: { canonical: `/agents/${d.agent.slug}` } } : { title: 'Agent not found' };
}

export default async function AgentPage({ params }: P) {
  const d = await load((await params).slug);
  if (!d) notFound();
  const { agent, listings } = d;
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Agents', href: '/agents' }, { label: agent.name }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-semibold">{agent.name}</h1>
          {agent.agencyName && <p className="text-muted">{agent.agencyName}</p>}
          {agent.bio && <p className="mt-4 max-w-2xl">{agent.bio}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {agent.cities.length > 0 && <div><dt className="inline text-muted">Cities: </dt><dd className="inline">{agent.cities.join(', ')}</dd></div>}
            {agent.languages.length > 0 && <div><dt className="inline text-muted">Languages: </dt><dd className="inline">{agent.languages.join(', ')}</dd></div>}
            {agent.specialisations.length > 0 && <div><dt className="inline text-muted">Specialises in: </dt><dd className="inline">{agent.specialisations.join(', ')}</dd></div>}
            {agent.reraAgentNumber && <div><dt className="inline text-muted">RERA agent no.: </dt><dd className="inline">{agent.reraAgentNumber}</dd></div>}
          </dl>
          <h2 className="mt-10 text-xl font-semibold">Active listings ({agent.activeListings})</h2>
          <div className="mt-4">
            {listings.length ? <ul className="grid gap-5 sm:grid-cols-2">{listings.map((p) => <li key={p.id}><PropertyCard p={p} /></li>)}</ul> : <EmptyState title="No active listings right now" />}
          </div>
        </div>
        <aside className="card h-fit p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 text-lg font-semibold">Contact {agent.name.split(' ')[0]}</h2>
          <EnquiryForm agentId={agent.id} source="agent_profile" enquiryType="general" />
        </aside>
      </div>
    </div>
  );
}
