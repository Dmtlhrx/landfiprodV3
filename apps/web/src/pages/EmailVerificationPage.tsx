import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { BeninPatternBackground } from '@hedera-africa/ui';
import { useAuth } from '@/hooks/useAuth';

type VerificationStatus = 'pending' | 'verifying' | 'success' | 'error';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('pending');
      return;
    }

    const verifyEmailToken = async () => {
      setStatus('verifying');
      try {
        await verifyEmail(token);
        setStatus('success');
        setTimeout(() => navigate('/auth/login'), 2000);
      } catch (err: any) {
        setError(err.error || 'Verification failed');
        setStatus('error');
      }
    };

    verifyEmailToken();
  }, [token, verifyEmail, navigate]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 relative overflow-hidden">
      <BeninPatternBackground className="absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="glass p-8 rounded-2xl text-center">
          {status === 'pending' && (
            <>
              <div className="w-16 h-16 bg-primary-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Verify your email</h1>
              <p className="text-gray-300 mb-6">
                A verification link has been sent to your email. Click the link to confirm your account.
              </p>
              <div className="space-y-3 text-sm text-gray-400">
                <p>The link expires in 24 hours.</p>
                <p>Check your spam folder if you don't receive the email.</p>
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/auth/resend-verification')}
                  className="text-primary-400 hover:text-primary-300 transition-colors text-sm"
                >
                  Didn't receive the email? Resend it
                </button>
              </div>
            </>
          )}

          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-primary-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Loader className="h-8 w-8 text-primary-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Verifying...</h1>
              <p className="text-gray-300">Please wait while we verify your email.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center"
              >
                <CheckCircle className="h-8 w-8 text-green-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-4">Email verified!</h1>
              <p className="text-gray-300 mb-6">Your account is now active.</p>
              <p className="text-sm text-gray-400">Redirecting to sign in...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-accent-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-accent-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Verification failed</h1>
              <p className="text-accent-300 mb-6">{error}</p>
              <div className="space-y-3 text-sm text-gray-400">
                <p>The link may be expired or invalid.</p>
                <button
                  onClick={() => navigate('/auth/login')}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;