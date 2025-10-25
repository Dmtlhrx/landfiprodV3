// hooks/usePaymentVerification.ts
import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import toast from 'react-hot-toast';

export interface VerificationStatus {
  transactionId: string;
  status: 'verifying' | 'verified' | 'failed' | 'pending';
  attempts: number;
  lastError?: string;
  verifiedAt?: Date;
}

interface VerificationResult {
  success: boolean;
  pending?: boolean;
  payment?: any;
  message?: string;
  retryAfter?: number;
}

export const usePaymentVerification = () => {
  const [verifications, setVerifications] = useState<Map<string, VerificationStatus>>(new Map());
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const api = useApi();

  /**
   * Vérifie un paiement une seule fois
   */
  const verifySinglePayment = useCallback(async (
    transactionId: string,
    userAccountId: string,
    expectedAmount: number
  ): Promise<VerificationResult> => {
    try {
      const response = await api.post<VerificationResult>('api/payment/verify-payment', {
        transactionId,
        userAccountId,
        expectedAmount
      }, {
        timeout: 12000 // 12 secondes timeout
      });

      return response;
    } catch (error: any) {
      console.warn('Verification request failed:', error.message);
      
      // Si c'est un timeout, traiter comme "pending"
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        return {
          success: false,
          pending: true,
          message: 'Verification timeout',
          retryAfter: 5
        };
      }

      throw error;
    }
  }, [api]);

  /**
   * Lance la vérification avec polling automatique
   */
  const startVerification = useCallback(async (
    transactionId: string,
    userAccountId: string,
    expectedAmount: number,
    onVerified?: (result: VerificationResult) => void,
    onFailed?: (error: string) => void
  ) => {
    // Nettoyer toute vérification existante pour cette transaction
    if (pollingIntervals.current.has(transactionId)) {
      clearInterval(pollingIntervals.current.get(transactionId));
      pollingIntervals.current.delete(transactionId);
    }

    // Initialiser le statut
    setVerifications(prev => new Map(prev).set(transactionId, {
      transactionId,
      status: 'verifying',
      attempts: 0
    }));

    const maxAttempts = 12; // 12 tentatives maximum
    let attempts = 0;
    let verified = false;

    const verify = async () => {
      attempts++;
      console.log(`🔍 Verification attempt ${attempts}/${maxAttempts} for ${transactionId}`);

      try {
        const result = await verifySinglePayment(transactionId, userAccountId, expectedAmount);

        if (result.success) {
          // ✅ Vérification réussie
          console.log('✅ Payment verified successfully:', transactionId);
          
          setVerifications(prev => new Map(prev).set(transactionId, {
            transactionId,
            status: 'verified',
            attempts,
            verifiedAt: new Date()
          }));

          // Arrêter le polling
          if (pollingIntervals.current.has(transactionId)) {
            clearInterval(pollingIntervals.current.get(transactionId));
            pollingIntervals.current.delete(transactionId);
          }

          verified = true;
          toast.success('Payment verified on Hedera network!', { id: `verify-${transactionId}` });
          
          if (onVerified) {
            onVerified(result);
          }
        } else if (result.pending) {
          // ⏳ Transaction en attente, continuer le polling
          console.log(`⏳ Transaction pending, retry in ${result.retryAfter || 5}s...`);
          
          setVerifications(prev => new Map(prev).set(transactionId, {
            transactionId,
            status: 'pending',
            attempts,
            lastError: result.message
          }));

          // Attendre avant la prochaine tentative
          if (attempts >= maxAttempts) {
            throw new Error('Maximum verification attempts reached');
          }
        } else {
          // ❌ Échec définitif
          throw new Error(result.message || 'Verification failed');
        }
      } catch (error: any) {
        console.error(`❌ Verification error (attempt ${attempts}):`, error.message);

        if (attempts >= maxAttempts) {
          // Échec après toutes les tentatives
          console.error('❌ Verification failed after all attempts');
          
          setVerifications(prev => new Map(prev).set(transactionId, {
            transactionId,
            status: 'failed',
            attempts,
            lastError: error.message
          }));

          // Arrêter le polling
          if (pollingIntervals.current.has(transactionId)) {
            clearInterval(pollingIntervals.current.get(transactionId));
            pollingIntervals.current.delete(transactionId);
          }

          toast.error('Payment verification failed. Transaction may still be valid.', { 
            id: `verify-${transactionId}`,
            duration: 8000 
          });
          
          if (onFailed) {
            onFailed(error.message);
          }
        }
      }
    };

    // Première vérification immédiate
    await verify();

    // Si pas encore vérifié, lancer le polling
    if (!verified && attempts < maxAttempts) {
      const interval = setInterval(verify, 5000); // Toutes les 5 secondes
      pollingIntervals.current.set(transactionId, interval);

      // Auto-cleanup après 60 secondes
      setTimeout(() => {
        if (pollingIntervals.current.has(transactionId)) {
          clearInterval(pollingIntervals.current.get(transactionId));
          pollingIntervals.current.delete(transactionId);
          
          console.warn(`⏰ Auto-cleanup: Stopped verification polling for ${transactionId}`);
        }
      }, 60000);
    }
  }, [verifySinglePayment]);

  /**
   * Arrête la vérification d'une transaction
   */
  const stopVerification = useCallback((transactionId: string) => {
    if (pollingIntervals.current.has(transactionId)) {
      clearInterval(pollingIntervals.current.get(transactionId));
      pollingIntervals.current.delete(transactionId);
      console.log(`⏹️ Stopped verification for ${transactionId}`);
    }
  }, []);

  /**
   * Nettoie toutes les vérifications en cours
   */
  const cleanup = useCallback(() => {
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current.clear();
    setVerifications(new Map());
    console.log('🧹 Cleaned up all payment verifications');
  }, []);

  /**
   * Obtient le statut d'une vérification
   */
  const getVerificationStatus = useCallback((transactionId: string): VerificationStatus | undefined => {
    return verifications.get(transactionId);
  }, [verifications]);

  return {
    // Actions
    startVerification,
    stopVerification,
    cleanup,
    verifySinglePayment,

    // État
    verifications: Array.from(verifications.values()),
    getVerificationStatus,
    
    // Statut global
    hasActiveVerifications: pollingIntervals.current.size > 0,
    activeCount: pollingIntervals.current.size
  };
};