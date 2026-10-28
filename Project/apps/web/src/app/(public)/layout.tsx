import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Public pages are ISR: built without API data (see lib/server-api.ts), then refreshed from the API at runtime.
export const revalidate = 300;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
