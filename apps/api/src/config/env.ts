import 'dotenv/config';
import { z } from 'zod';

const DEV_SECRET = 'dev-only-insecure-secret-change-me-0123456789abcdef';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/civita'),
  JWT_ACCESS_SECRET: z.string().min(32).default(DEV_SECRET),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** Comma-separated list of origins allowed to call the API with credentials. */
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  /** Public base URL of this API; used to build URLs for locally stored uploads. */
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  CLOUDINARY_URL: z.string().optional(),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Civita <no-reply@civita.local>'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', z.prettifyError(parsed.error));
  process.exit(1);
}

const data = parsed.data;

if (data.NODE_ENV === 'production' && data.JWT_ACCESS_SECRET === DEV_SECRET) {
  console.error('JWT_ACCESS_SECRET must be set in production.');
  process.exit(1);
}

export const env = {
  ...data,
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  webOrigins: data.WEB_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')),
  /** First origin is used to build links in emails. */
  webUrl: data.WEB_ORIGIN.split(',')[0]!.trim().replace(/\/$/, ''),
};
