import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useApi } from './useApi';
import toast from 'react-hot-toast';

export interface P2PLoan {
  id: string;
  borrowerId: string;
  lenderId?: string;
  parcelId: string;
  principalUsd: number;
  interestRate: number;
  duration: number;
  collateralRatio: number;
  status: 'OPEN' | 'FUNDED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'LIQUIDATED';
  terms: {
    description: string;
    autoLiquidation: boolean;
    gracePeriod: number;
    penaltyRate: number;
    earlyRepaymentAllowed: boolean;
    partialRepaymentAllowed: boolean;
  };
  createdAt: string;
  fundedAt?: string;
  dueDate?: string;
  borrower: {
    id: string;
    displayName: string;
    email: string;
    walletHedera: string | null;
    reputationScore: number;
    completedLoans: number;
    defaultedLoans: number;
    verifiedTransactions: number;
    communityEndorsements: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  lender?: {
    id: string;
    displayName: string;
    email: string;
    walletHedera: string | null;
    reputationScore: number;
    completedLoans: number;
    defaultedLoans: number;
    verifiedTransactions: number;
    communityEndorsements: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  parcel: {
    id: string;
    title: string;
    description?: string;
    latitude: number;
    longitude: number;
    areaM2: number;
    priceUsd?: number;
    htsTokenId?: string;
    verificationType: 'VERIFIED' | 'UNVERIFIED';
    verificationDetails?: any;
    riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
    docUrl?: string;
    status: 'DRAFT' | 'LISTED' | 'SOLD' | 'COLLATERALIZED';
    owner: {
      id: string;
      displayName: string;
      walletHedera?: string | null;
    };
  };
  offers?: LoanOffer[];
  activities?: Activity[];
}

export interface LoanOffer {
  id: string;
  loanId: string;
  lenderId: string;
  lender: {
    id: string;
    displayName: string;
    reputationScore: number;
    completedLoans: number;
    defaultedLoans: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  offeredAmount: number;
  interestRate: number;
  terms: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface Activity {
  id: string;
  parcelId?: string;
  loanId?: string;
  type: string;
  ref?: string;
  metadata?: any;
  createdAt: string;
}

export interface CreateLoanRequest {
  parcelId: string;
  principalUsd: number;
  interestRate: number;
  duration: number;
  collateralRatio: number;
  terms: {
    description: string;
    autoLiquidation: boolean;
    gracePeriod: number;
    penaltyRate: number;
    earlyRepaymentAllowed: boolean;
    partialRepaymentAllowed: boolean;
  };
}

interface UseP2PLoansOptions {
  autoFetch?: boolean;
  limit?: number;
  throttleMs?: number; // Délai minimum entre les requêtes (défaut: 1000ms)
}

// Classe pour gérer le throttling global des requêtes
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

export const useP2PLoans = (options: UseP2PLoansOptions = {}) => {
  const { autoFetch = true, limit = 20, throttleMs = 1000 } = options;
  
  const [loans, setLoans] = useState<P2PLoan[]>([]);
  const [myLoans, setMyLoans] = useState<P2PLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, wallet } = useAuthStore();
  const api = useApi();
  
  // Instance unique du throttler pour ce hook
  const throttlerRef = useRef<RequestThrottler>(new RequestThrottler(throttleMs));
  
  // Fonction helper pour wrapper les appels API avec throttling
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
      // Re-throw l'erreur pour que la fonction appelante puisse la gérer
      throw error;
    }
  }, []);

  // Clear error when user changes
  useEffect(() => {
    setError(null);
  }, [user]);

  // Fetch all available P2P loans avec throttling
  const fetchLoans = useCallback(async (filterOptions?: { verification?: 'verified' | 'unverified' }) => {
    if (!user) {
      setLoans([]);
      return;
    }
    
    const endpoint = 'fetchLoans';
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          ...(filterOptions?.verification && { verification: filterOptions.verification })
        });

