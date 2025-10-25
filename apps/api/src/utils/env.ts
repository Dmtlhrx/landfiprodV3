import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']),
  HEDERA_OPERATOR_ID: z.string(),
  HEDERA_OPERATOR_KEY: z.string(),
  HCS_TOPIC_ID: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
});

export function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}