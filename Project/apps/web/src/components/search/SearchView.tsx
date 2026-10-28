import type { Paginated, PropertySearch, PropertySummaryDTO } from '@skyspace/shared';
import { serverApi } from '@/lib/server-api';
import { toQueryString } from '@/lib/search-params';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { LinkButton } from '@/components/ui/Button';
import { FilterPanel } from './FilterPanel';
import { SearchToolbar } from './SearchToolbar';

/** Server-rendered search. `preset` fixes filters implied by the route (e.g. /rent). */
export async function SearchView({ search, preset = {}, basePath, heading, intro }: { search: PropertySearch; preset?: Partial<PropertySearch>; basePath: string; heading: string; intro?: string }) {
  const effective = { ...search, ...preset };
  let data: Paginated<PropertySummaryDTO> | null = null;
  let error: string | null = null;
  try {
    data = await serverApi<Paginated<PropertySummaryDTO>>(`/properties?${toQueryString(effective)}`, { revalidate: false });
  } catch (e) {
    error = (e as Error).message;
  }
  const urlParams = Object.fromEntries(Object.entries(search).filter(([k]) => !(k in preset)));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{heading}</h1>
      {intro && <p className="mt-1 max-w-3xl text-muted">{intro}</p>}
      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
            <FilterPanel lockedValues={preset as Record<string, string>} />
          </div>
        </aside>
        <section aria-label="Search results">
          <SearchToolbar total={data?.total ?? 0} lockedValues={preset as Record<string, string>} />
          <div className="mt-5">
            {error ? (
              <ErrorState message="We could not load properties right now. Please try again shortly." />
            ) : !data?.items.length ? (
              <EmptyState
                title="No properties match these filters"
                description="Try widening your budget, removing a filter or searching a nearby locality."
                action={<LinkButton href={basePath} variant="outline">Reset filters</LinkButton>}
              />
            ) : (
              <>
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((p, i) => <li key={p.id}><PropertyCard p={p} priority={i < 3} /></li>)}
                </ul>
                <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(page) => `${basePath}?${toQueryString({ ...urlParams, page })}`} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
