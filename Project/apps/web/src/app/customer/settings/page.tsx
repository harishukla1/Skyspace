'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { changePasswordSchema } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useAuth } from '@/features/auth/AuthProvider';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title="Account settings" />
      <div className="grid max-w-2xl gap-6">
        <form
          className="card space-y-4 p-6"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = { currentPassword: String(fd.get('currentPassword')), newPassword: String(fd.get('newPassword')) };
            const v = changePasswordSchema.safeParse(body);
            if (!v.success) return setError(v.error.issues[0]!.message);
            setBusy(true);
            setError('');
            try {
              await api('/users/me/password', { body });
              await logout();
              router.push('/login?reason=expired');
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Could not change password');
              setBusy(false);
            }
          }}
        >
          <h2 className="font-semibold">Change password</h2>
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
          <Input label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="You will be signed out of all devices." />
          <Button type="submit" loading={busy}>Update password</Button>
        </form>
        <div className="card space-y-3 p-6">
          <h2 className="font-semibold">Sessions</h2>
          <p className="text-sm text-muted">Sign out everywhere, including this device.</p>
          <Button variant="outline" onClick={async () => { await api('/users/me/logout-all', { method: 'POST' }); await logout(); router.push('/login'); }}>Sign out of all devices</Button>
        </div>
        <div className="card space-y-3 border-red-200 p-6">
          <h2 className="font-semibold text-red-700">Deactivate account</h2>
          <p className="text-sm text-muted">You will be signed out and will not be able to sign in again until support reactivates your account. Existing listings are not removed automatically.</p>
          <Button variant="danger" onClick={() => setConfirm(true)}>Deactivate my account</Button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} tone="danger" title="Deactivate account?" message="You will be signed out immediately." confirmLabel="Deactivate" onConfirm={async () => { await api('/users/me/deactivate', { method: 'POST' }); await logout(); router.push('/'); }} />
    </>
  );
}
