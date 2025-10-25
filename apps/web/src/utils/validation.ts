import { z } from 'zod';

export const parcelSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(100, 'Titre trop long'),
  description: z.string().max(500, 'Description trop longue').optional(),
  latitude: z.number().min(-90, 'Latitude invalide').max(90, 'Latitude invalide'),
  longitude: z.number().min(-180, 'Longitude invalide').max(180, 'Longitude invalide'),
  areaM2: z.number().min(100, 'Superficie minimale: 100 m²').max(1000000, 'Superficie maximale: 100 ha'),
  priceUsd: z.number().min(1000, 'Prix minimum: $1,000').max(10000000, 'Prix maximum: $10M').optional(),
});

export const loanSchema = z.object({
  parcelId: z.string().min(1, 'Parcelle requise'),
  principalUsd: z.number().min(1000, 'Montant minimum: $1,000').max(100000, 'Montant maximum: $100,000'),
  ltvBps: z.number().min(3000, 'LTV minimum: 30%').max(7000, 'LTV maximum: 70%'),
});

export const authSchema = {
  login: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court'),
  }),
  register: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court').max(100, 'Mot de passe trop long'),
    displayName: z.string().min(2, 'Nom trop court').max(50, 'Nom trop long'),
  }),
};

export const walletSchema = z.object({
  accountId: z.string().regex(/^0\.0\.\d+$/, 'Format d\'account ID invalide'),
});

export type ParcelFormData = z.infer<typeof parcelSchema>;
export type LoanFormData = z.infer<typeof loanSchema>;
export type LoginFormData = z.infer<typeof authSchema.login>;
export type RegisterFormData = z.infer<typeof authSchema.register>;