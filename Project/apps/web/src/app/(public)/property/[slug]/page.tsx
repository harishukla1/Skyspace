import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  FURNISHING_LABELS, LISTING_STATUS_LABELS, amenityLabel, bhkLabel, formatArea, formatDateIN, formatINR, displayPhone,
  type PropertyDetailDTO, type PropertySummaryDTO,
} from '@skyspace/shared';
import { serverApi, serverApiOrNull } from '@/lib/server-api';
import { SITE_URL } from '@/lib/config';
import { humanize, propertyTypeLabel } from '@/lib/labels';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Badge, ListingStatusBadge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Feedback';
import { Gallery } from '@/components/property/Gallery';
import { Price } from '@/components/property/Price';
import { PropertyMap } from '@/components/property/PropertyMap';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { SiteVisitForm } from '@/components/property/SiteVisitForm';
import { BackToResults, ReportButton, ShareButton } from '@/components/property/PropertyActions';
import { ShortlistButton } from '@/components/property/ShortlistButton';

type Params = { params: Promise<{ slug: string }> };

/** Join address parts, dropping segments that repeat (e.g. project name already inside the address). */
function addressLine(p: PropertyDetailDTO) {
  const seen = new Set<string>();
  return [p.projectName, p.address, p.locality, p.city, p.state, p.pinCode]
    .filter(Boolean)
    .flatMap((part) => String(part).split(',').map((x) => x.trim()))
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .join(', ');
}

const load = async (slug: string) => (await serverApiOrNull<{ property: PropertyDetailDTO }>(`/properties/${encodeURIComponent(slug)}`, { revalidate: false }))?.property;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: 'Property not found', robots: { index: false } };
  const price = p.transactionType === 'rent' ? `${formatINR(p.monthlyRent)}/month` : formatINR(p.price);
  const description = `${[bhkLabel(p.bedrooms), propertyTypeLabel(p.propertyType)].filter(Boolean).join(' ')} ${p.transactionType === 'rent' ? 'for rent' : 'for sale'} in ${p.locality}, ${p.city}${price ? ` at ${price}` : ''}. ${p.description.slice(0, 110)}`;
  return {
    title: `${p.title}${price ? ` — ${price}` : ''}`,
    description,
    alternates: { canonical: `/property/${p.slug}` },
    // Sold/rented listings stay reachable for users with old links but are kept out of the index.
    robots: p.status === 'published' ? undefined : { index: false, follow: true },
    openGraph: { title: p.title, description, url: `/property/${p.slug}`, images: p.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.altText })) },
  };
}

