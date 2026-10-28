import type { Metadata } from 'next';
import { getSiteContent } from '@/lib/content';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EmptyState } from '@/components/ui/Feedback';

export const metadata: Metadata = { title: 'Frequently asked questions', alternates: { canonical: '/faq' } };

export default async function FaqPage() {
  const faqs = (await getSiteContent())?.faqs ?? [];
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQs' }]} />
      <h1 className="mt-4 text-3xl font-semibold">Frequently asked questions</h1>
      {faqs.length ? (
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
          {faqs.map((f) => (
            <details key={f.question} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.question}<span className="text-brand-600 transition group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-3 text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyState title="No FAQs published yet" /></div>
      )}
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
    </div>
  );
}
