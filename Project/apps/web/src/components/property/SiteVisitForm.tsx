'use client';

import { useMemo, useState } from 'react';
import { VISIT_MAX_DAYS_AHEAD, VISIT_TIME_SLOTS, istToday, siteVisitCreateSchema } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';

const slotLabel = (s: string) => {
  const h = Number(s.slice(0, 2));
  const fmt = (x: number) => `${((x + 11) % 12) + 1} ${x < 12 ? 'AM' : 'PM'}`;
  return `${fmt(h)} – ${fmt(h + 1)}`;
};

export function SiteVisitForm({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formError, setFormError] = useState('');
  const { min, max } = useMemo(() => ({ min: istToday(), max: istToday(new Date(Date.now() + VISIT_MAX_DAYS_AHEAD * 86_400_000)) }), []);

  if (state === 'sent') {
    return (
      <Alert tone="info">
        <strong>Visit requested — awaiting confirmation.</strong> The owner or agent will confirm, suggest another time, or decline. {user ? 'Track it under My Site Visits.' : 'They will contact you on the number provided.'}
      </Alert>
    );
  }
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(['date', 'timeSlot', 'name', 'phone', 'email', 'message'].map((k) => [k, String(fd.get(k) ?? '')]));
        const body = { propertyId, ...data, message: data.message || undefined };
        const parsed = siteVisitCreateSchema.safeParse(body);
        if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
        setErrors({});
        setFormError('');
        setState('sending');
        try {
          await api('/site-visits', { body });
          setState('sent');
        } catch (err) {
          setState('idle');
          if (err instanceof ApiError) {
            setErrors(err.fieldErrors());
            setFormError(err.message);
          } else setFormError('Could not request the visit.');
        }
      }}
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Preferred date" name="date" type="date" min={min} max={max} required error={errors.date} />
        <Select label="Time (IST)" name="timeSlot" required defaultValue="" error={errors.timeSlot}>
          <option value="" disabled>Select a slot</option>
          {VISIT_TIME_SLOTS.map((s) => <option key={s} value={s}>{slotLabel(s)}</option>)}
        </Select>
      </div>
      <Input label="Your name" name="name" required autoComplete="name" defaultValue={user?.name} error={errors.name} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Mobile number" name="phone" type="tel" required autoComplete="tel" defaultValue={user?.phone?.replace('+91', '')} error={errors.phone} />
        <Input label="Email" name="email" type="email" required autoComplete="email" defaultValue={user?.email} error={errors.email} />
      </div>
      <Textarea label="Note (optional)" name="message" rows={2} error={errors.message} />
      <Button type="submit" className="w-full" loading={state === 'sending'}>Request site visit</Button>
    </form>
  );
}
