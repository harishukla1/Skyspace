import Image from 'next/image';
import Link from 'next/link';

export function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Sky Space Realty — home">
      <span className={inverted ? 'rounded-lg bg-white p-1' : ''}>
        <Image src="/brand/sky-space-icon.png" alt="" width={44} height={38} priority className="h-9 w-auto" />
      </span>
      {!compact && (
        <span className={`font-display text-lg leading-none font-semibold tracking-wide ${inverted ? 'text-white' : 'text-brand-600'}`}>
          SKY SPACE <span className="block text-[0.7rem] tracking-[0.32em] sm:inline sm:text-lg sm:tracking-wide">REALTY</span>
        </span>
      )}
    </Link>
  );
}
