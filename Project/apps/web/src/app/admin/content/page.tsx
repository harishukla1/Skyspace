'use client';

import { useEffect, useState } from 'react';
import type { SiteContentDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Textarea } from '@/components/ui/Field';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

type Content = Omit<SiteContentDTO, 'settings'>;
const PAGE_KEYS = ['about', 'privacy', 'terms'] as const;

export default function ContentAdmin() {
  const { data, loading, error, reload } = useApi<Content>('/admin/content');
  const [c, setC] = useState<Content | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { if (data) setC(structuredClone(data)); }, [data]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !c) return <TableSkeleton />;

  const save = async (section: keyof Content) => {
    setBusy(true);
    try {
      await api('/admin/content', { method: 'PUT', body: { [section]: c[section] } });
      toast('Saved — the public site refreshes within a couple of minutes.');
    } catch (e) {
      toast(e instanceof ApiError ? `${e.message}${e.details?.length ? `: ${e.details[0]!.path} ${e.details[0]!.message}` : ''}` : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };
  const update = <K extends keyof Content>(k: K, v: Content[K]) => setC((p) => (p ? { ...p, [k]: v } : p));
  const banner = c.banners[0] ?? { title: '', imageUrl: '' };

  return (
    <>
      <PageHeader title="Homepage & content" description="Manage the hero banner, FAQs, testimonials, static pages and SEO metadata." />
      <div className="space-y-6">
        <Section title="Hero banner" onSave={() => save('banners')} busy={busy}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Headline" value={banner.title} onChange={(e) => update('banners', [{ ...banner, title: e.target.value }])} />
            <Input label="Subtitle" value={banner.subtitle ?? ''} onChange={(e) => update('banners', [{ ...banner, subtitle: e.target.value }])} />
            <Input label="Image URL" type="url" value={banner.imageUrl} onChange={(e) => update('banners', [{ ...banner, imageUrl: e.target.value }])} wrapClassName="sm:col-span-2" hint="Use a licensed image. Allowed hosts are configured in next.config.ts." />
          </div>
        </Section>

        <Section title={`FAQs (${c.faqs.length})`} onSave={() => save('faqs')} busy={busy}>
          {c.faqs.map((f, i) => (
            <div key={i} className="grid gap-2 border-b border-line pb-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input label={`Question ${i + 1}`} value={f.question} onChange={(e) => update('faqs', c.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
              <Textarea label="Answer" rows={2} value={f.answer} onChange={(e) => update('faqs', c.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
              <Button variant="ghost" size="sm" className="self-end" onClick={() => update('faqs', c.faqs.filter((_, j) => j !== i))}>Remove</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => update('faqs', [...c.faqs, { question: '', answer: '' }])}>Add FAQ</Button>
        </Section>

        <Section title={`Testimonials (${c.testimonials.length})`} onSave={() => save('testimonials')} busy={busy} note="Only publish genuine testimonials with the customer’s consent. Sample entries are labelled “Sample content” on the site.">
          {c.testimonials.map((t, i) => (
            <div key={i} className="grid gap-2 border-b border-line pb-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <Input label="Name" value={t.name} onChange={(e) => update('testimonials', c.testimonials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input label="City" value={t.city ?? ''} onChange={(e) => update('testimonials', c.testimonials.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} />
              <Textarea label="Quote" rows={2} value={t.quote} onChange={(e) => update('testimonials', c.testimonials.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)))} />
              <div className="flex flex-col justify-end gap-2">
                <Checkbox label="Sample" checked={t.isSample} onChange={(e) => update('testimonials', c.testimonials.map((x, j) => (j === i ? { ...x, isSample: e.target.checked } : x)))} />
                <Button variant="ghost" size="sm" onClick={() => update('testimonials', c.testimonials.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => update('testimonials', [...c.testimonials, { name: '', quote: '', isSample: false }])}>Add testimonial</Button>
        </Section>

        <Section title="Static pages" onSave={() => save('pages')} busy={busy}>
          {PAGE_KEYS.map((k) => {
            const pg = c.pages[k] ?? { title: '', body: '' };
            const set = (patch: Partial<typeof pg>) => update('pages', { ...c.pages, [k]: { ...pg, ...patch } });
            return (
              <details key={k} className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer font-medium capitalize">{k} page</summary>
                <div className="mt-3 grid gap-3">
                  <Input label="Title" value={pg.title} onChange={(e) => set({ title: e.target.value })} />
                  <Textarea label="Body (plain text; blank lines separate paragraphs)" rows={10} value={pg.body} onChange={(e) => set({ body: e.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="SEO title" maxLength={70} value={pg.seoTitle ?? ''} onChange={(e) => set({ seoTitle: e.target.value || undefined })} />
                    <Input label="SEO description" maxLength={170} value={pg.seoDescription ?? ''} onChange={(e) => set({ seoDescription: e.target.value || undefined })} />
                  </div>
                </div>
              </details>
            );
          })}
        </Section>

        <Section title="Homepage SEO" onSave={() => save('seo')} busy={busy}>
          <Input label="Title (≤ 70 chars)" maxLength={70} value={c.seo.homeTitle ?? ''} onChange={(e) => update('seo', { ...c.seo, homeTitle: e.target.value })} />
          <Textarea label="Meta description (≤ 170 chars)" maxLength={170} rows={2} value={c.seo.homeDescription ?? ''} onChange={(e) => update('seo', { ...c.seo, homeDescription: e.target.value })} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children, onSave, busy, note }: { title: string; children: React.ReactNode; onSave: () => void; busy: boolean; note?: string }) {
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <Button size="sm" onClick={onSave} loading={busy}>Save</Button>
      </div>
      {note && <p className="text-xs text-muted">{note}</p>}
      {children}
    </section>
  );
}
