import { formatINR, formatRent, pricePerSqft, type PropertySummaryDTO } from '@skyspace/shared';

export function Price({ p, size = 'md', showPerSqft = false }: { p: Pick<PropertySummaryDTO, 'transactionType' | 'price' | 'monthlyRent' | 'carpetArea' | 'builtUpArea' | 'plotArea' | 'areaUnit'>; size?: 'md' | 'lg'; showPerSqft?: boolean }) {
  const text = p.transactionType === 'rent' ? formatRent(p.monthlyRent) : formatINR(p.price);
  const per = p.transactionType === 'sale' && showPerSqft ? pricePerSqft(p.price, p.carpetArea ?? p.builtUpArea ?? p.plotArea, p.areaUnit) : '';
  if (!text) return <span className="text-sm text-muted">Price on request</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={size === 'lg' ? 'font-display text-3xl font-semibold text-ink' : 'font-display text-lg font-semibold text-ink'}>{text}</span>
      {per && <span className="text-sm text-muted">{per}</span>}
    </span>
  );
}
