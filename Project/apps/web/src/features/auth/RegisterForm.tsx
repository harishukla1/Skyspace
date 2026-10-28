'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { registerSchema } from '@skyspace/shared';
import { ApiError } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { homeFor, useAuth } from './AuthProvider';
import { safeNext } from './LoginForm';

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'customer' | 'owner'>(params.get('role') === 'owner' ? 'owner' : 'customer');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-1 text-muted">Free for buyers, tenants and property owners.</p>
      <fieldset className="mt-6">
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {([['customer', 'Buy or rent', 'Search, shortlist and enquire'], ['owner', 'Sell or rent out', 'List and manage property']] as const).map(([v, t, d]) => (
            <button key={v} type="button" aria-pressed={role === v} onClick={() => setRole(v)} className={`rounded-xl border p-3 text-left transition ${role === v ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-brand-300'}`}>
              <span className="block text-sm font-semibold">{t}</span>
              <span className="text-xs text-muted">{d}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Agent accounts are created by our team — <Link href="/contact" className="underline">contact us</Link> to join.</p>
      </fieldset>
      <form
        noValidate
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data = { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), password: fd.get('password'), role, acceptTerms: fd.get('acceptTerms') === 'on' };
          const parsed = registerSchema.safeParse(data);
          if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
          setErrors({});
          setError('');
          setBusy(true);
          try {
            const user = await register(data as never);
            router.replace(safeNext(params.get('next')) ?? homeFor(user));
            router.refresh();
          } catch (err) {
            if (err instanceof ApiError) {
              setErrors(err.fieldErrors());
              setError(err.message);
            } else setError('Could not create account');
            setBusy(false);
          }
        }}
      >
        {error && <Alert tone="error">{error}</Alert>}
        <Input label="Full name" name="name" autoComplete="name" required error={errors.name} />
        <Input label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Input label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" required error={errors.phone} hint="Indian mobile number; +91 is added automatically" />
        <Input label="Password" name="password" type="password" autoComplete="new-password" required error={errors.password} hint="At least 8 characters with a letter and a number" />
        <Checkbox name="acceptTerms" error={errors.acceptTerms} label={<>I accept the <Link href="/terms" className="text-brand-700 underline">terms</Link> and <Link href="/privacy" className="text-brand-700 underline">privacy policy</Link>.</>} />
        <Button type="submit" className="w-full" size="lg" loading={busy}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link></p>
    </>
  );
}
