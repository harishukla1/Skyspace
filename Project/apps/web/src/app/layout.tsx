import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ShortlistProvider } from '@/features/shortlist/ShortlistProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SITE_NAME, SITE_URL } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Buy, Sell & Rent Property in India`, template: `%s | ${SITE_NAME}` },
  description: 'Search apartments, villas, plots, offices, shops and warehouses for sale and rent across India.',
  icons: { icon: '/brand/icon-256.png', apple: '/brand/icon-256.png' },
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en_IN', images: ['/brand/sky-space-logo.png'] },
};

export const viewport: Viewport = { themeColor: '#0c84b8', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen font-sans">
        <ToastProvider>
          <AuthProvider>
            <ShortlistProvider>{children}</ShortlistProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
