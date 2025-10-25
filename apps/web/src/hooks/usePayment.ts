// hooks/usePayment.ts - Complete version with async verification
import { useState, useCallback, useRef } from 'react';
import { 
  TransferTransaction, 
  Hbar, 
  AccountId,
  Client,
  TransactionId
} from "@hashgraph/sdk";
import { useWalletConnect } from './useWalletConnect';
import { useAuthStore } from '@/store/authStore';
import { useApi } from './useApi';
import toast from 'react-hot-toast';

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  verified?: boolean;
  verificationPending?: boolean;
  error?: string;
  receipt?: any;
  verificationData?: {
    userAccountId: string;
    expectedAmount: number;
  };
}

interface ExchangeRate {
  USD_to_HBAR: number;
  mint_fee: {
    USD: number;
    HBAR: number;
  };
  network: string;
  operator_account: string;
}

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'connecting' | 'creating' | 'signing' | 'confirming' | 'completed'>('idle');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  
  const isProcessingRef = useRef(false);
  
  const walletConnect = useWalletConnect();
  const { wallet } = useAuthStore();
  const api = useApi();

  // Create Hedera client helper
  const createHederaClient = useCallback((): Client => {
    const network = import.meta.env.VITE_HEDERA_NETWORK || 'testnet';
    
    if (network === 'mainnet') {
      return Client.forMainnet();
    } else {
      return Client.forTestnet();
    }
  }, []);

  // Fetch exchange rate
  const fetchExchangeRate = useCallback(async (): Promise<ExchangeRate> => {
    if (exchangeRate) {
      return exchangeRate;
    }

    try {
      const response = await api.get<ExchangeRate>('api/payment/exchange-rate');
      setExchangeRate(response);
      return response;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      const defaultRate: ExchangeRate = {
        USD_to_HBAR: 0.05,
        mint_fee: { USD: 10, HBAR: 30 },
        network: 'testnet',
        operator_account: import.meta.env.VITE_OPERATOR_ACCOUNT || ''
      };
      setExchangeRate(defaultRate);
      return defaultRate;
    }
  }, [api, exchangeRate]);

  // Connect wallet wrapper
  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      setPaymentStep('connecting');
      
      if (!walletConnect.isInitialized) {
        console.log('Initializing WalletConnect...');
        await walletConnect.initializeConnector();
      }

      const connected = await walletConnect.connect();
      
      if (connected && walletConnect.accountId) {
        toast.success('Wallet connected successfully');
        return true;
      }
      
      toast.error('Failed to connect wallet');
      return false;
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      if (error.message?.includes('cancelled') || error.message?.includes('rejected')) {
        toast.error('Connection cancelled by user');
      } else {
        toast.error(error.message || 'Failed to connect wallet');
      }
      
      return false;
    } finally {
      setPaymentStep('idle');
    }
  }, [walletConnect]);

  // Check if user can afford the payment
  const canProcessPayment = useCallback(async (): Promise<{ canPay: boolean; balance?: number; required?: number }> => {
    try {
      if (!walletConnect.isConnected || !walletConnect.accountId) {
        return { canPay: false, balance: 0, required: 30 };
      }

      const rate = await fetchExchangeRate();

      try {
        const response = await api.get<{
          success: boolean;
          balance: number;
          required: number;
          canPay: boolean;
        }>(`api/payment/check-balance/${walletConnect.accountId}`);

        return {
          canPay: response.canPay,
          balance: response.balance,
          required: response.required
        };
      } catch (apiError) {
        console.warn('API balance check failed:', apiError);
        
        return {
          canPay: false,
          balance: 0,
          required: rate.mint_fee.HBAR
        };
      }
    } catch (error) {
      console.error('Balance check failed:', error);
      return { canPay: false, balance: 0, required: 30 };
    }
  }, [walletConnect.isConnected, walletConnect.accountId, fetchExchangeRate, api]);

  // Process payment with async verification
  const processPayment = useCallback(async (
    amount: number,
    purpose: 'parcel_mint' | 'other' = 'parcel_mint',
    parcelData?: any
  ): Promise<PaymentResult> => {
    
    if (isProcessingRef.current) {
      return { success: false, error: 'Payment already in progress' };
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      console.log('🚀 Starting WalletConnect payment process...');

      // Step 1: Ensure wallet connection
      if (!walletConnect.isConnected) {
        console.log('Wallet not connected, attempting connection...');
        const connected = await connectWallet();
        if (!connected) {
          throw new Error('Failed to connect wallet');
        }
      }

      if (!walletConnect.signer || !walletConnect.accountId) {
        throw new Error('Wallet signer not available');
      }

      const userAccountId = walletConnect.accountId;
      const rate = await fetchExchangeRate();

      console.log('✅ Wallet connected:', userAccountId);

      // Step 2: Check balance
      toast.loading('Checking balance...', { id: 'payment' });
      const balanceCheck = await canProcessPayment();
      if (!balanceCheck.canPay) {
        throw new Error(`Insufficient balance. Required: ${balanceCheck.required} HBAR, Available: ${balanceCheck.balance} HBAR`);
      }

      console.log('✅ Balance check passed');

      // Step 3: Create transaction
      setPaymentStep('creating');
      toast.loading('Creating payment transaction...', { id: 'payment' });

      const operatorAccountId = rate.operator_account;
      const hbarAmount = rate.mint_fee.HBAR;

      console.log('Creating transfer:', {
        from: userAccountId,
        to: operatorAccountId,
        amount: hbarAmount
      });

      // Create transaction and generate ID BEFORE freezeWith
      const transaction = new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(userAccountId), new Hbar(-hbarAmount))
        .addHbarTransfer(AccountId.fromString(operatorAccountId), new Hbar(hbarAmount))
        .setTransactionMemo(`Payment for ${purpose}: ${amount} USD`);

      // MANDATORY: Generate and set TransactionId before freezeWith
      const transactionId = TransactionId.generate(AccountId.fromString(userAccountId));
      transaction.setTransactionId(transactionId);

      console.log('✅ Transaction ID generated:', transactionId.toString());

      // Create Hedera client for freezing
      const hederaClient = createHederaClient();
      
      try {
        // Freeze transaction with Hedera client
        const frozenTx = transaction.freezeWith(hederaClient);
        console.log('✅ Transaction created and frozen with Hedera client');

        // Step 4: Sign and execute transaction using WalletConnect
        setPaymentStep('signing');
        toast.loading(`Signing and executing transaction (${hbarAmount} HBAR)...`, { id: 'payment' });

        console.log('🖊️ Requesting signature and execution from wallet...');
        
        let result;
        try {
          // Pass the frozen Transaction object, NOT bytes
          result = await walletConnect.signAndExecuteTransaction(frozenTx);
          console.log('✅ Transaction signed and executed successfully:', result);
        } catch (signError: any) {
          console.error('❌ Signature/execution failed:', signError);
          
          if (signError.message?.includes('User rejected') || 
              signError.message?.includes('denied') || 
              signError.message?.includes('cancelled') ||
              signError.message?.includes('annulée')) {
            throw new Error('Transaction cancelled by user');
          } else if (signError.message?.includes('insufficient') || 
                     signError.message?.includes('Insufficient')) {
            throw new Error('Insufficient funds for transaction');
          } else if (signError.message?.includes('Transaction object invalide')) {
            throw new Error('Invalid transaction format - Internal error fixed');
          } else {
            throw new Error(`Transaction failed: ${signError.message}`);
          }
        }

        // Step 5: Extract transaction ID from result
        setPaymentStep('confirming');
        toast.loading('Transaction submitted to network...', { id: 'payment' });

        let resultTransactionId: string;
        
        if (result && typeof result === 'object') {
          // Try different possible properties for transaction ID
          if (result.transactionId) {
            resultTransactionId = result.transactionId.toString();
          } else if (result.response && result.response.transactionId) {
            resultTransactionId = result.response.transactionId.toString();
          } else if (result.receipt && result.receipt.transactionId) {
            resultTransactionId = result.receipt.transactionId.toString();
          } else if (result.txId) {
            resultTransactionId = result.txId.toString();
          } else {
            // Fallback: use the transaction ID we generated
            resultTransactionId = transactionId.toString();
            console.log('Using generated transaction ID as fallback:', resultTransactionId);
          }
        } else if (typeof result === 'string' && (result.includes('@') || result.includes('.'))) {
          resultTransactionId = result;
        } else {
          // Use our generated transaction ID
          resultTransactionId = transactionId.toString();
          console.log('Using generated transaction ID:', resultTransactionId);
        }

        console.log('✅ Transaction confirmed:', resultTransactionId);

        // Step 6: Return immediately with verification pending
        setPaymentStep('completed');
        toast.success('Payment transaction submitted!', { id: 'payment' });

        console.log('✅ Payment transaction submitted, ID:', resultTransactionId);
        console.log('🔍 Verification will be done asynchronously by the parent component');

        return {
          success: true,
          transactionId: resultTransactionId,
          verified: false, // Will be verified asynchronously
          verificationPending: true,
          receipt: result,
          // Information for async verification
          verificationData: {
            userAccountId,
            expectedAmount: amount
          }
        };

      } finally {
        // Always close the Hedera client to prevent resource leaks
        hederaClient.close();
      }

    } catch (error: any) {
      setPaymentStep('idle');
      console.error('❌ Payment process failed:', error);

      let errorMessage = 'Payment failed';
      if (error.message?.includes('cancelled') || error.message?.includes('annulée')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('insufficient') || error.message?.includes('Insufficient')) {
        errorMessage = error.message;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Transaction timeout - Please try again';
      } else if (error.message?.includes('network') || error.message?.includes('consensus')) {
        errorMessage = 'Network error - Please try again';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: 'payment' });
      return { success: false, error: errorMessage };

    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [walletConnect, connectWallet, canProcessPayment, fetchExchangeRate, createHederaClient]);

  // Convenience method for mint payments
  const processMintPayment = useCallback(async (parcelData?: any) => {
    const rate = await fetchExchangeRate();
    return await processPayment(rate.mint_fee.USD, 'parcel_mint', parcelData);
  }, [processPayment, fetchExchangeRate]);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setIsProcessing(false);
    setPaymentStep('idle');
  }, []);

  // Diagnostic function for debugging payment issues
  const diagnosePayment = useCallback(() => {
    const diagnosis = {
      walletConnect: {
        isAvailable: walletConnect.isAvailable,
        isInitialized: walletConnect.isInitialized,
        isConnected: walletConnect.isConnected,
        accountId: walletConnect.accountId,
        hasSigner: !!walletConnect.signer,
        hasConnector: !!walletConnect.connector,
        error: walletConnect.initError
      },
      authStore: {
        isConnected: wallet.isConnected,
        accountId: wallet.accountId,
        network: wallet.network
      },
      payment: {
        isProcessing,
        paymentStep,
        hasExchangeRate: !!exchangeRate,
        isProcessingRef: isProcessingRef.current
      },
      environment: {
        hederaNetwork: import.meta.env.VITE_HEDERA_NETWORK || 'testnet',
        operatorAccount: import.meta.env.VITE_OPERATOR_ACCOUNT,
        walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ? 'Set' : 'Not set'
      }
    };

    console.group('🔍 Payment System Diagnosis');
    Object.entries(diagnosis).forEach(([key, value]) => {
      console.group(key);
      console.table(value);
      console.groupEnd();
    });
    console.groupEnd();

    return diagnosis;
  }, [walletConnect, wallet, isProcessing, paymentStep, exchangeRate]);

  return {
    // State
    isProcessing,
    paymentStep,
    exchangeRate,
    
    // Connection status from WalletConnect hook
    isConnected: walletConnect.isConnected,
    currentAccount: walletConnect.accountId,
    connectionError: walletConnect.initError,
    hasConnectionError: walletConnect.hasError,
    
    // Main actions
    connectWallet,
    disconnectWallet: walletConnect.disconnect,
    processPayment,
    processMintPayment,
    canProcessPayment,
    
    // Utilities
    resetPayment,
    fetchExchangeRate,
    verifyConnection: walletConnect.checkConnection,
    diagnosePayment,
    
    // Status helpers
    isReady: walletConnect.isReady && walletConnect.isConnected,
    
    // Debug info
    debug: {
      walletConnect: {
        isAvailable: walletConnect.isAvailable,
        isInitialized: walletConnect.isInitialized,
        isConnected: walletConnect.isConnected,
        accountId: walletConnect.accountId,
        hasSigner: !!walletConnect.signer,
        network: walletConnect.network
      },
      payment: {
        isProcessing,
        paymentStep,
        hasExchangeRate: !!exchangeRate
      }
    }
  };
};