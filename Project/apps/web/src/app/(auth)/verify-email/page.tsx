import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmail } from '@/features/auth/PasswordForms';

export const metadata: Metadata = { title: 'Verify email' };
export default function Page() {
  return <Suspense><VerifyEmail /></Suspense>;
}
