import Image from 'next/image';
import Link from 'next/link';
import { FURNISHING_LABELS, bhkLabel, formatArea, type PropertySummaryDTO } from '@skyspace/shared';
import { propertyTypeLabel } from '@/lib/labels';
import { Badge, ListingStatusBadge } from '@/components/ui/Badge';
import { Price } from './Price';
import { ShortlistButton } from './ShortlistButton';

export function PropertyCard({ p, priority = false }: { p: PropertySummaryDTO; priority?: boolean }) {
  const area = p.carpetArea ?? p.builtUpArea ?? p.plotArea;
  const areaLabel = p.carpetArea ? 'Carpet' : p.builtUpArea ? 'Built-up' : p.plotArea ? 'Plot' : '';
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {p.coverImage ? (
          <Image src={p.coverImage.url} alt={p.coverImage.altText} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" priority={priority} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="blue" className="bg-white/95">{p.transactionType === 'rent' ? 'For Rent' : 'For Sale'}</Badge>
          {p.verificationStatus === 'verified' && <Badge tone="green" className="bg-white/95">✓ Verified</Badge>}
          {p.featured && <Badge tone="amber" className="bg-white/95">Featured</Badge>}
          {p.status !== 'published' && <ListingStatusBadge status={p.status} />}
        </div>
        <div className="absolute right-3 top-3 z-10">
          <ShortlistButton propertyId={p.id} />
        </div>
        {p.imageCount > 1 && <span className="absolute bottom-3 right-3 rounded-md bg-ink/70 px-2 py-0.5 text-xs text-white">{p.imageCount} photos</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Price p={p} />
        <h3 className="line-clamp-1 font-sans text-base font-semibold">
          <Link href={`/property/${p.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">{p.title}</Link>
        </h3>
        <p className="line-clamp-1 text-sm text-muted">{[p.locality, p.city].filter(Boolean).join(', ')}</p>
        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
          <div><dt className="sr-only">Type</dt><dd>{propertyTypeLabel(p.propertyType)}</dd></div>
          {p.bedrooms ? <div><dt className="sr-only">Configuration</dt><dd className="font-medium text-ink">{bhkLabel(p.bedrooms)}</dd></div> : null}
          {area ? <div><dt className="sr-only">{areaLabel} area</dt><dd>{formatArea(area, p.areaUnit)} <span className="text-muted/80">({areaLabel.toLowerCase()})</span></dd></div> : null}
          {p.furnishingStatus && <div><dt className="sr-only">Furnishing</dt><dd>{FURNISHING_LABELS[p.furnishingStatus]}</dd></div>}
        </dl>
      </div>
    </article>
  );
}
