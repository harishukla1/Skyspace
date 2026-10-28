import { z } from 'zod';
import { SELF_ASSIGNABLE_ROLES } from '../constants';
import { email, indianPhone } from './common';

export const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email,
  phone: indianPhone,
  password,
  role: z.enum(SELF_ASSIGNABLE_ROLES).default('customer'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms to continue' }) }),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: indianPhone.optional(),
  city: z.string().trim().max(60).optional(),
  marketingOptIn: z.boolean().optional(),
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
