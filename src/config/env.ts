import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Support Vercel DB integrations that may use a custom prefix like EDO_DATABASE_URL.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.EDO_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  PORT: z.string().default('8080').transform(Number)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
