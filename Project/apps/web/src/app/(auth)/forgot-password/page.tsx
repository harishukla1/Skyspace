import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/PasswordForms';

export const metadata: Metadata = { title: 'Forgot password' };
export default function Page() {
  return <ForgotPasswordForm />;
}
