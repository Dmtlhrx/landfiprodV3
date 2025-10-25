export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 500);
    this.name = 'NetworkError';
  }
}

export class HederaError extends AppError {
  constructor(message: string, public transactionId?: string) {
    super(message, 'HEDERA_ERROR', 500);
    this.name = 'HederaError';
  }
}

export const handleError = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Une erreur inattendue est survenue';
};