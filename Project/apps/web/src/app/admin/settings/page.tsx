'use client';

import { useState } from 'react';
import { INDIAN_STATES } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';

interface Settings { supportEmail?: string; supportPhone?: string; officeAddress?: string; enquiryDuplicateWindowHours: number; autoPublishOnApprove: boolean; reraRequiredStates: string[] }

export default function SettingsAdmin() {
  const { data, loading, error, reload } = useApi<{ settings: Settings }>('/admin/content');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  const s = data.settings;
  return (
    <>
      <PageHeader title="Platform settings" />
      <form
        className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await api('/admin/settings', {
              method: 'PUT',
              body: {
                supportEmail: String(fd.get('supportEmail') || '') || undefined,
                supportPhone: String(fd.get('supportPhone') || '') || undefined,
                officeAddress: String(fd.get('officeAddress') || '') || undefined,
                enquiryDuplicateWindowHours: Number(fd.get('enquiryDuplicateWindowHours')),
                autoPublishOnApprove: fd.get('autoPublishOnApprove') === 'on',
                reraRequiredStates: fd.getAll('reraRequiredStates').map(String),
              },
            });
            toast('Settings saved');
            void reload();
          } catch (err) {
            toast((err as Error).message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="Support email" name="supportEmail" type="email" defaultValue={s.supportEmail} />
        <Input label="Support phone" name="supportPhone" type="tel" defaultValue={s.supportPhone?.replace('+91', '')} />
        <Input label="Office address" name="officeAddress" defaultValue={s.officeAddress} wrapClassName="sm:col-span-2" />
        <Input label="Duplicate enquiry window (hours)" name="enquiryDuplicateWindowHours" type="number" min={1} max={168} defaultValue={s.enquiryDuplicateWindowHours} />
        <Checkbox name="autoPublishOnApprove" defaultChecked={s.autoPublishOnApprove} label="Publish listings automatically when approved" className="self-end" />
        <fieldset className="sm:col-span-2">
          <legend className="label">States where a RERA number is expected for new projects</legend>
          <p className="mb-2 text-xs text-muted">Stored as a configurable business rule. Confirm applicability with legal counsel for each state.</p>
          <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-3">
            {INDIAN_STATES.map((st) => <label key={st} className="flex items-center gap-2 text-xs"><input type="checkbox" name="reraRequiredStates" value={st} defaultChecked={s.reraRequiredStates?.includes(st)} className="accent-brand-600" />{st}</label>)}
          </div>
        </fieldset>
        <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save settings</Button></div>
      </form>
    </>
  );
}
