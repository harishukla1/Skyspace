import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LinkButton } from '@/components/ui/Button';
import { EnquiryForm } from '@/components/property/EnquiryForm';

export const metadata: Metadata = {
  title: 'Sell or rent out your property',
  description: 'List your home, office or shop for free. Every listing is reviewed before publishing.',
  alternates: { canonical: '/sell' },
};

const STEPS = [
  ['Create an owner account', 'Register as a property owner — it is free.'],
  ['Add property details', 'Location, price, area, amenities and photos. Save as draft anytime.'],
  ['Submit for review', 'Our moderation team checks the listing, usually within one business day.'],
  ['Get enquiries', 'Track enquiries and site visit requests from your dashboard.'],
];

export default function SellPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sell or rent out' }]} />
      <section className="mt-6 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Sell or rent out your property</h1>
          <p className="mt-3 text-lg text-muted">Residential or commercial — list it for free and reach serious buyers and tenants across India.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/owner/listings/new" size="lg">Post your property</LinkButton>
            <LinkButton href="/register?role=owner" variant="outline" size="lg">Create owner account</LinkButton>
          </div>
          <p className="mt-3 text-xs text-muted">Already have an account? Posting takes you to sign-in first.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-display text-2xl font-semibold text-brand-600">{i + 1}</span>
              <h2 className="mt-1 font-sans text-base font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-16 grid gap-8 rounded-3xl bg-surface p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Prefer we manage it for you?</h2>
          <p className="mt-2 text-muted">Our agents can list, market and manage your property — handling enquiries, tenant screening and site visits on your behalf.</p>
        </div>
        <div className="card p-6"><EnquiryForm endpoint="/content/contact" source="sell_page" submitLabel="Request a call back" defaultMessage="I would like Sky Space Realty to manage my property." /></div>
      </section>
    </div>
  );
}
