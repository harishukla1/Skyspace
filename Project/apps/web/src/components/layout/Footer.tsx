import Link from 'next/link';
import { Logo } from './Logo';
import { NewsletterForm } from '@/components/forms/NewsletterForm';

const COLS = [
  { title: 'Explore', links: [['Buy property', '/buy'], ['Rent property', '/rent'], ['Commercial', '/commercial'], ['Search', '/search'], ['Popular cities', '/cities']] },
  { title: 'For owners & agents', links: [['Post property', '/sell'], ['Owner dashboard', '/owner'], ['Agent dashboard', '/agent'], ['Our agents', '/agents']] },
  { title: 'Company', links: [['About us', '/about'], ['Contact us', '/contact'], ['FAQs', '/faq'], ['Privacy policy', '/privacy'], ['Terms & conditions', '/terms']] },
];
const CITY_LINKS = ['Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Delhi', 'Gurugram', 'Kolkata'];

export function Footer() {
  return (
    <footer className="mt-20 bg-brand-950 text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Buy, sell and rent residential and commercial property across India. Every listing is reviewed by our team before it goes live.
          </p>
          <div className="mt-6 max-w-sm">
            <p className="mb-2 text-sm font-semibold text-white">Get new listings in your inbox</p>
            <NewsletterForm />
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="mb-3 font-sans text-sm font-semibold tracking-wide text-white uppercase">{c.title}</h2>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => <li key={href}><Link href={href!} className="hover:text-white hover:underline">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap gap-x-4 gap-y-2 py-5 text-xs">
          <span className="font-semibold text-white">Property in:</span>
          {CITY_LINKS.map((c) => <Link key={c} href={`/cities/${c.toLowerCase()}`} className="hover:text-white">{c}</Link>)}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Sky Space Realty. All rights reserved.</p>
          <p>Listing information is provided by owners and agents. Verify title, approvals and RERA registration before transacting.</p>
        </div>
      </div>
    </footer>
  );
}
