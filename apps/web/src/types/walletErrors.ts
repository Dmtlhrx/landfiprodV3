// types/walletErrors.ts
// Error codes and types for wallet operations

export enum WalletErrorCode {
    // Validation errors
    INVALID_WALLET_FORMAT = 'INVALID_WALLET_FORMAT',
    INVALID_HEDERA_FORMAT = 'INVALID_HEDERA_FORMAT',
    
    // Conflict errors
    WALLET_ALREADY_CONNECTED = 'WALLET_ALREADY_CONNECTED',
    
    // Not found errors
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    
    // Server errors
    WALLET_UPDATE_FAILED = 'WALLET_UPDATE_FAILED',
    
    // Connection errors
    WALLET_CONNECTION_CANCELLED = 'WALLET_CONNECTION_CANCELLED',
    WALLET_NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
    WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
    
    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    SERVER_UNREACHABLE = 'SERVER_UNREACHABLE',
  }
  
  export interface WalletErrorDetails {
    connectedToEmail?: string;
    connectedToDisplayName?: string;
    field?: string;
    value?: string;
  }
  
  export interface WalletApiError {
    error: string;
    code: WalletErrorCode;
    details?: WalletErrorDetails;
  }
  
  export const WalletErrorMessages: Record<WalletErrorCode, string> = {
    [WalletErrorCode.INVALID_WALLET_FORMAT]: 
      'Invalid wallet address format',
    
    [WalletErrorCode.INVALID_HEDERA_FORMAT]: 
      'Invalid Hedera account ID format. Expected format: 0.0.xxxxx',
    
    [WalletErrorCode.WALLET_ALREADY_CONNECTED]: 
      'This wallet is already connected to another account',
    
    [WalletErrorCode.USER_NOT_FOUND]: 
      'User account not found. Please log in again.',
    
    [WalletErrorCode.WALLET_UPDATE_FAILED]: 
      'Failed to save wallet. Please try again.',
    
    [WalletErrorCode.WALLET_CONNECTION_CANCELLED]: 
      'Wallet connection was cancelled',
    
    [WalletErrorCode.WALLET_NOT_INSTALLED]: 
      'Wallet not found. Please install the wallet extension.',
    
    [WalletErrorCode.WALLET_CONNECTION_FAILED]: 
      'Failed to connect wallet. Please try again.',
    
    [WalletErrorCode.NETWORK_ERROR]: 
      'Network error. Please check your connection.',
    
    [WalletErrorCode.SERVER_UNREACHABLE]: 
      'Cannot connect to server. Please check if the backend is running.',
  };
  
  export class WalletError extends Error {
    constructor(
      public code: WalletErrorCode,
      public details?: WalletErrorDetails
    ) {
      super(WalletErrorMessages[code]);
      this.name = 'WalletError';
    }
  
    static fromApiError(apiError: WalletApiError): WalletError {
      return new WalletError(apiError.code, apiError.details);
    }
  
    getUserMessage(): string {
      let message = WalletErrorMessages[this.code];
      
      // Add specific details for certain error types
      if (this.code === WalletErrorCode.WALLET_ALREADY_CONNECTED && 
          this.details?.connectedToEmail) {
        message = `This wallet is already connected to account: ${this.details.connectedToEmail}`;
      }
      
      return message;
    }
  }