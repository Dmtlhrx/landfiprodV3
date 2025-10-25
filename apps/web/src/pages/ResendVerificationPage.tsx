import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Button, BeninPatternBackground } from '@hedera-africa/ui';
import ky from 'ky';
import toast from 'react-hot-toast';

const resendSchema = z.object({
  email: z.string().email('Invalid email'),
});

type ResendForm = z.infer<typeof resendSchema>;

const ResendVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendForm>({
    resolver: zodResolver(resendSchema),
  });

  const onSubmit = async (data: ResendForm) => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await ky.post('api/auth/resend-verification-email', {
        json: data,
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json();

      setSuccessMessage('Verification email sent! Check your inbox.');
      toast.success('Email sent successfully');

      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      const errorData = error.response ? await error.response.json() : {};
      setServerError(errorData.error || 'Failed to send verification email');
      toast.error(errorData.error || 'Error sending email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 relative overflow-hidden">
      <BeninPatternBackground className="absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="glass p-8 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl mx-auto mb-4 flex items-center justify-center"
            >
              <Mail className="h-8 w-8 text-white" />
            </motion.div>

            <h1 className="font-heading text-2xl font-bold text-white mb-2">
              Resend Verification Email
            </h1>
            <p className="text-gray-300 text-sm">
              Enter your email to receive a new verification link
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg flex items-start gap-3"
            >
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-sm">{successMessage}</p>
            </motion.div>
          )}

          {/* Error Message */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-accent-900/20 border border-accent-500 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-accent-400 flex-shrink-0 mt-0.5" />
              <p className="text-accent-300 text-sm">{serverError}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-accent-400 text-sm mt-2">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full neon-glow-hover"
              isLoading={loading}
            >
              {loading ? 'Sending...' : 'Send Verification Email'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/auth')}
              className="block w-full text-primary-400 hover:text-primary-300 transition-colors text-sm"
            >
              Back to Sign In
            </button>
            <p className="text-gray-400 text-xs">
              The link will expire in 24 hours
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResendVerificationPage;