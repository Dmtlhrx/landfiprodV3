import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useApi } from './useApi';
import toast from 'react-hot-toast';

export interface ExpressLoan {
  id: string;
  borrowerId: string;
  parcelId: string;
  principalUsd: number;
  ltvBps: number;
  rateAprBps: number;
  status: 'PENDING' | 'ACTIVE' | 'REPAID' | 'LIQUIDATED';
  createdAt: string;
  updatedAt: string;
  borrower: {
    id: string;
    displayName: string;
    email: string;
    walletHedera: string | null;
  };
  parcel: {
    id: string;
    title: string;
    areaM2: number;
    htsTokenId: string | null;
    verificationType: 'VERIFIED' | 'UNVERIFIED';
  };
}

export interface CreateExpressLoanRequest {
  parcelId: string;
  principalUsd: number;
  borrowerAccountId: string;
}

interface UseExpressLoansOptions {
  autoFetch?: boolean;
  throttleMs?: number;
}

class RequestThrottler {
  private lastRequestTimes: Map<string, number> = new Map();
  private throttleMs: number;

  constructor(throttleMs: number = 1000) {
    this.throttleMs = throttleMs;
  }

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(endpoint) || 0;
    
    if (now - lastRequest < this.throttleMs) {
      return false;
    }
    
    this.lastRequestTimes.set(endpoint, now);
    return true;
  }

  getRemainingTime(endpoint: string): number {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(endpoint) || 0;
    const remaining = this.throttleMs - (now - lastRequest);
    return Math.max(0, remaining);
  }
}

export const useExpressLoans = (options: UseExpressLoansOptions = {}) => {
  const { autoFetch = true, throttleMs = 1000 } = options;
  
  const [expressLoans, setExpressLoans] = useState<ExpressLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, wallet } = useAuthStore();
  const api = useApi();
  
  const throttlerRef = useRef<RequestThrottler>(new RequestThrottler(throttleMs));
  
  const throttledApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>,
    options: { silent?: boolean } = {}
  ): Promise<T | null> => {
    const { silent = false } = options;
    
    if (!throttlerRef.current.canMakeRequest(endpoint)) {
      if (!silent) {
        const remainingTime = Math.ceil(throttlerRef.current.getRemainingTime(endpoint) / 1000);
        console.log(`Request throttled for ${endpoint}. Retry in ${remainingTime}s`);
      }
      return null;
    }
    
    try {
      return await apiCall();
    } catch (error) {
      throw error;
    }
  }, []);

  // Fetch user's express loans
  const fetchExpressLoans = useCallback(async () => {
    if (!user) {
      setExpressLoans([]);
      return;
    }
    
    const endpoint = 'fetchExpressLoans';
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await api.get('api/express-loans', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response?.loans) {
          setExpressLoans(response.loans);
          return response.loans;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
          const errorMessage = 'Request timeout - please try again';
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          const errorMessage = err.message || 'Failed to fetch express loans';
          setError(errorMessage);
          console.error('Fetch express loans error:', err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    }, { silent: true });

    if (result === null) {
      return;
    }
  }, [user, api, throttledApiCall]);

  // Create express loan
  const createExpressLoan = useCallback(async (loanData: CreateExpressLoanRequest): Promise<ExpressLoan | null> => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet');
      return null;
    }
    
    const endpoint = 'createExpressLoan';
    
    return await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await api.post('api/express-loans', loanData, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.loan) {
          throw new Error('Invalid response from server');
        }
        
        toast.success('Express loan approved! Funds will be disbursed within 24 hours.');
        
        // Refresh data
        fetchExpressLoans().catch(console.error);
        
        return response.loan;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to create express loan';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - please try again';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Create express loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
  }, [user, wallet.accountId, api, fetchExpressLoans, throttledApiCall]);

  // Repay express loan
  const repayExpressLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet');
      return false;
    }
    
    const endpoint = `repayExpressLoan-${loanId}`;
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await api.post(`api/express-loans/${loanId}/repay`, {}, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.loan) {
          throw new Error('Failed to repay express loan');
        }
        
        toast.success('Express loan repaid successfully!');
        
        fetchExpressLoans().catch(console.error);
        
        return true;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to repay express loan';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - blockchain operations can take time';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Repay express loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
    
    return result !== null ? result : false;
  }, [user, wallet.accountId, api, fetchExpressLoans, throttledApiCall]);
  const canPerformWalletOperations = useCallback(() => {
    return !!(user && wallet.accountId);
  }, [user, wallet.accountId]);

  // Calculate express loan terms
  const calculateExpressLoanTerms = useCallback((parcelValue: number, loanAmount: number) => {
    const ltvRatio = loanAmount / parcelValue;
    const aprRate = 6.0; // Fixed 6% for verified parcels
    const duration = 12; // Fixed 12 months
    const monthlyRate = aprRate / 100 / 12;
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
    const totalRepayment = monthlyPayment * duration;
    const totalInterest = totalRepayment - loanAmount;
    
    return {
      ltvRatio: Math.round(ltvRatio * 100),
      aprRate,
      duration,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalRepayment: Math.round(totalRepayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      maxLoanAmount: Math.floor(parcelValue * 0.7), // 70% max LTV
    };
  }, []);

  // Auto-fetch data on mount and user change
  useEffect(() => {
    if (autoFetch && user) {
      fetchExpressLoans().catch(console.error);
    }
  }, [user, autoFetch, fetchExpressLoans]);

  // Clear data when user logs out
  useEffect(() => {
    if (!user) {
      setExpressLoans([]);
      setError(null);
    }
  }, [user]);

  return {
    // Data
    expressLoans,
    loading,
    error,
    
    // Actions
    fetchExpressLoans,
    createExpressLoan,
    repayExpressLoan,
    
    // Utilities
    canPerformWalletOperations,

    calculateExpressLoanTerms,
    
    // State helpers
    clearError: () => setError(null),
    hasError: !!error,
    isEmpty: expressLoans.length === 0 && !loading,
    hasActiveLoans: expressLoans.some(loan => loan.status === 'ACTIVE'),
  };
};