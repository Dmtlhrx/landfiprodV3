import { z } from 'zod';

export const createParcelSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  areaM2: z.number().min(100).max(1000000),
  priceUsd: z.number().min(1000).max(10000000).optional(),
});

export const createLoanSchema = z.object({
  parcelId: z.string().min(1),
  principalUsd: z.number().min(1000).max(100000),
  ltvBps: z.number().min(3000).max(7000),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  displayName: z.string().min(2).max(50),
});

export const linkWalletSchema = z.object({
  accountId: z.string().regex(/^0\.0\.\d+$/),
});