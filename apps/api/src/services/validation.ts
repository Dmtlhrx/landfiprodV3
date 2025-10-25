import { z } from 'zod';
import { FastifyRequest } from 'fastify';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (request: FastifyRequest): T => {
    try {
      return schema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${message}`);
      }
      throw error;
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (request: FastifyRequest): T => {
    try {
      return schema.parse(request.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Query validation error: ${message}`);
      }
      throw error;
    }
  };
}