        const response = await api.get(`api/p2p-loans?${queryParams}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response?.loans) {
          setLoans(response.loans);
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
          const errorMessage = err.message || 'Failed to fetch loans';
          setError(errorMessage);
          console.error('Fetch loans error:', err);
          
          if (!err.message?.includes('timeout')) {
            toast.error(errorMessage);
          }
        }
        throw err;
      } finally {
        setLoading(false);
      }
    }, { silent: true });

    // Si la requête a été throttlée, ne pas modifier l'état
    if (result === null) {
      return;
    }
  }, [user, api, limit, throttledApiCall]);

  // Fetch user's loans avec throttling
  const fetchMyLoans = useCallback(async () => {
    if (!user) {
      setMyLoans([]);
      return;
    }
    
    const endpoint = 'fetchMyLoans';
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await api.get('api/p2p-loans/my-loans', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response?.loans) {
          setMyLoans(response.loans);
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
          const errorMessage = err.message || 'Failed to fetch your loans';
          setError(errorMessage);
          console.error('Fetch my loans error:', err);
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

  // Get loan details avec throttling
  const getLoanDetails = useCallback(async (loanId: string): Promise<P2PLoan | null> => {
    if (!loanId) {
      throw new Error('Invalid loan ID');
    }
    
    const endpoint = `getLoanDetails-${loanId}`;
    
    // Pour les détails de loan, on peut être moins restrictif sur le throttling
    // ou même le désactiver complètement car c'est une opération ponctuelle
    if (!throttlerRef.current.canMakeRequest(endpoint)) {
      console.log('Request throttled, but proceeding anyway for loan details');
      // On procède quand même pour les détails de loan car c'est critique
      throttlerRef.current.lastRequestTimes.set(endpoint, Date.now());
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await api.get(`api/p2p-loans/${loanId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response) {
        throw new Error('No response from server');
      }
  
      if (!response.loan) {
        // Vraiment pas de loan trouvé
        return null;
      }
      
      return response.loan;
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      
      // Log l'erreur pour debugging
      console.error('Get loan details error:', {
        loanId,
        error: err.message,
        status: err.status,
        response: err.response
      });
      
      // Ne pas setter l'erreur globale pour cette fonction
      // car elle peut être utilisée dans différents contextes
      throw err;
    }
  }, [api]);
  
  // Alternative : fonction sans throttling pour les détails
  const getLoanDetailsNoThrottle = useCallback(async (loanId: string): Promise<P2PLoan | null> => {
    if (!loanId) {
      throw new Error('Invalid loan ID');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      console.log(`Fetching loan details for ID: ${loanId}`);
      
      const response = await api.get(`api/p2p-loans/${loanId}`, {
        signal: controller
      });
      
      clearTimeout(timeoutId);
      
      console.log('Loan details response:', response);
      
      if (!response) {
        console.error('No response received from server');
        throw new Error('No response from server');
      }
  
      if (!response.loan) {
        console.error('No loan data in response:', response);
        return null;
      }
      
      return response.loan;
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      console.error('Get loan details error:', {
        loanId,
        error: err.message,
        status: err.status,
        url: `api/p2p-loans/${loanId}`,
        response: err.response
      });
      
      if (err.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      
      throw err;
    }
  }, [api]);

  // Create loan avec throttling
  const createLoan = useCallback(async (loanData: CreateLoanRequest): Promise<P2PLoan | null> => {
    if (!user) {
      toast.error('Please login first');
      return null;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet to create loan requests');
      return null;
    }
    
    const endpoint = 'createLoan';
    
    return await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      try {
        const response = await api.post('api/p2p-loans', loanData, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.loan) {
          throw new Error('Invalid response from server');
        }
        
        toast.success('Loan request created successfully!');
        
        // Refresh data en arrière-plan
        fetchMyLoans().catch(console.error);
        
        return response.loan;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to create loan request';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - please try again';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Create loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
  }, [user, wallet.accountId, api, fetchMyLoans, throttledApiCall]);

  // Fund loan avec throttling
  const fundLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet to fund loans');
      return false;
    }
    
    const endpoint = `fundLoan-${loanId}`;
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await api.post(`api/p2p-loans/${loanId}/fund`, {
          lenderAccountId: wallet.accountId
        }, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.loan) {
          throw new Error('Failed to fund loan');
        }
        
        toast.success('Loan funded successfully!');
        
        // Refresh data en arrière-plan
        Promise.all([
          fetchLoans().catch(console.error),
          fetchMyLoans().catch(console.error)
        ]);
        
        return true;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to fund loan';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - blockchain operations can take time. Please check your transaction status.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Fund loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
    
    return result !== null ? result : false;
  }, [user, wallet.accountId, api, fetchLoans, fetchMyLoans, throttledApiCall]);

  // Repay loan avec throttling
  const repayLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet to repay loans');
      return false;
    }
    
    const endpoint = `repayLoan-${loanId}`;
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await api.post(`api/p2p-loans/${loanId}/repay`, {
          repaymentAccountId: wallet.accountId
        }, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.loan) {
          throw new Error('Failed to repay loan');
        }
        
        toast.success('Loan repaid successfully!');
        
        fetchMyLoans().catch(console.error);
        
        return true;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to repay loan';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - blockchain operations can take time. Please check your transaction status.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Repay loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
    
    return result !== null ? result : false;
  }, [user, wallet.accountId, api, fetchMyLoans, throttledApiCall]);

  // Liquidate loan avec throttling
  const liquidateLoan = useCallback(async (loanId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    
    if (!wallet.accountId) {
      toast.error('Please connect your Hedera wallet to liquidate collateral');
      return false;
    }
    
    const endpoint = `liquidateLoan-${loanId}`;
    
    const result = await throttledApiCall(endpoint, async () => {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await api.post(`api/p2p-loans/${loanId}/claim-collateral`, {}, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response?.success) {
          throw new Error('Failed to liquidate collateral');
        }
        
        toast.success('Collateral claimed successfully!');
        
        fetchMyLoans().catch(console.error);
        
        return true;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Failed to liquidate collateral';
        
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - blockchain operations can take time. Please check your transaction status.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Liquidate loan error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    });
    
    return result !== null ? result : false;
  }, [user, wallet.accountId, api, fetchMyLoans, throttledApiCall]);

  // Calculate loan metrics (pas de throttling nécessaire - calcul local)
  const calculateLoanMetrics = useCallback((loan: P2PLoan) => {
    const totalRepayment = loan.principalUsd * (1 + (loan.interestRate * loan.duration / 12));
    const monthlyPayment = totalRepayment / loan.duration;
    const totalInterest = totalRepayment - loan.principalUsd;
    const effectiveAnnualRate = ((totalRepayment / loan.principalUsd) ** (12 / loan.duration) - 1) * 100;
    
    let daysRemaining = 0;
    if (loan.dueDate) {
      const dueDate = new Date(loan.dueDate);
      const today = new Date();
      daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const isOverdue = daysRemaining < 0;
    const isNearDue = daysRemaining <= 7 && daysRemaining > 0;
    
    return {
      totalRepayment: Math.round(totalRepayment * 100) / 100,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      effectiveAnnualRate: Math.round(effectiveAnnualRate * 100) / 100,
      daysRemaining: Math.abs(daysRemaining),
      isOverdue,
      isNearDue
    };
  }, []);

  // Get risk level (pas de throttling nécessaire - calcul local)
  const getRiskLevel = useCallback((loan: P2PLoan): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const { verificationType, verificationDetails, riskAssessment } = loan.parcel;
    const { reputationScore, defaultedLoans, completedLoans, riskLevel: borrowerRisk } = loan.borrower;
    
    // Calculate risk factors
    const verificationRisk = verificationType === 'VERIFIED' ? 0 : 2;
    const reputationRisk = reputationScore < 50 ? 2 : reputationScore < 80 ? 1 : 0;
    const historyRisk = defaultedLoans > 0 ? Math.min(defaultedLoans, 3) : 0;
    const experienceRisk = completedLoans < 3 ? 1 : 0;
    const parcelRisk = riskAssessment === 'HIGH' ? 2 : riskAssessment === 'MEDIUM' ? 1 : 0;
    const borrowerRiskScore = borrowerRisk === 'HIGH' ? 2 : borrowerRisk === 'MEDIUM' ? 1 : 0;
    
    const totalRisk = verificationRisk + reputationRisk + historyRisk + experienceRisk + parcelRisk + borrowerRiskScore;
    
    if (totalRisk <= 2) return 'LOW';
    if (totalRisk <= 5) return 'MEDIUM';
    return 'HIGH';
  }, []);

  // Utility functions (pas de throttling nécessaire)
  const canPerformWalletOperations = useCallback(() => {
    return user && wallet.accountId;
  }, [user, wallet.accountId]);

  const getWalletStatus = useCallback(() => {
    if (!user) {
      return { connected: false, message: 'Please login first' };
    }
    
    if (!wallet.accountId) {
      return { connected: false, message: 'Wallet not connected. Some features may be limited.' };
    }
    
    return { connected: true, message: 'Wallet connected' };
  }, [user, wallet.accountId]);

  // Auto-fetch data on mount and user change
  useEffect(() => {
    if (autoFetch && user) {
      fetchLoans().catch(console.error);
      fetchMyLoans().catch(console.error);
    }
  }, [user, autoFetch, fetchLoans, fetchMyLoans]);

  // Clear data when user logs out
  useEffect(() => {
    if (!user) {
      setLoans([]);
      setMyLoans([]);
      setError(null);
    }
  }, [user]);

  return {
    // Data
    loans,
    myLoans,
    loading,
    error,
    
    // Actions (avec throttling)
    fetchLoans,
    fetchMyLoans,
    getLoanDetails,
    createLoan,
    fundLoan,
    repayLoan,
    liquidateLoan,
    
    // Utilities (sans throttling - calculs locaux)
    calculateLoanMetrics,
    getRiskLevel,
    canPerformWalletOperations,
    getWalletStatus,
    
    // State helpers
    clearError: () => setError(null),
    hasError: !!error,
    isEmpty: loans.length === 0 && !loading,
    hasMyLoans: myLoans.length > 0,
    
    // Throttling utilities
    throttler: throttlerRef.current,
  };
};