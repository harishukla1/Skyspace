import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-display text-7xl font-semibold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-semibold">We couldn’t find that page</h1>
        <p className="mt-2 max-w-md text-muted">The listing may have been removed or the link is incorrect.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/" className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">Go home</Link>
          <Link href="/search" className="rounded-lg border border-line px-5 py-2.5 font-medium hover:border-brand-400">Search properties</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
