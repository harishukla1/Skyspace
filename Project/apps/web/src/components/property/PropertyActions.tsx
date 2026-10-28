'use client';

import { useEffect, useState } from 'react';
import { REPORT_REASONS } from '@skyspace/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { humanize } from '@/lib/labels';

export function ShareButton({ title, url }: { title: string; url: string }) {
  const toast = useToast();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        if (navigator.share) {
          try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
          return;
        }
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      }}
    >
      Share
    </Button>
  );
}

export function ReportButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('incorrect_info');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-muted underline-offset-2 hover:text-red-700 hover:underline">Report this listing</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report listing"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/properties/${propertyId}/report`, { body: { reason, details: details || undefined } });
                  toast('Thanks — our moderation team will review this listing.');
                  setOpen(false);
                } catch (e) {
                  toast((e as Error).message, 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Submit report
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
          </Select>
          <Textarea label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} />
        </div>
      </Modal>
    </>
  );
}

export function BackToResults() {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    try { setHref(sessionStorage.getItem('ssr:lastSearch')); } catch { /* storage unavailable */ }
  }, []);
  if (!href) return null;
  return <a href={href} className="text-sm font-medium text-brand-700 hover:underline">‹ Back to results</a>;
}
