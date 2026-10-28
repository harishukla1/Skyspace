import type { Metadata } from 'next';
import { getSiteContent } from '@/lib/content';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EnquiryForm } from '@/components/property/EnquiryForm';
import { displayPhone } from '@skyspace/shared';

export const metadata: Metadata = { title: 'Contact us', alternates: { canonical: '/contact' } };

export default async function ContactPage() {
  const s = (await getSiteContent())?.settings;
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact us' }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold">Contact Sky Space Realty</h1>
          <p className="mt-2 text-muted">Questions about buying, selling, renting or property management? Send us a message and we will respond within one business day.</p>
          <dl className="mt-6 space-y-3 text-sm">
            {s?.supportPhone && <div><dt className="text-muted">Phone</dt><dd><a href={`tel:${s.supportPhone}`} className="font-medium text-brand-700">{displayPhone(s.supportPhone)}</a></dd></div>}
            {s?.supportEmail && <div><dt className="text-muted">Email</dt><dd><a href={`mailto:${s.supportEmail}`} className="font-medium text-brand-700">{s.supportEmail}</a></dd></div>}
            {s?.officeAddress && <div><dt className="text-muted">Office</dt><dd>{s.officeAddress}</dd></div>}
          </dl>
        </div>
        <div className="card p-6"><EnquiryForm endpoint="/content/contact" source="contact_form" submitLabel="Send message" /></div>
      </div>
    </div>
  );
}
