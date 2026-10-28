'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Textarea } from '@/components/ui/Field';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

interface Profile { slug: string; agencyName?: string; bio?: string; reraAgentNumber?: string; experienceYears?: number; cities: string[]; specialisations: string[]; languages: string[]; publicProfile: boolean }
const list = (s: FormDataEntryValue | null) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export default function AgentProfilePage() {
  const { data, loading, error, reload } = useApi<{ profile: Profile }>('/agent/profile');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  const p = data.profile;
  return (
    <>
      <PageHeader title="Agent profile" description="Shown publicly on the Our Agents page when enabled." actions={p.publicProfile ? <Link href={`/agents/${p.slug}`} className="text-sm font-medium text-brand-700 hover:underline" target="_blank">View public profile ↗</Link> : null} />
      <form
        className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await api('/agent/profile', {
              method: 'PATCH',
              body: {
                agencyName: String(fd.get('agencyName') || '') || undefined,
                bio: String(fd.get('bio') || '') || undefined,
                reraAgentNumber: String(fd.get('reraAgentNumber') || '') || undefined,
                experienceYears: fd.get('experienceYears') ? Number(fd.get('experienceYears')) : undefined,
                cities: list(fd.get('cities')),
                specialisations: list(fd.get('specialisations')),
                languages: list(fd.get('languages')),
                publicProfile: fd.get('publicProfile') === 'on',
              },
            });
            toast('Profile saved');
            void reload();
          } catch (err) {
            toast((err as Error).message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Agency name" name="agencyName" defaultValue={p.agencyName} />
        <Input label="RERA agent registration no." name="reraAgentNumber" defaultValue={p.reraAgentNumber} />
        <Input label="Experience (years)" name="experienceYears" type="number" min={0} defaultValue={p.experienceYears} />
        <Input label="Cities served" name="cities" defaultValue={p.cities.join(', ')} hint="Comma-separated" />
        <Input label="Specialisations" name="specialisations" defaultValue={p.specialisations.join(', ')} hint="Comma-separated" />
        <Input label="Languages" name="languages" defaultValue={p.languages.join(', ')} hint="Comma-separated" />
        <Textarea label="Bio" name="bio" defaultValue={p.bio} wrapClassName="sm:col-span-2" rows={4} />
        <Checkbox name="publicProfile" defaultChecked={p.publicProfile} label="Show my profile on the public agent directory" className="sm:col-span-2" />
        <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save profile</Button></div>
      </form>
    </>
  );
}
