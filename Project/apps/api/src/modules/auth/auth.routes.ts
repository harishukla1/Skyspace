import { Router } from 'express';
import { z } from 'zod';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@skyspace/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../../middleware/rateLimit';
import * as c from './auth.controller';

export const authRouter = Router();

authRouter.get('/csrf', c.csrf);
authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), c.register);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), c.login);
authRouter.post('/refresh', c.refresh);
authRouter.post('/logout', c.logout);
authRouter.get('/me', requireAuth, c.me);
authRouter.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), c.forgotPassword);
authRouter.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordSchema }), c.resetPassword);
authRouter.post('/verify-email', validate({ body: z.object({ token: z.string().min(20).max(200) }) }), c.verifyEmail);
authRouter.post('/resend-verification', requireAuth, c.resendVerification);
