'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginSchema } from '@skyspace/shared';
import { ApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { homeFor, useAuth } from './AuthProvider';

/** Only allow same-site relative redirects to prevent open-redirects. */
export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-muted">Sign in to manage shortlists, enquiries and listings.</p>
      {params.get('reason') === 'expired' && <div className="mt-4"><Alert tone="warning">Your session has expired. Please sign in again.</Alert></div>}
      <form
        noValidate
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const parsed = loginSchema.safeParse({ email: fd.get('email'), password: fd.get('password') });
          if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
          setErrors({});
          setError('');
          setBusy(true);
          try {
            const user = await login(parsed.data);
            router.replace(safeNext(params.get('next')) ?? homeFor(user));
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not sign in');
            setBusy(false);
          }
        }}
      >
        {error && <Alert tone="error">{error}</Alert>}
        <Input label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required error={errors.password} />
        <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</Link></div>
        <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to Sky Space Realty? <Link href={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-medium text-brand-700 hover:underline">Create an account</Link></p>
    </>
  );
}
