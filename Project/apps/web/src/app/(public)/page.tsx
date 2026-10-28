import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { HomeDTO } from '@skyspace/shared';
import { serverApi } from '@/lib/server-api';
import { HeroSearch } from '@/components/search/HeroSearch';
import { PropertyCard } from '@/components/property/PropertyCard';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { EnquiryForm } from '@/components/property/EnquiryForm';

export const revalidate = 60;

async function getHome(): Promise<HomeDTO | null> {
  try {
    return await serverApi<HomeDTO>('/content/home', { revalidate: 60 });
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHome();
  return {
    title: { absolute: home?.content.seo.homeTitle ?? 'Sky Space Realty — Buy, Sell & Rent Property in India' },
    description: home?.content.seo.homeDescription,
    alternates: { canonical: '/' },
  };
}

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=75';

export default async function HomePage() {
  const home = await getHome();
  const banner = home?.content.banners[0];
  const residential = home?.categoryCounts.filter((c) => c.category === 'residential') ?? [];
  const commercial = home?.categoryCounts.filter((c) => c.category === 'commercial') ?? [];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image src={banner?.imageUrl ?? FALLBACK_HERO} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/80 via-brand-900/60 to-brand-950/80" />
        <div className="container-page flex min-h-[560px] flex-col items-start justify-center gap-6 py-16">
          <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white uppercase ring-1 ring-white/30 backdrop-blur">Residential · Commercial · Pan-India</p>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-white sm:text-5xl">{banner?.title ?? 'Find a space that lifts you higher'}</h1>
          <p className="max-w-2xl text-lg text-white/85">{banner?.subtitle ?? 'Homes, offices and shops across India — every listing reviewed by our team before it goes live.'}</p>
          <HeroSearch cities={home?.popularCities.map((c) => c.name) ?? []} />
        </div>
      </section>

      {!home && (
        <div className="container-page py-12">
          <EmptyState title="Listings are temporarily unavailable" description="We could not reach the property service. Please refresh in a moment." />
        </div>
      )}

      {home && (
        <>
          {home.featured.length > 0 && (
            <Section title="Featured properties" subtitle="Hand-picked listings from across India" href="/search?sort=relevance">
              <Grid items={home.featured} />
            </Section>
          )}

          <Section title="Browse by category" subtitle="Residential and commercial property types">
            <div className="grid gap-6 lg:grid-cols-2">
              {[{ title: 'Residential', items: residential, base: '/buy' }, { title: 'Commercial', items: commercial, base: '/commercial' }].map((g) => (
                <div key={g.title} className="card p-6">
                  <h3 className="text-lg font-semibold">{g.title}</h3>
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {g.items.map((c) => (
                      <li key={c.slug}>
                        <Link href={`${g.base}?type=${c.slug}`} className="block rounded-xl border border-line p-3 transition hover:border-brand-400 hover:bg-brand-50">
                          <span className="block text-sm font-medium">{c.name}</span>
                          <span className="text-xs text-muted">{c.count ? `${c.count} listing${c.count === 1 ? '' : 's'}` : 'No listings yet'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {home.popularCities.length > 0 && (
            <Section title="Property in popular cities" href="/cities">
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {home.popularCities.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cities/${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900">
                      {c.imageUrl && <Image src={c.imageUrl} alt={`${c.name} city view`} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                      <span className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                      <span className="absolute bottom-3 left-3 text-white">
                        <span className="block font-display text-lg font-semibold">{c.name}</span>
                        <span className="text-xs text-white/80">{c.propertyCount ? `${c.propertyCount} properties` : c.state}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {home.recent.length > 0 && (
            <Section title="Recently added" subtitle="Fresh listings, newest first" href="/search?sort=newest">
              <Grid items={home.recent} />
            </Section>
          )}

          <section className="bg-surface py-16">
            <div className="container-page">
              <h2 className="text-center text-2xl font-semibold sm:text-3xl">Why Sky Space Realty</h2>
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Moderated listings', 'Every listing is reviewed by our team before it is published. “Verified” is shown only after a documented check.'],
                  ['Transparent pricing', 'Prices in ₹ lakh/crore, with deposit and maintenance shown separately — never hidden.'],
                  ['Your contact stays private', 'Enquiry details go only to the owner or agent handling the listing.'],
                  ['Managed for owners', 'Our agents can handle enquiries, site visits and follow-ups on your behalf.'],
                ].map(([t, d]) => (
                  <li key={t} className="card p-6">
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white" aria-hidden>✓</span>
                    <h3 className="font-sans text-base font-semibold">{t}</h3>
                    <p className="mt-1 text-sm text-muted">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="container-page py-16">
            <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-brand-600 p-8 text-white sm:p-12 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">Own a property? List it for free.</h2>
                <p className="mt-2 text-white/85">Sell or rent out homes, offices and shops. Track enquiries and site visits from your dashboard — or let our agents manage it for you.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <LinkButton href="/sell" variant="secondary" size="lg">Post property</LinkButton>
                <LinkButton href="/agents" size="lg" className="bg-white/15 ring-1 ring-white/40 hover:bg-white/25">Talk to an agent</LinkButton>
              </div>
            </div>
          </section>

          {home.content.testimonials.length > 0 && (
            <Section title="What our customers say">
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {home.content.testimonials.map((t, i) => (
                  <li key={i} className="card p-6">
                    {t.isSample && <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Sample content</span>}
                    <blockquote className="text-ink/90">“{t.quote}”</blockquote>
                    <p className="mt-3 text-sm font-medium">{t.name}{t.city ? `, ${t.city}` : ''}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {home.content.faqs.length > 0 && (
            <Section title="Frequently asked questions" href="/faq">
              <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line">
                {home.content.faqs.slice(0, 5).map((f) => (
                  <details key={f.question} className="group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                      {f.question}
                      <span className="text-brand-600 transition group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{f.answer}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}

          <section className="container-page pb-4">
            <div className="grid gap-8 rounded-3xl border border-line p-6 sm:p-10 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold">Need help finding the right property?</h2>
                <p className="mt-2 text-muted">Tell us what you need and a Sky Space Realty advisor will call you back.</p>
                {home.content.settings.supportPhone && <p className="mt-4 text-sm">Call us: <a className="font-medium text-brand-700" href={`tel:${home.content.settings.supportPhone}`}>{home.content.settings.supportPhone}</a></p>}
                {home.content.settings.supportEmail && <p className="text-sm">Email: <a className="font-medium text-brand-700" href={`mailto:${home.content.settings.supportEmail}`}>{home.content.settings.supportEmail}</a></p>}
              </div>
              <EnquiryForm endpoint="/content/contact" source="contact_form" submitLabel="Request a call back" />
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Section({ title, subtitle, href, children }: { title: string; subtitle?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-page py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">View all →</Link>}
      </div>
      {children}
    </section>
  );
}

function Grid({ items }: { items: HomeDTO['featured'] }) {
  return <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map((p) => <li key={p.id}><PropertyCard p={p} /></li>)}</ul>;
}
