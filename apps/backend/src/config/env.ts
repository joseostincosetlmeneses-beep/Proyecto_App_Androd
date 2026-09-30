import 'dotenv/config';
import { z } from 'zod';
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().default('Orbit ERP <onboarding@resend.dev>'),
  EMAIL_REPLY_TO: z.string().email().optional(),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30)
});

const parsed = EnvSchema.parse(process.env);
export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
};