function Fact({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="rounded-xl bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function PropertyPage({ params }: Params) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const similar = await serverApi<{ items: PropertySummaryDTO[] }>(`/properties/${p.id}/similar`, { revalidate: 300 }).catch(() => ({ items: [] }));
  const url = `${SITE_URL}/property/${p.slug}`;
  const isRent = p.transactionType === 'rent';
  const live = p.status === 'published';
  const listing = isRent ? '/rent' : p.propertyCategory === 'commercial' ? '/commercial' : '/buy';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: p.description,
    url,
    datePosted: p.publishedAt,
    image: p.images.map((i) => i.url),
    offers: live && (p.price || p.monthlyRent)
      ? { '@type': 'Offer', price: isRent ? p.monthlyRent : p.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock', businessFunction: isRent ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' }
      : undefined,
    contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: p.locality, addressRegion: p.state, postalCode: p.pinCode, addressCountry: 'IN' } },
  };

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: isRent ? 'Rent' : p.propertyCategory === 'commercial' ? 'Commercial' : 'Buy', href: listing }, { label: p.city, href: `/cities/${p.city.toLowerCase().replace(/\s+/g, '-')}` }, { label: p.propertyId }]} />
        <BackToResults />
      </div>

      {!live && (
        <div className="mt-4">
          <Alert tone="warning">This property is <strong>{LISTING_STATUS_LABELS[p.status]}</strong> and is no longer available. See similar properties below.</Alert>
        </div>
      )}

      <div className="mt-5"><Gallery images={p.images} title={p.title} /></div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{isRent ? 'For Rent' : 'For Sale'}</Badge>
              <Badge>{propertyTypeLabel(p.propertyType)}</Badge>
              {p.verificationStatus === 'verified' && <Badge tone="green">✓ Verified by Sky Space Realty</Badge>}
              <ListingStatusBadge status={p.status} />
              <span className="text-xs text-muted">ID: {p.propertyId}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{p.title}</h1>
            <p className="mt-1 text-muted">{addressLine(p)}</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <Price p={p} size="lg" showPerSqft />
                {p.priceNegotiable && <span className="text-sm text-muted">Negotiable</span>}
              </div>
              <div className="flex gap-2">
                <ShortlistButton propertyId={p.id} withLabel />
                <ShareButton title={p.title} url={url} />
              </div>
            </div>
          </header>

          <section aria-labelledby="overview">
            <h2 id="overview" className="text-lg font-semibold">Overview</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Fact label="Configuration" value={bhkLabel(p.bedrooms)} />
              <Fact label="Bathrooms" value={p.bathrooms} />
              <Fact label="Balconies" value={p.balconies} />
              <Fact label="Carpet area" value={formatArea(p.carpetArea, p.areaUnit)} />
              <Fact label="Built-up area" value={formatArea(p.builtUpArea, p.areaUnit)} />
              <Fact label="Plot area" value={formatArea(p.plotArea, p.areaUnit)} />
              <Fact label="Furnishing" value={p.furnishingStatus && FURNISHING_LABELS[p.furnishingStatus]} />
              <Fact label="Floor" value={p.floorNumber !== undefined ? `${p.floorNumber === 0 ? 'Ground' : p.floorNumber}${p.totalFloors ? ` of ${p.totalFloors}` : ''}` : undefined} />
              <Fact label="Covered parking" value={p.coveredParking} />
              <Fact label="Open parking" value={p.openParking} />
              <Fact label="Possession" value={p.possessionStatus && (p.possessionStatus === 'ready_to_move' ? 'Ready to move' : `Under construction${p.possessionDate ? ` — by ${formatDateIN(p.possessionDate)}` : ''}`)} />
              <Fact label="Property age" value={p.propertyAgeYears !== undefined ? (p.propertyAgeYears === 0 ? 'New' : `${p.propertyAgeYears} year${p.propertyAgeYears === 1 ? '' : 's'}`) : undefined} />
              <Fact label="Sale type" value={p.condition && humanize(p.condition)} />
              <Fact label="Listed by" value={humanize(p.listedBy)} />
              <Fact label="RERA registration" value={p.reraNumber} />
            </dl>
          </section>

          {(isRent || p.maintenanceCharges) && (
            <section aria-labelledby="pricing">
              <h2 id="pricing" className="text-lg font-semibold">{isRent ? 'Rental terms' : 'Charges'}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {isRent && <Fact label="Monthly rent" value={formatINR(p.monthlyRent, { compact: false })} />}
                <Fact label="Security deposit" value={p.securityDeposit ? formatINR(p.securityDeposit, { compact: false }) : undefined} />
                <Fact label="Maintenance (monthly)" value={p.maintenanceCharges ? formatINR(p.maintenanceCharges, { compact: false }) : undefined} />
                <Fact label="Available from" value={p.availableFrom && formatDateIN(p.availableFrom)} />
                <Fact label="Lease term" value={p.leaseTermMonths && `${p.leaseTermMonths} months`} />
                <Fact label="Lock-in" value={p.lockInMonths ? `${p.lockInMonths} months` : undefined} />
                <Fact label="Preferred tenants" value={p.preferredTenants?.map(humanize).join(', ')} />
              </dl>
            </section>
          )}

          <section aria-labelledby="desc">
            <h2 id="desc" className="text-lg font-semibold">About this property</h2>
            <div className="prose-plain mt-3 whitespace-pre-line">{p.description}</div>
          </section>

          {p.amenities.length > 0 && (
            <section aria-labelledby="amen">
              <h2 id="amen" className="text-lg font-semibold">Amenities</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.amenities.map((a) => <li key={a} className="flex items-center gap-2 text-sm"><span className="text-brand-600" aria-hidden>✓</span>{amenityLabel(a)}</li>)}
              </ul>
            </section>
          )}

          {p.nearby.length > 0 && (
            <section aria-labelledby="nearby">
              <h2 id="nearby" className="text-lg font-semibold">Nearby</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.nearby.map((n) => (
                  <li key={n.name} className="flex justify-between rounded-xl border border-line px-3 py-2 text-sm">
                    <span><span className="text-muted">{humanize(n.type)} · </span>{n.name}</span>
                    {n.distanceKm !== undefined && <span className="text-muted">{n.distanceKm} km</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Distances are provided by the lister and are approximate.</p>
            </section>
          )}

          {p.location && (
            <section aria-labelledby="loc">
              <h2 id="loc" className="text-lg font-semibold">Location</h2>
              <div className="mt-3"><PropertyMap lat={p.location.lat} lng={p.location.lng} approximate={p.hideExactLocation} label={`${p.locality}, ${p.city}`} /></div>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
            <span>Posted {formatDateIN(p.publishedAt ?? p.createdAt)} · Updated {formatDateIN(p.updatedAt)}</span>
            <ReportButton propertyId={p.id} />
          </footer>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {p.contact && (
            <div className="card p-5">
              <p className="text-xs tracking-wide text-muted uppercase">{p.contact.role === 'agent' ? 'Listed by agent' : 'Listed by owner'}</p>
              <p className="mt-1 font-semibold">{p.contact.agentSlug ? <a href={`/agents/${p.contact.agentSlug}`} className="hover:text-brand-700">{p.contact.name}</a> : p.contact.name}</p>
              {p.contact.agencyName && <p className="text-sm text-muted">{p.contact.agencyName}</p>}
              {p.contact.phone ? (
                <p className="mt-2 text-sm"><a href={`tel:${p.contact.phone}`} className="font-medium text-brand-700">{displayPhone(p.contact.phone)}</a></p>
              ) : (
                <p className="mt-2 text-xs text-muted">Contact details are shared after you send an enquiry.</p>
              )}
            </div>
          )}
          {live ? (
            <>
              <div className="card p-5">
                <h2 className="mb-3 text-lg font-semibold">Contact {p.contact?.role === 'agent' ? 'agent' : 'owner'}</h2>
                <EnquiryForm propertyId={p.id} enquiryType={isRent ? 'rent' : 'buy'} defaultMessage={`Hi, I'm interested in ${p.title} (${p.propertyId}). Please share more details.`} />
              </div>
              <div className="card p-5">
                <h2 className="mb-1 text-lg font-semibold">Request a site visit</h2>
                <p className="mb-3 text-xs text-muted">Visits are confirmed by the owner or agent — you will be notified.</p>
                <SiteVisitForm propertyId={p.id} />
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {similar.items.length > 0 && (
        <section className="mt-14" aria-labelledby="similar">
          <h2 id="similar" className="text-2xl font-semibold">Similar properties</h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{similar.items.slice(0, 6).map((s) => <li key={s.id}><PropertyCard p={s} /></li>)}</ul>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </div>
  );
}
