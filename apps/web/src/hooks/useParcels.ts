import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import { useParcelStore } from '@/store/parcelStore';
import { useAuthStore } from '@/store/authStore';
import { usePayment } from './usePayment';
import { useNavigate } from 'react-router-dom';
import { Parcel } from '@hedera-africa/ui';
import toast from 'react-hot-toast';

interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  url?: string;
  status: 'ready' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
  file?: File;
}

// Global cache to prevent repeated requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const useParcels = () => {
  const { parcels, setParcels, setLoading, setError } = useParcelStore();
  const { wallet } = useAuthStore();
  const { processMintPayment } = usePayment();
  const navigate = useNavigate();
  
  // Use useRef for active operations Set to prevent re-creations
  const activeOperations = useRef(new Set<string>());
  const api = useApi<{ parcels?: Parcel[]; parcel?: Parcel }>();

  /** ----------- Cache Functions ----------- */
  const getCachedData = (key: string) => {
    const cached = requestCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    requestCache.set(key, { data, timestamp: Date.now() });
  };

  /** ----------- Retry with Enhanced Backoff ----------- */
  const fetchWithRetry = async <T,>(
    requestFn: () => Promise<T>,
    operationId?: string,
    retries = 3,
    initialDelay = 1500,
    maxDelay = 30000
  ): Promise<T> => {
    // Check cache first for read operations
    if (operationId?.includes('fetch') || operationId?.includes('get')) {
      const cached = getCachedData(operationId);
      if (cached) {
        console.log(`Cache hit for ${operationId}`);
        return cached;
      }
    }

    // Check if operation is already in progress
    if (operationId && activeOperations.current.has(operationId)) {
      console.warn(`Operation ${operationId} already in progress, skipping...`);
      return Promise.reject(new Error(`Operation ${operationId} already in progress`));
    }

    // Mark operation as active
    if (operationId) {
      activeOperations.current.add(operationId);
    }

    let currentDelay = initialDelay;

    try {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const result = await requestFn();
          
          // Cache result for read operations
          if (operationId?.includes('fetch') || operationId?.includes('get')) {
            setCachedData(operationId, result);
          }
          
          return result;
        } catch (error: any) {
          // Check various error structures for rate limiting
          const isRateLimit = 
            error?.response?.status === 429 || 
            error?.status === 429 || 
            error?.message?.includes('Too Many Requests') ||
            (typeof error === 'object' && error.constructor?.name === 'HTTPError' && error.response?.status === 429);

          if (isRateLimit && attempt < retries - 1) {
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 0.3 * currentDelay;
            const delayWithJitter = currentDelay + jitter;
            
            console.warn(
              `Rate limited (attempt ${attempt + 1}/${retries}) for ${operationId}. ` +
              `Retry in ${Math.round(delayWithJitter)}ms...`
            );
            
            await new Promise((resolve) => setTimeout(resolve, delayWithJitter));
            currentDelay = Math.min(currentDelay * 2, maxDelay);
          } else {
            throw error;
          }
        }
      }
      throw new Error(`Failed after ${retries} attempts (Rate Limited) for ${operationId}`);
    } finally {
      // Clean up active operation
      if (operationId) {
        activeOperations.current.delete(operationId);
      }
    }
  };

  /** ----------- Fetch Parcels (Public) ----------- */
  const fetchParcels = useCallback(async (filters?: Record<string, string>) => {
    const cacheKey = `fetch-parcels-${JSON.stringify(filters || {})}`;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters || {});
      const response = await fetchWithRetry(
        () => api.get(`api/parcels?${queryParams.toString()}`),
        cacheKey,
        4,
        2000
      );
      
      if (response.parcels) {
        setParcels(response.parcels);
      }
      return response.parcels || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Loading error';
      setError(errorMessage);
      console.error('Error fetchParcels:', errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, setParcels, setError, setLoading]);

  /** ----------- Fetch My Parcels (Private) ----------- */
  const fetchMyParcels = useCallback(async () => {
    const key = wallet?.accountId ? `fetch-my-parcels-${wallet.accountId}` : 'fetch-my-parcels-guest';
  
    return fetchWithRetry(
      async () => {
        const response = await api.get('api/parcels/my/parcels');
        return response.parcels || [];
      },
      key,
      4,
      2000
    );
  }, [api, wallet?.accountId]);

  /** ----------- Get Parcel Details ----------- */
  const getParcelDetails = useCallback(async (parcelId: string) => {
    if (!parcelId) {
      throw new Error('Missing parcel ID');
    }

    try {
      return await fetchWithRetry(
        async () => {
          const response = await api.get(`api/parcels/${parcelId}`);
          
          if (!response) {
            throw new Error('Empty server response');
          }
          
          if (!response.parcel) {
            throw new Error('Missing parcel data in response');
          }
          
          console.log('Parcel details loaded:', {
            id: response.parcel.id,
            title: response.parcel.title,
            status: response.parcel.status
          });
          
          return response;
        },
        `get-parcel-${parcelId}`,
        3,
        1000
      );
    } catch (error) {
      console.error('Error in getParcelDetails:', {
        parcelId,
        error: error.message
      });
      
      throw new Error(`Unable to load parcel ${parcelId}: ${error.message}`);
    }
  }, [api]);

  /** ----------- Upload Documents ----------- */
  const uploadDocuments = useCallback(async (parcelId: string, files: File[]) => {
    if (!files.length) return [];

    const operationId = `upload-docs-${parcelId}`;
    
    return fetchWithRetry(async () => {
      const formData = new FormData();
      files.forEach(file => formData.append('documents', file));

      const response = await api.post(`api/parcels/${parcelId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return response.uploadResults || [];
    }, operationId, 2, 1000);
  }, [api]);

  /** ----------- Create Parcel ----------- */
  const createParcel = useCallback(async (parcelData: Partial<Parcel>, pendingFiles?: UploadedFile[]) => {
    const operationId = `create-parcel-${Date.now()}`;
    
    return fetchWithRetry(async () => {
      // Create the parcel
      const response = await api.post('api/parcels', parcelData);
      if (!response.parcel) {
        throw new Error('Invalid server response during creation');
      }
      
      const createdParcel = response.parcel;
      toast.success('Parcel created successfully!');

      // Invalidate related caches
      for (const [key] of requestCache.entries()) {
        if (key.includes('fetch-parcels')) {
          requestCache.delete(key);
        }
      }

      // Upload files if available
      if (pendingFiles && pendingFiles.length > 0) {
        console.log(`Uploading ${pendingFiles.length} files for parcel ${createdParcel.id}`);
        
        try {
          const uploadResults = await uploadDocuments(
            createdParcel.id, 
            pendingFiles.map(f => f.file!).filter(Boolean)
          );
          
          const successCount = uploadResults.filter(r => r.status === 'success').length;
          const errorCount = uploadResults.filter(r => r.status === 'error').length;
          
          if (successCount > 0) {
            toast.success(`${successCount} document(s) uploaded successfully!`);
          }
          if (errorCount > 0) {
            toast.error(`${errorCount} document(s) could not be uploaded`);
          }
        } catch (uploadError) {
          console.error('Error during document upload:', uploadError);
          toast.error('Parcel created but error during document upload');
        }
      }

      return createdParcel;
    }, operationId, 3, 1000);
  }, [api, uploadDocuments]);

  /** ----------- Mint Parcel (without payment) ----------- */
  const mintParcel = useCallback(async (parcelId: string) => {
    if (!wallet.accountId) {
      throw new Error('Wallet not connected');
    }

    return fetchWithRetry(async () => {
      const response = await api.post<{
        mintResult: { transactionId: string; tokenId: string };
      }>('api/parcels/mint', {
        parcelId,
        userAccountId: wallet.accountId,
      });

      if (!response.mintResult) {
        throw new Error('Invalid server response during minting');
      }

      const { transactionId, tokenId } = response.mintResult;

      toast.success(`Parcel tokenized successfully! TxID: ${transactionId}`);

      // Invalidate caches and refresh
      for (const [key] of requestCache.entries()) {
        if (key.includes('fetch-parcels') || key.includes('get-parcel')) {
          requestCache.delete(key);
        }
      }

      // Refresh parcel list (without waiting)
      setTimeout(() => fetchParcels().catch(console.error), 1000);

      return { transactionId, tokenId };
    }, `mint-parcel-${parcelId}`, 3, 1500);
  }, [api, wallet.accountId, fetchParcels]);

  /** ----------- Delist Parcel ----------- */
  const delistParcel = useCallback(async (parcelId: string) => {
 

    return fetchWithRetry(async () => {
      const response = await api.patch(`api/parcels/${parcelId}/delist`, {
        status: 'MINTED'
      });

      if (!response.parcel) {
        throw new Error('Invalid server response during delisting');
      }

      toast.success('Parcel delisted successfully!');

      // Invalidate caches
      for (const [key] of requestCache.entries()) {
        if (key.includes('fetch-parcels') || key.includes('get-parcel')) {
          requestCache.delete(key);
        }
      }

      // Refresh parcel list
      setTimeout(() => fetchParcels().catch(console.error), 1000);

      return response.parcel;
    }, `delist-parcel-${parcelId}`, 3, 1500);
  }, [api, wallet.accountId, fetchParcels]);

  /** ----------- ENHANCED: Create + Pay + Mint with Step Callbacks ----------- */
  const createAndMintParcel = useCallback(async (
    parcelData: Partial<Parcel>, 
    pendingFiles?: UploadedFile[],
    onStepUpdate?: (stepId: string, status: 'pending' | 'processing' | 'completed' | 'error', error?: string, details?: string) => void
  ) => {
    if (!wallet.accountId) {
      throw new Error('Wallet not connected');
    }
  
    const operationId = `create-mint-parcel-${Date.now()}`;
    
    console.log('Starting complete process: create + pay + mint');

    const updateStep = (stepId: string, status: any, error?: string, details?: string) => {
      if (onStepUpdate) {
        onStepUpdate(stepId, status, error, details);
      }
    };
  
    try {
      // Step 1: Process payment
      updateStep('payment-processing', 'processing', undefined, 'Processing HBAR payment...');
      console.log('Step 1: Processing payment');
      
      const paymentResult = await processMintPayment(parcelData);
      
      // Enhanced payment verification
      if (!paymentResult || !paymentResult.success) {
        const errorMsg = paymentResult?.error || 'Payment failed - no result';
        console.error('Payment failed:', errorMsg);
        updateStep('payment-processing', 'error', errorMsg);
        throw new Error(errorMsg);
      }
  
      if (!paymentResult.transactionId) {
        console.error('Payment succeeded but no transaction ID');
        updateStep('payment-processing', 'error', 'Payment completed but transaction ID missing');
        throw new Error('Payment completed but transaction ID missing');
      }

      updateStep('payment-processing', 'completed', undefined, `Payment successful: ${paymentResult.transactionId.slice(0, 12)}...`);
      console.log('✅ Payment successful:', {
        transactionId: paymentResult.transactionId,
        success: paymentResult.success
      });
  
      // Wait after payment to avoid conflicts
      await new Promise(resolve => setTimeout(resolve, 3000));
  
      // Step 2: Create parcel with payment reference
      updateStep('parcel-creation', 'processing', undefined, 'Creating parcel on blockchain...');
      console.log('📄 Step 2: Creating parcel');
      
      const parcelWithPayment = {
        ...parcelData,
        paymentTransactionId: paymentResult.transactionId
      };
  
      const response = await fetchWithRetry(async () => {
        return await api.post('api/parcels', parcelWithPayment);
      }, `create-parcel-${Date.now()}`, 3, 1000);
  
      if (!response.parcel) {
        console.error('Parcel creation failed - no parcel in response');
        updateStep('parcel-creation', 'error', 'Failed to create parcel - invalid server response');
        throw new Error('Failed to create parcel - invalid server response');
      }
      
      const createdParcel = response.parcel;
      updateStep('parcel-creation', 'completed', undefined, `Parcel created: ${createdParcel.id}`);
      console.log('✅ Parcel created:', createdParcel.id);
  
      // Step 3: Upload documents
      let uploadResults = [];
      if (pendingFiles && pendingFiles.length > 0) {
        updateStep('document-upload', 'processing', undefined, `Uploading ${pendingFiles.length} documents...`);
        console.log(`📎 Step 3: Uploading ${pendingFiles.length} files`);
        
        try {
          uploadResults = await uploadDocuments(
            createdParcel.id, 
            pendingFiles.map(f => f.file!).filter(Boolean)
          );
          
          const successCount = uploadResults.filter(r => r.status === 'success').length;
          updateStep('document-upload', 'completed', undefined, `${successCount} documents uploaded successfully`);
          console.log(`✅ ${successCount} document(s) uploaded`);
        } catch (uploadError) {
          updateStep('document-upload', 'error', 'Upload failed but continuing to mint');
          console.warn('⚠️ Upload error, continuing to minting:', uploadError);
        }
      } else {
        updateStep('document-upload', 'completed', undefined, 'No documents to upload');
      }
  
      // Step 4: Mint the parcel
      updateStep('nft-minting', 'processing', undefined, 'Generating NFT on Hedera network...');
      console.log('🪙 Step 4: Minting the parcel');
      
      // Wait before minting
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      const mintResult = await fetchWithRetry(async () => {
        const mintResponse = await api.post<{
          mintResult: { transactionId: string; tokenId: string };
        }>('api/parcels/mint', {
          parcelId: createdParcel.id,
          userAccountId: wallet.accountId,
          paymentTransactionId: paymentResult.transactionId
        });
  
        // Enhanced minting response verification
        if (!mintResponse || !mintResponse.mintResult) {
          console.error('Invalid mint response:', mintResponse);
          throw new Error('Invalid minting response from server');
        }
  
        return mintResponse.mintResult;
      }, `mint-parcel-${createdParcel.id}`, 3, 2000);

      updateStep('nft-minting', 'completed', undefined, `NFT created: ${mintResult.tokenId}`);
      console.log('✅ NFT created:', mintResult.tokenId);
  
      // Invalidate caches
      for (const [key] of requestCache.entries()) {
        if (key.includes('fetch-parcels') || key.includes('get-parcel')) {
          requestCache.delete(key);
        }
      }
  
      // Refresh parcel list
      setTimeout(() => fetchParcels().catch(console.error), 1000);
  
      // Consistent return structure
      const finalResult = {
        parcel: createdParcel,
        mintResult: {
          transactionId: mintResult.transactionId,
          tokenId: mintResult.tokenId
        },
        paymentResult: {
          success: true,
          transactionId: paymentResult.transactionId
        },
        uploadResults,
        partialSuccess: false
      };
  
      console.log('✅ Complete process finished successfully');
      toast.success('Parcel created and tokenized successfully!');
  
      return finalResult;
  
    } catch (error: any) {
      console.error('❌ Error in complete process:', error);
      
      // Enhanced error handling with step updates
      let errorMessage = error.message || 'An unexpected error occurred';
      
      if (error.message?.includes('Payment failed') || error.message?.includes('payment')) {
        errorMessage = 'Payment failure: ' + error.message;
        updateStep('payment-processing', 'error', errorMessage);
      } else if (error.message?.includes('create parcel') || error.message?.includes('parcel')) {
        errorMessage = 'Parcel creation failure: ' + error.message;
        updateStep('parcel-creation', 'error', errorMessage);
      } else if (error.message?.includes('mint') || error.message?.includes('NFT')) {
        errorMessage = 'Minting failure: ' + error.message;
        updateStep('nft-minting', 'error', errorMessage);
      }
      
      // Let the component handle the error display
      throw new Error(errorMessage);
    }
  }, [api, wallet.accountId, processMintPayment, uploadDocuments, fetchParcels]);
  
  /** ----------- Clean up resources ----------- */
  const cleanup = useCallback(() => {
    // Clean cache
    requestCache.clear();
    
    // Clean active operations
    activeOperations.current.clear();
    
    // Reset store
    setError(null);
    setLoading(false);
    
    console.log('🧹 Resources cleaned up');
  }, [setError, setLoading]);

  /** ----------- Global error handling ----------- */
  const handleError = useCallback((error: any, context: string) => {
    console.error(`❌ Error in ${context}:`, error);
    
    // Clean ongoing operations on critical error
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      activeOperations.current.clear();
    }
    
    // User message based on error type
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      toast.error('Session expired. Please reconnect.');
    } else if (error.message?.includes('Network') || error.message?.includes('network')) {
      toast.error('Network connection problem. Please try again.');
    } else if (error.message?.includes('timeout')) {
      toast.error('Operation took too long. Please try again.');
    } else {
      toast.error(`Error: ${error.message || 'An unexpected error occurred'}`);
    }
    
    setError(error.message || 'Unknown error');
  }, [setError]);

  /** ----------- EFFECT: Cleanup on unmount ----------- */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // States
    parcels,
    loading: useParcelStore.getState().loading,
    error: useParcelStore.getState().error,
    
    // Basic actions
    fetchParcels,
    fetchMyParcels,
    getParcelDetails,
    createParcel,
    uploadDocuments,
    
    // Minting actions
    mintParcel, // Simple minting (without payment)
    createAndMintParcel, // Complete process with payment and step tracking
    delistParcel, // Delist a parcel
    
    // Utilities
    clearCache: () => {
      requestCache.clear();
      activeOperations.current.clear();
    },
    cleanup,
    handleError,
    
    // Meta-information for debugging
    meta: {
      cacheSize: requestCache.size,
      activeOperationsCount: activeOperations.current.size,
      isWalletConnected: wallet.isConnected,
      currentAccount: wallet.accountId
    }
  };
};