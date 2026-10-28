'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { email as emailSchema, password as passwordSchema } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { Button, LinkButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1 className="text-3xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-muted">Enter your account email and we’ll send a reset link valid for 30 minutes.</p>
      {sent ? (
        <div className="mt-6"><Alert tone="success">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</Alert></div>
      ) : (
        <form
          noValidate
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = emailSchema.safeParse(new FormData(e.currentTarget).get('email'));
            if (!v.success) return setError(v.error.issues[0]!.message);
            setBusy(true);
            setError('');
            try {
              await api('/auth/forgot-password', { body: { email: v.data }, noRefresh: true });
              setSent(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Please try again');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label="Email" name="email" type="email" autoComplete="email" required error={error} />
          <Button type="submit" className="w-full" size="lg" loading={busy}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-medium text-brand-700 hover:underline">Back to sign in</Link></p>
    </>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!token) return <Alert tone="error">This reset link is incomplete. Request a new one from <Link href="/forgot-password" className="underline">Forgot password</Link>.</Alert>;
  return (
    <>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      {done ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success">Password updated. You have been signed out of all devices.</Alert>
          <LinkButton href="/login" className="w-full">Sign in</LinkButton>
        </div>
      ) : (
        <form
          noValidate
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const pw = String(fd.get('password'));
            if (pw !== fd.get('confirm')) return setError('Passwords do not match');
            const v = passwordSchema.safeParse(pw);
            if (!v.success) return setError(v.error.issues[0]!.message);
            setBusy(true);
            setError('');
            try {
              await api('/auth/reset-password', { body: { token, password: pw }, noRefresh: true });
              setDone(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Could not reset password');
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters with a letter and a number" />
          <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
          <Button type="submit" className="w-full" size="lg" loading={busy}>Update password</Button>
        </form>
      )}
    </>
  );
}

export function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState('error');
      setMsg('Verification link is incomplete.');
      return;
    }
    api('/auth/verify-email', { body: { token }, noRefresh: true })
      .then(() => setState('ok'))
      .catch((e) => {
        setState('error');
        setMsg(e.message);
      });
  }, [token]);
  return (
    <>
      <h1 className="text-3xl font-semibold">Email verification</h1>
      <div className="mt-6">
        {state === 'working' && <Alert>Verifying…</Alert>}
        {state === 'ok' && <Alert tone="success">Your email is verified. <Link href="/login" className="underline">Continue</Link></Alert>}
        {state === 'error' && <Alert tone="error">{msg}</Alert>}
      </div>
    </>
  );
}
