import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Upload, Coins, DollarSign, AlertTriangle, Wallet, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, BeninPatternBackground, TxnStatus } from '@hedera-africa/ui';
import Header from '@/components/Layout/Header';
import FileUpload from '@/components/FileUpload';
import { useParcels } from '@/hooks/useParcels';
import { usePayment } from '@/hooks/usePayment';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const parcelSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
  areaM2: z.number().min(100, 'Minimum area: 100 m²').max(1000000, 'Maximum area: 100 ha'),
  priceUsd: z.number().min(1000, 'Minimum price: $1,000').max(10000000, 'Maximum price: $10M'),
});

type ParcelForm = z.infer<typeof parcelSchema>;

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

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  details?: string;
}

// Composant Badge de vérification
const VerificationStatusBadge: React.FC<{
  status: 'idle' | 'verifying' | 'verified' | 'failed';
  transactionId?: string;
}> = ({ status, transactionId }) => {
  if (status === 'idle') return null;

  const variants = {
    verifying: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      icon: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
      text: 'Verifying payment on network...',
      textColor: 'text-blue-400'
    },
    verified: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      icon: <CheckCircle className="h-4 w-4 text-green-400" />,
      text: 'Payment verified successfully',
      textColor: 'text-green-400'
    },
    failed: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
      text: 'Verification timeout (transaction may still be valid)',
      textColor: 'text-red-400'
    }
  };

  const config = variants[status as keyof typeof variants];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor
      }}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <div className="flex-1">
          <p className={`font-medium text-sm ${config.textColor}`}>
            {config.text}
          </p>
          {transactionId && status === 'verifying' && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {transactionId.slice(0, 20)}...
            </p>
          )}
        </div>
      </div>
      
      {status === 'verifying' && (
        <div className="w-full bg-dark-700/30 rounded-full h-1 mt-3">
          <motion.div
            className="bg-blue-500 h-1 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 60,
              ease: 'linear',
              repeat: Infinity
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

const MintParcelPage: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [mintingStep, setMintingStep] = useState<'form' | 'processing' | 'success'>('form');
  const [paymentTransactionId, setPaymentTransactionId] = useState<string>('');
  const [tokenizationTransactionId, setTokenizationTransactionId] = useState<string>('');
  const [tokenId, setTokenId] = useState<string>('');
  const [userBalance, setUserBalance] = useState<{ canPay: boolean; balance?: number; required?: number }>({ 
    canPay: false, 
    balance: 0, 
    required: 30 
  });
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  
  // Step tracking state
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([
    {
      id: 'wallet-connection',
      title: 'Wallet Connection',
      description: 'Connecting to your wallet via WalletConnect',
      status: 'pending'
    },
    {
      id: 'payment-processing',
      title: 'HBAR Payment',
      description: 'Processing payment for tokenization',
      status: 'pending'
    },
    {
      id: 'parcel-creation',
      title: 'Parcel Creation',
      description: 'Creating parcel record on blockchain',
      status: 'pending'
    },
    {
      id: 'document-upload',
      title: 'Document Upload',
      description: 'Uploading and securing documents',
      status: 'pending'
    },
    {
      id: 'nft-minting',
      title: 'NFT Generation',
      description: 'Minting NFT token on Hedera network',
      status: 'pending'
    }
  ]);

  const { wallet } = useAuthStore();
  const { createAndMintParcel } = useParcels();
  
  const {
    connectWallet,
    isConnected,
    currentAccount,
    canProcessPayment,
    exchangeRate,
    isProcessing,
    resetPayment,
    hasConnectionError,
    connectionError
  } = usePayment();

  const { 
    startVerification, 
    cleanup: cleanupVerification 
  } = usePaymentVerification();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<ParcelForm>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      title: '',
      latitude: 6.3703,
      longitude: 2.3912,
      areaM2: 25000,
      priceUsd: 45000,
      description: ''
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Enhanced wallet ready check
  const isWalletReady = useMemo(() => {
    const storeWallet = useAuthStore.getState().wallet;
    const ready = (
      isConnected && 
      currentAccount && 
      storeWallet.isConnected && 
      storeWallet.accountId === currentAccount
    );
    
    console.log('🔍 Wallet Ready Check:', {
      isConnected,
      currentAccount,
      storeConnected: storeWallet.isConnected,
      storeAccountId: storeWallet.accountId,
      result: ready
    });
    
    return ready;
  }, [isConnected, currentAccount]);

  const hasValidFiles = useMemo(() => 
    files.filter(f => f.status === 'ready' && f.file).length > 0,
    [files]
  );

  const requiredHBAR = useMemo(() => 
    exchangeRate?.mint_fee?.HBAR || 30,
    [exchangeRate]
  );

  // Update step status utility
  const updateStepStatus = useCallback((stepId: string, status: ProcessStep['status'], error?: string, details?: string) => {
    setProcessSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, error, details }
          : step
      )
    );
  }, []);

  // Reset all steps
  const resetSteps = useCallback(() => {
    setProcessSteps(steps => 
      steps.map(step => ({ ...step, status: 'pending', error: undefined, details: undefined }))
    );
  }, []);

  // Check balance
  const checkBalance = useCallback(async () => {
    if (!isWalletReady || balanceChecked) {
      return;
    }

    try {
      console.log('Checking balance for wallet:', currentAccount);
      const balanceResult = await canProcessPayment();
      setUserBalance(balanceResult);
      setBalanceChecked(true);
      console.log('Balance check result:', balanceResult);
    } catch (error) {
      console.error('Balance check error:', error);
      setUserBalance({ canPay: false, balance: 0, required: requiredHBAR });
      setBalanceChecked(true);
    }
  }, [isWalletReady, canProcessPayment, requiredHBAR, balanceChecked, currentAccount]);

  useEffect(() => {
    if (isWalletReady && !balanceChecked) {
      checkBalance();
    }
  }, [isWalletReady, balanceChecked, checkBalance]);

  useEffect(() => {
    setBalanceChecked(false);
    setUserBalance({ canPay: false, balance: 0, required: requiredHBAR });
  }, [currentAccount, requiredHBAR]);

  // Enhanced wallet connection check
  const ensureWalletConnection = useCallback(async (): Promise<boolean> => {
    try {
      updateStepStatus('wallet-connection', 'processing');
      
      const { wallet: storeWallet } = useAuthStore.getState();
      const isActuallyConnected = (
        isWalletReady && 
        currentAccount && 
        storeWallet.isConnected && 
        storeWallet.accountId &&
        storeWallet.accountId === currentAccount
      );
      
      if (isActuallyConnected) {
        console.log('✅ Wallet already connected:', {
          isWalletReady,
          currentAccount,
          storeConnected: storeWallet.isConnected,
          storeAccountId: storeWallet.accountId
        });
        
        updateStepStatus('wallet-connection', 'completed', undefined, `Connected: ${currentAccount}`);
        return true;
      }

      console.log('⚠️ Wallet not fully connected, initiating connection...');
      
      const connected = await connectWallet();
      
      if (!connected) {
        updateStepStatus('wallet-connection', 'error', 'Failed to connect wallet');
        toast.error('Failed to connect wallet');
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { wallet: updatedWallet } = useAuthStore.getState();
      const finalAccount = updatedWallet.accountId || currentAccount;
      
      if (finalAccount) {
        updateStepStatus('wallet-connection', 'completed', undefined, `Connected: ${finalAccount.slice(0, 8)}...${finalAccount.slice(-6)}`);
        toast.success('Wallet connected successfully');
        return true;
      }

      throw new Error('Connection succeeded but no account found');
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      updateStepStatus('wallet-connection', 'error', 'Connection failed');
      toast.error('Error connecting wallet');
      return false;
    }
  }, [isWalletReady, connectWallet, currentAccount, updateStepStatus]);

  // Enhanced onSubmit with async verification
  const onSubmit = useCallback(async (data: ParcelForm) => {
    try {
      // Pre-submit wallet check
      const { wallet: storeWallet } = useAuthStore.getState();
      console.log('🔍 Pre-submit wallet check:', {
        isWalletReady,
        currentAccount,
        storeConnected: storeWallet.isConnected,
        storeAccountId: storeWallet.accountId
      });
      
      // Reset everything
      resetPayment();
      resetSteps();
      setVerificationStatus('idle');
      setMintingStep('processing');

      // Step 1: Wallet Connection
      updateStepStatus('wallet-connection', 'processing');
      const walletConnected = await ensureWalletConnection();
      if (!walletConnected) {
        setMintingStep('form');
        return;
      }

      // Verify files
      if (!hasValidFiles) {
        toast.error('Please add at least one document');
        setMintingStep('form');
        return;
      }

      // Check balance
      updateStepStatus('payment-processing', 'processing', undefined, 'Checking balance...');
      const balanceCheck = await canProcessPayment();
      if (!balanceCheck.canPay) {
        updateStepStatus('payment-processing', 'error', 'Insufficient balance');
        toast.error(
          `Insufficient balance. Required: ${balanceCheck.required || requiredHBAR} HBAR, Available: ${balanceCheck.balance || 0} HBAR`
        );
        setMintingStep('form');
        return;
      }

      // Step 2-5: Create and mint with step tracking
      updateStepStatus('payment-processing', 'processing', undefined, 'Processing HBAR payment...');
      updateStepStatus('parcel-creation', 'processing', undefined, 'Creating parcel on blockchain...');
      updateStepStatus('document-upload', 'processing', undefined, `Preparing ${files.filter(f => f.file).length} documents...`);
      updateStepStatus('nft-minting', 'processing', undefined, 'Preparing NFT generation...');

      console.log('🚀 Starting complete tokenization process...');

      const result = await createAndMintParcel(
        data, 
        files.filter(f => f.file),
        updateStepStatus
      );

      // Handle partial success
      if (result.partialSuccess) {
        updateStepStatus('payment-processing', 'completed', undefined, 'Payment successful');
        updateStepStatus('nft-minting', 'error', 'NFT creation failed');
        setPaymentTransactionId(result.paymentResult?.transactionId || '');
        toast.error('Payment successful but NFT creation failed. Please contact support.');
        setMintingStep('form');
        return;
      }

      // Handle complete success
      if (result.mintResult && result.paymentResult) {
        const txId = result.paymentResult.transactionId!;
        
        updateStepStatus('payment-processing', 'completed', undefined, `Transaction: ${txId.slice(0, 12)}...`);
        
        // ✨ NOUVEAU: Lancer la vérification asynchrone
        if (!result.paymentResult.verified && result.paymentResult.verificationPending) {
          console.log('🔍 Starting async payment verification...');
          setVerificationStatus('verifying');
          
          const verificationData = result.paymentResult.verificationData;
          
          startVerification(
            txId,
            verificationData.userAccountId,
            verificationData.expectedAmount,
            // Callback de succès
            (verificationResult) => {
              console.log('✅ Payment verified asynchronously:', verificationResult);
              setVerificationStatus('verified');
              updateStepStatus('payment-processing', 'completed', undefined, `Verified: ${txId.slice(0, 12)}...`);
              toast.success('Payment verified on Hedera network!');
            },
            // Callback d'échec
            (error) => {
              console.warn('⚠️ Async verification failed:', error);
              setVerificationStatus('failed');
              toast.info('Transaction submitted. Verification pending...', { duration: 5000 });
            }
          );
        } else if (result.paymentResult.verified) {
          setVerificationStatus('verified');
        }
        
        updateStepStatus('parcel-creation', 'completed', undefined, 'Parcel created successfully');
        updateStepStatus('document-upload', 'completed', undefined, `${result.uploadResults?.length || 0} documents uploaded`);
        updateStepStatus('nft-minting', 'completed', undefined, `NFT Token: ${result.mintResult.tokenId}`);
        
        setPaymentTransactionId(txId);
        setTokenizationTransactionId(result.mintResult.transactionId);
        setTokenId(result.mintResult.tokenId);
        setMintingStep('success');
        
        toast.success('Parcel created and tokenized successfully!');
      } else {
        throw new Error('Failed to complete the process');
      }
      
    } catch (error: any) {
      console.error('❌ Complete process error:', error);
      
      // Update failed step
      if (error.message?.includes('Payment')) {
        updateStepStatus('payment-processing', 'error', error.message);
      } else if (error.message?.includes('parcel')) {
        updateStepStatus('parcel-creation', 'error', error.message);
      } else if (error.message?.includes('mint') || error.message?.includes('NFT')) {
        updateStepStatus('nft-minting', 'error', error.message);
      }
      
      if (error.message?.includes('cancelled') || error.message?.includes('User rejected')) {
        toast.error('Payment cancelled by user');
      } else if (error.message?.includes('Insufficient')) {
        toast.error('Insufficient balance for payment');
      } else if (error.message?.includes('Payment failed')) {
        toast.error('Payment failed. Please try again.');
      } else {
        toast.error(error.message || 'Tokenization error');
      }
      
      setMintingStep('form');
      setPaymentTransactionId('');
      setTokenizationTransactionId('');
      setTokenId('');
    }
  }, [
    resetPayment,
    resetSteps,
    ensureWalletConnection,
    hasValidFiles,
    canProcessPayment,
    requiredHBAR,
    createAndMintParcel,
    files,
    updateStepStatus,
    isWalletReady,
    currentAccount,
    startVerification
  ]);

  const resetForm = useCallback(() => {
    setMintingStep('form');
    setFiles([]);
    setPaymentTransactionId('');
    setTokenizationTransactionId('');
    setTokenId('');
    setBalanceChecked(false);
    setVerificationStatus('idle');
    resetPayment();
    resetSteps();
    reset();
  }, [reset, resetPayment, resetSteps]);

  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupVerification();
    };
  }, [cleanupVerification]);

  // Step Progress Component
  const StepProgress: React.FC = () => (
    <div className="space-y-4">
      {processSteps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-4"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1">
            {step.status === 'completed' ? (
              <CheckCircle className="h-6 w-6 text-green-400" />
            ) : step.status === 'processing' ? (
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : step.status === 'error' ? (
              <AlertTriangle className="h-6 w-6 text-red-400" />
            ) : (
              <Clock className="h-6 w-6 text-gray-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${
              step.status === 'completed' ? 'text-green-400' :
              step.status === 'processing' ? 'text-primary-400' :
              step.status === 'error' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {step.title}
            </p>
            
            <p className="text-sm text-gray-500 mt-1">
              {step.error || step.details || step.description}
            </p>
            
            {step.status === 'processing' && (
              <div className="w-full bg-dark-700 rounded-full h-1.5 mt-2">
                <div className="bg-primary-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Success page with verification status
  if (mintingStep === 'success') {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        
        <div className="relative pt-8 pb-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card>
                <CardContent className="p-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full mx-auto mb-6 flex items-center justify-center"
                  >
                    <Coins className="h-10 w-10 text-white" />
                  </motion.div>
                  
                  <h1 className="font-heading text-2xl font-bold text-white mb-4">
                    Tokenization Complete!
                  </h1>
                  
                  <p className="text-gray-400 mb-6">
                    Your parcel has been successfully transformed into an NFT on Hedera Hashgraph
                  </p>

                  <div className="space-y-4 mb-6">
                    {/* Badge de vérification asynchrone */}
                    {paymentTransactionId && (
                      <VerificationStatusBadge 
                        status={verificationStatus} 
                        transactionId={paymentTransactionId}
                      />
                    )}

                    {paymentTransactionId && (
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-green-400 font-medium mb-2">Payment Transaction Submitted</p>
                        <TxnStatus
                          status="success"
                          transactionId={paymentTransactionId}
                          network="testnet"
                        />
                        {verificationStatus === 'verifying' && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Verifying on Hedera network (this may take up to 60 seconds)
                          </p>
                        )}
                      </div>
                    )}

                    {tokenizationTransactionId && (
                      <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                        <p className="text-primary-400 font-medium mb-2">NFT Minting Transaction</p>
                        <TxnStatus
                          status="success"
                          transactionId={tokenizationTransactionId}
                          network="testnet"
                        />
                      </div>
                    )}
                    
                    {tokenId && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-400 font-medium mb-2">NFT Token Created</p>
                        <p className="text-white font-mono text-sm break-all">{tokenId}</p>
                      </div>
                    )}

                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-purple-400 font-medium mb-2">Documents Uploaded</p>
                      <p className="text-gray-300 text-sm">
                        {files.filter(f => f.status === 'success').length} document(s) saved securely
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={resetForm} className="flex-1">
                      Tokenize Another
                    </Button>
                    <Button onClick={() => window.location.href = '/dashboard'} className="flex-1">
                      View Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Processing page
  if (mintingStep === 'processing') {
    return (
      <div className="min-h-screen bg-dark-950 relative">
        <BeninPatternBackground className="fixed inset-0" />
        <Header />
        
        <div className="relative pt-8 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Coins className="h-8 w-8 text-white animate-pulse" />
              </div>
              
              <h1 className="font-heading text-2xl font-bold text-white mb-4">
                Processing Tokenization
              </h1>
              
              <p className="text-gray-400 mb-6">
                Your parcel is being created and tokenized on Hedera Hashgraph
              </p>
            </motion.div>

            <Card>
              <CardContent className="p-8">
                <StepProgress />
                
                {hasConnectionError && connectionError && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="text-red-400 font-medium">Connection Error</p>
                        <p className="text-gray-400 text-sm">{connectionError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setMintingStep('form');
                      resetSteps();
                    }}
                    className="text-sm"
                  >
                    Cancel Process
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-dark-950 relative">
      <BeninPatternBackground className="fixed inset-0" />
      <Header />
      
      <div className="relative pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary-500/20 rounded-xl">
                <Coins className="h-8 w-8 text-primary-400" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-white">
                Tokenize a Parcel
              </h1>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Transform your property into a secure NFT on Hedera Hashgraph using WalletConnect
            </p>
          </motion.div>

          {/* Wallet Status */}
          {!isWalletReady && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between p-4 bg-secondary-500/10 border border-secondary-500/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-secondary-400" />
                      <div>
                        <p className="text-secondary-400 font-medium">WalletConnect Required</p>
                        <p className="text-gray-400 text-sm">
                          Connect your wallet via WalletConnect to tokenize your parcel
                        </p>
                      </div>
                    </div>
                    <Button onClick={connectWallet} size="sm" disabled={isProcessing}>
                      {isProcessing ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Balance Check */}
          {isWalletReady && balanceChecked && !userBalance.canPay && userBalance.required && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-red-400 font-medium">Insufficient Balance</p>
                      <p className="text-gray-400 text-sm">
                        Required: {userBalance.required} HBAR | Available: {userBalance.balance || 0} HBAR
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Pricing Info */}
                  <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <DollarSign className="h-5 w-5 text-primary-400" />
                      <div>
                        <p className="text-primary-400 font-medium">Tokenization Fee (WalletConnect)</p>
                        <p className="text-gray-400 text-sm">
                          {requiredHBAR} HBAR to create your NFT on Hedera
                        </p>
                      </div>
                    </div>
                    
                    {isWalletReady && balanceChecked && userBalance.balance !== undefined && (
                      <div className="text-sm space-y-1 pt-2 border-t border-primary-500/20">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your balance:</span>
                          <span className={userBalance.canPay ? 'text-green-400' : 'text-red-400'}>
                            {userBalance.balance} HBAR
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Required:</span>
                          <span className="text-primary-400">{userBalance.required} HBAR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Connected account:</span>
                          <span className="text-white font-mono text-xs">
                            {currentAccount ? 
                              `${currentAccount.slice(0, 8)}...${currentAccount.slice(-6)}` : 
                              'Not connected'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* General Information */}
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-white mb-4">
                      General Information
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Parcel Title *
                          </label>
                          <input
                            {...register('title')}
                            type="text"
                            placeholder="e.g.: Agricultural Land - Cotonou"
                            className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                          {errors.title && (
                            <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
                          )}
                        </div>

                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Sale Price (USD) *
                          </label>
                          <input
                            {...register('priceUsd', { valueAsNumber: true })}
                            type="number"
                            placeholder="45000"
                            min="1000"
                            max="10000000"
                            className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                          />
                          {errors.priceUsd && (
                            <p className="text-red-400 text-sm mt-1">{errors.priceUsd.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          {...register('description')}
                          rows={4}
                          placeholder="Describe your parcel in detail..."
                          maxLength={1000}
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                        <div className="flex justify-between items-center mt-1">
                          {errors.description && (
                            <p className="text-red-400 text-sm">{errors.description.message}</p>
                          )}
                          <p className="text-gray-500 text-xs ml-auto">
                            {watch('description')?.length || 0}/1000
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-white mb-4">
                      Location Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Latitude *
                        </label>
                        <input
                          {...register('latitude', { valueAsNumber: true })}
                          type="number"
                          step="0.0001"
                          placeholder="6.3703"
                          min="-90"
                          max="90"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.latitude && (
                          <p className="text-red-400 text-sm mt-1">{errors.latitude.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Longitude *
                        </label>
                        <input
                          {...register('longitude', { valueAsNumber: true })}
                          type="number"
                          step="0.0001"
                          placeholder="2.3912"
                          min="-180"
                          max="180"
                          className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.longitude && (
                          <p className="text-red-400 text-sm mt-1">{errors.longitude.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Area (m²) *
                      </label>
                      <input
                        {...register('areaM2', { valueAsNumber: true })}
                        type="number"
                        placeholder="25000"
                        min="100"
                        max="1000000"
                        className="w-full px-4 py-3 bg-dark-700/30 rounded-xl text-white placeholder-gray-400 border border-dark-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.areaM2 && (
                        <p className="text-red-400 text-sm mt-1">{errors.areaM2.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Documents Upload */}
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-white mb-4">
                      Documents
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Upload property documents (title deed, survey reports, etc.)
                    </p>
                    <FileUpload
                      onFilesChange={handleFilesChange}
                      acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                      maxFiles={10}
                      maxFileSize={10 * 1024 * 1024}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-dark-600/30">
                    <Button variant="outline" onClick={resetForm} disabled={isSubmitting || isProcessing}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="neon-glow-hover"
                      isLoading={isSubmitting || isProcessing}
                      disabled={
                        !isWalletReady || 
                        !userBalance.canPay ||
                        !hasValidFiles ||
                        isProcessing ||
                        isSubmitting
                      }
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Pay and Tokenize ({requiredHBAR} HBAR)
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MintParcelPage;