import { useCallback } from 'react';
import { useHashPack } from './useHashPack';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import axios from 'axios';
import { WalletErrorCode, WalletApiError, WalletError } from '@/types/walletErrors';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useWallet = () => {
  const { wallet } = useAuthStore();
  const hashPack = useHashPack();

  const handleWalletApiError = (error: any): WalletError => {
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const apiError = error.response.data as WalletApiError;
        return WalletError.fromApiError(apiError);
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        return new WalletError(WalletErrorCode.SERVER_UNREACHABLE);
      }
      
      return new WalletError(WalletErrorCode.NETWORK_ERROR);
    }
    
    // Handle HashPack errors
    if (error.message?.includes('User rejected') || 
        error.message?.includes('cancelled') ||
        error.message?.includes('denied')) {
      return new WalletError(WalletErrorCode.WALLET_CONNECTION_CANCELLED);
    }
    
    if (error.message?.includes('not installed') ||
        error.message?.includes('not found')) {
      return new WalletError(WalletErrorCode.WALLET_NOT_INSTALLED);
    }
    
    // Default error
    return new WalletError(WalletErrorCode.WALLET_CONNECTION_FAILED);
  };

  const connectWallet = useCallback(async () => {
    if (hashPack.isConnecting) {
      toast('Connection in progress...', { icon: '⏳' });
      return;
    }

    let walletConnected = false;

    try {
      // Step 1: Connect to HashPack wallet
      console.log('🔗 Connecting to HashPack...');
      await hashPack.connect();
      walletConnected = true;

      // Step 2: Verify connection
      const { wallet: storeWallet, token } = useAuthStore.getState();
      
      if (!storeWallet.isConnected || !storeWallet.accountId) {
        throw new WalletError(WalletErrorCode.WALLET_CONNECTION_FAILED);
      }

      if (!token) {
        toast.error('You must be logged in to connect a wallet');
        await hashPack.disconnect();
        return;
      }

      // Step 3: Save wallet to backend
      console.log('💾 Saving wallet to backend:', storeWallet.accountId);
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/user/wallet`,
          { walletHedera: storeWallet.accountId },
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 second timeout
          }
        );

        console.log('✅ Wallet saved successfully:', response.data);
        
        toast.success(
          `Wallet connected: ${storeWallet.accountId}`,
          { duration: 4000, icon: '🎉' }
        );

        return response.data;

      } catch (backendError: any) {
        console.error('⚠️ Backend error:', backendError);
        
        // MODIFICATION: Si 409, afficher l'erreur et déconnecter
        if (axios.isAxiosError(backendError) && backendError.response?.status === 409) {
          const errorMessage = backendError.response.data?.message || 'Ce wallet est déjà connecté à un autre compte';
          
          toast.error(errorMessage, { 
            duration: 6000,
            icon: '❌'
          });

          // Déconnecter le wallet car il ne peut pas être enregistré
          await hashPack.disconnect();
          
          throw new Error(errorMessage);
        }
        
        const walletError = handleWalletApiError(backendError);
        
        // Show detailed error message
        toast.error(walletError.getUserMessage(), { 
          duration: 6000,
          icon: '❌'
        });

        // Disconnect wallet if backend save failed
        await hashPack.disconnect();
        
        throw walletError;
      }

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      // Only disconnect if we successfully connected to HashPack
      if (walletConnected) {
        try {
          await hashPack.disconnect();
        } catch (disconnectError) {
          console.warn('Failed to disconnect after error:', disconnectError);
        }
      }
      
      // Handle error if not already a WalletError
      if (!(error instanceof WalletError)) {
        const walletError = handleWalletApiError(error);
        toast.error(walletError.getUserMessage(), {
          duration: 5000,
          icon: '❌'
        });
      }
      
      throw error;
    }
  }, [hashPack]);

  const disconnectWallet = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      await hashPack.disconnect();
      toast.success('Wallet disconnected', { icon: '👋' });
    } catch (error) {
      console.error('❌ Disconnection error:', error);
      toast.error('Failed to disconnect wallet');
      throw error;
    }
  }, [hashPack]);

  const executeTransaction = useCallback(async (transactionBytes: Uint8Array) => {
    if (!hashPack.isConnected) {
      const error = 'Wallet not connected. Please connect your wallet first.';
      toast.error(error);
      throw new Error(error);
    }

    try {
      console.log('🚀 Executing transaction...');
      const result = await hashPack.signAndExecuteTransaction(transactionBytes);
      console.log('✅ Transaction executed:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Transaction error:', error);
      
      if (error.message?.includes('insufficient')) {
        toast.error('Insufficient balance for transaction');
      } else if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Transaction failed. Please try again.');
      }
      
      throw error;
    }
  }, [hashPack]);

  const signTransaction = useCallback(async (transactionBytes: Uint8Array) => {
    if (!hashPack.isConnected) {
      const error = 'Wallet not connected. Please connect your wallet first.';
      toast.error(error);
      throw new Error(error);
    }

    try {
      console.log('✍️ Signing transaction...');
      const result = await hashPack.signTransaction(transactionBytes);
      console.log('✅ Transaction signed');
      return result;
    } catch (error: any) {
      console.error('❌ Signature error:', error);
      
      if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
        toast.error('Signature cancelled');
      } else {
        toast.error('Failed to sign transaction');
      }
      
      throw error;
    }
  }, [hashPack]);

  return {
    // Connection state
    isConnected: hashPack.isConnected,
    isConnecting: hashPack.isConnecting,
    isAvailable: hashPack.isAvailable,
    error: hashPack.error,

    // Account info
    accountId: hashPack.accountId,
    network: hashPack.network,

    // Actions
    connectWallet,
    disconnectWallet,
    executeTransaction,
    signTransaction,

    // Store info
    walletInfo: wallet,
  };
};