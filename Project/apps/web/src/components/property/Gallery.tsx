'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PropertyImageDTO } from '@skyspace/shared';
import { Modal } from '@/components/ui/Modal';

/** Fill the 4x2 grid with no empty cells for 2–4 photos. */
function tileSpan(i: number, n: number) {
  if (n === 2) return 'md:col-span-2 md:row-span-2';
  if (n === 3) return 'md:col-span-2';
  if (n === 4 && i === 3) return 'md:col-span-2';
  return '';
}

export function Gallery({ images, title }: { images: PropertyImageDTO[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  if (!images.length) return <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-surface text-muted">No photos provided</div>;
  const show = (i: number) => { setIdx(i); setOpen(true); };
  const go = (d: number) => setIdx((i) => (i + d + images.length) % images.length);
  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2 md:[height:440px]">
        {images.slice(0, 5).map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => show(i)}
            className={`relative overflow-hidden bg-surface ${i === 0 ? 'aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto' : `hidden md:block ${tileSpan(i, Math.min(images.length, 5))}`}`}
            aria-label={`Open photo ${i + 1} of ${images.length}`}
          >
            <Image src={img.url} alt={img.altText} fill sizes={i === 0 ? '(min-width:768px) 50vw, 100vw' : '25vw'} className="object-cover transition hover:scale-105" priority={i === 0} />
            {i === 4 && images.length > 5 && <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-lg font-semibold text-white">+{images.length - 5} more</span>}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => show(0)} className="mt-2 text-sm font-medium text-brand-700 hover:underline md:hidden">View all {images.length} photos</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${title} — photo ${idx + 1} of ${images.length}`} size="lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink" onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}>
          <Image src={images[idx]!.url} alt={images[idx]!.altText} fill sizes="700px" className="object-contain" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={() => go(-1)}>‹ Previous</button>
          <span className="text-sm text-muted">{images[idx]!.altText}</span>
          <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={() => go(1)}>Next ›</button>
        </div>
      </Modal>
    </>
  );
}
