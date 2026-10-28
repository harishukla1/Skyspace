import type { Metadata } from 'next';
import Image from 'next/image';
import { Logo } from '@/components/layout/Logo';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <div className="relative hidden lg:block">
        <Image src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=75" alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-900/40 to-transparent" />
        <p className="absolute bottom-10 left-10 right-10 font-display text-3xl font-semibold text-white">Homes, offices and shops — reviewed before they reach you.</p>
      </div>
    </div>
  );
}
