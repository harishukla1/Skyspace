import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PropertySummaryDTO } from '@skyspace/shared';
import { Price } from '@/components/property/Price';
import { ListingStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { DataTable } from '@/components/ui/DataTable';

vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span role="img" aria-label={p.alt} /> }));
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/features/shortlist/ShortlistProvider', () => ({ useShortlist: () => ({ ids: new Set(), toggle: vi.fn() }) }));

const p: PropertySummaryDTO = {
  id: '1', propertyId: 'SSR100001', slug: 'flat-ssr100001', title: '3 BHK Apartment in Powai', transactionType: 'sale', propertyCategory: 'residential',
  propertyType: 'apartment', price: 25_000_000, locality: 'Powai', city: 'Mumbai', state: 'Maharashtra', bedrooms: 3, carpetArea: 1200, areaUnit: 'sqft',
  status: 'published', verificationStatus: 'unverified', featured: false, imageCount: 0, createdAt: new Date().toISOString(),
};

describe('property display', () => {
  it('formats sale price in crore with per-sq.ft', () => {
    render(<Price p={p} showPerSqft />);
    expect(screen.getByText('₹2.5 Cr')).toBeInTheDocument();
    expect(screen.getByText('₹20,833/sq.ft')).toBeInTheDocument();
  });
  it('shows "Price on request" instead of zero when price is missing', () => {
    render(<Price p={{ ...p, price: undefined }} />);
    expect(screen.getByText('Price on request')).toBeInTheDocument();
  });
  it('formats rent per month', () => {
    render(<Price p={{ ...p, transactionType: 'rent', monthlyRent: 45000 }} />);
    expect(screen.getByText('₹45,000/month')).toBeInTheDocument();
  });
  it('card shows key facts and no verified badge for unverified listings', async () => {
    const { PropertyCard } = await import('@/components/property/PropertyCard');
    render(<PropertyCard p={p} />);
    expect(screen.getByRole('link', { name: '3 BHK Apartment in Powai' })).toHaveAttribute('href', '/property/flat-ssr100001');
    expect(screen.getByText('3 BHK')).toBeInTheDocument();
    expect(screen.queryByText(/Verified/)).not.toBeInTheDocument();
  });
  it('labels listing statuses', () => {
    render(<ListingStatusBadge status="pending_approval" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });
});

describe('states & tables', () => {
  it('error state retry is clickable', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="boom" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
  it('empty state renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });
  it('pagination marks current page', async () => {
    const onPage = vi.fn();
    render(<Pagination page={2} totalPages={5} onPage={onPage} />);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Next ›' }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
  it('data table renders rows', () => {
    render(<DataTable rows={[{ id: 'a', n: 'Alpha' }]} rowKey={(r) => r.id} columns={[{ key: 'n', header: 'Name', cell: (r) => r.n }]} />);
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
  });
});
