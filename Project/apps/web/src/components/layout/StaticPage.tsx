import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function StaticPage({ title, body, crumb }: { title: string; body?: string; crumb: string }) {
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: crumb }]} />
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <div className="prose-plain mt-6 whitespace-pre-line">{body ?? 'Content coming soon.'}</div>
    </div>
  );
}
