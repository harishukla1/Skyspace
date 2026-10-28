import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/PasswordForms';

export const metadata: Metadata = { title: 'Reset password' };
export default function Page() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
