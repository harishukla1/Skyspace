'use client';

import { useState } from 'react';
import { updateProfileSchema, displayPhone } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/features/auth/AuthProvider';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function ProfilePage() {
  const { user, reload } = useAuth();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          className="card space-y-4 p-6"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = { name: String(fd.get('name')), phone: String(fd.get('phone')), city: String(fd.get('city') || '') || undefined, marketingOptIn: fd.get('marketingOptIn') === 'on' };
            const v = updateProfileSchema.safeParse(body);
            if (!v.success) return setErrors(Object.fromEntries(v.error.issues.map((i) => [String(i.path[0]), i.message])));
            setErrors({});
            setError('');
            setBusy(true);
            try {
              await api('/users/me', { method: 'PATCH', body });
              await reload();
              toast('Profile updated');
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Could not save');
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="Full name" name="name" defaultValue={user.name} required error={errors.name} />
          <Input label="Email" value={user.email} disabled hint="Contact support to change your email address." />
          <Input label="Mobile number" name="phone" type="tel" defaultValue={user.phone.replace('+91', '')} required error={errors.phone} hint="Changing your number resets phone verification." />
          <Input label="City" name="city" defaultValue={user.city} error={errors.city} />
          <Checkbox name="marketingOptIn" defaultChecked={user.marketingOptIn} label="Send me property recommendations and market updates" />
          <Button type="submit" loading={busy}>Save changes</Button>
        </form>
        <aside className="card h-fit space-y-3 p-5 text-sm">
          <p><span className="text-muted">Roles:</span> {user.roles.map((r) => <Badge key={r} className="ml-1 capitalize">{r}</Badge>)}</p>
          <p><span className="text-muted">Email:</span> {user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Not verified</Badge>}</p>
          {!user.emailVerified && <Button size="sm" variant="outline" onClick={async () => { await api('/auth/resend-verification', { method: 'POST' }); toast('Verification email requested'); }}>Resend verification email</Button>}
          <p><span className="text-muted">Phone:</span> {displayPhone(user.phone)} {user.phoneVerified ? <Badge tone="green">Verified</Badge> : <Badge>Not verified</Badge>}</p>
        </aside>
      </div>
    </>
  );
}
