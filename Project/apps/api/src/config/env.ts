import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/skyspace'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().default(20),

  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: bool.optional(),

  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('Sky Space Realty <no-reply@skyspacerealty.example>'),

  SMS_PROVIDER: z.enum(['console', 'msg91', 'twilio']).default('console'),
  SMS_PROVIDER_API_KEY: z.string().optional(),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().default('ap-south-1'),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_PUBLIC_URL: z.string().optional(),
  LOCAL_UPLOAD_DIR: z.string().default('uploads'),

  CAPTCHA_PROVIDER: z.enum(['none', 'turnstile', 'recaptcha']).default('none'),
  CAPTCHA_SECRET: z.string().optional(),

  RATE_LIMIT_ENABLED: bool.default('true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  // Treat empty values in .env (e.g. `COOKIE_DOMAIN=`) as unset so defaults apply.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}\nSee .env.example`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    if (env.STORAGE_DRIVER === 's3' && (!env.OBJECT_STORAGE_BUCKET || !env.OBJECT_STORAGE_ACCESS_KEY)) {
      throw new Error('S3 storage requires OBJECT_STORAGE_BUCKET and credentials');
    }
    if (env.ACCESS_TOKEN_SECRET === env.REFRESH_TOKEN_SECRET) throw new Error('Token secrets must differ');
  }
  return env;
}

export const env = load();
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
