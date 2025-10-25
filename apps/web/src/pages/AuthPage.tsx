import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, BeninPatternBackground } from '@hedera-africa/ui';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
  displayName: z.string().min(2, 'Minimum 2 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type AuthMode = 'login' | 'register' | 'forgot' | 'verify' | 'reset';

interface ErrorDetail {
  field?: string;
  message: string;
}

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { login, register, loading, unverifiedEmail, resendVerificationEmail, clearUnverifiedEmail } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type === 'email-verify') {
      setMode('verify');
    } else if (token && type === 'password-reset') {
      setMode('reset');
    }
  }, [searchParams]);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(
      mode === 'login' ? loginSchema :
      mode === 'register' ? registerSchema :
      mode === 'forgot' ? forgotPasswordSchema :
      resetPasswordSchema
    ),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuthSubmit = async (data: any) => {
    setServerError(null);
    setErrorDetails([]);
    clearUnverifiedEmail();
    
    try {
      if (mode === 'login') {
        await login(data as LoginForm);
      } else if (mode === 'register') {
        await register(data as RegisterForm);
        setSuccessMessage('Registration successful! Check your email.');
      } else if (mode === 'forgot') {
        const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const error = await response.json();
          setServerError(error.error || 'Error');
        } else {
          setSuccessMessage('A reset link has been sent to your email.');
        }
      }
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrorDetails(error.response.data.details);
      }
      setServerError(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    try {
      await resendVerificationEmail(unverifiedEmail);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 relative overflow-hidden">
      <BeninPatternBackground className="absolute inset-0" />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
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
              <span className="text-white font-bold text-2xl">H</span>
            </motion.div>
            
            <h1 className="font-heading text-2xl font-bold text-white mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'verify' && 'Verify Email'}
              {mode === 'reset' && 'New Password'}
            </h1>
          </div>

          {/* Unverified Email Alert */}
          <AnimatePresence>
            {unverifiedEmail && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-300 text-sm font-medium mb-2">
                      Email not verified
                    </p>
                    <p className="text-yellow-300/80 text-xs mb-3">
                      You need to verify your email before signing in. Please check your inbox.
                    </p>
                    <Button
                      onClick={handleResendVerification}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500 text-yellow-300 hover:bg-yellow-900/30"
                      isLoading={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend verification email
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg flex items-start gap-3"
              >
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-300 text-sm">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Messages */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-accent-900/20 border border-accent-500 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-accent-300 text-sm font-medium">{serverError}</p>
                  {errorDetails.length > 0 && (
                    <ul className="mt-2 text-accent-300/80 text-xs space-y-1">
                      {errorDetails.map((err, idx) => (
                        <li key={idx}>• {err.field && `${err.field}: `}{err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {(mode === 'login' || mode === 'register') && (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                onSubmit={handleSubmit(handleAuthSubmit)}
                className="space-y-6"
              >
                {mode === 'register' && (
                  <FormField
                    label="Full Name"
                    icon={User}
                    error={errors.displayName?.message}
                  >
                    <input
                      {...registerField('displayName')}
                      type="text"
                      placeholder="Your name"
                      className="w-full pl-12 pr-4 py-3 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </FormField>
                )}

                <FormField
                  label="Email"
                  icon={Mail}
                  error={errors.email?.message}
                >
                  <input
                    {...registerField('email')}
                    type="email"
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </FormField>

                <FormField
                  label="Password"
                  icon={Lock}
                  error={errors.password?.message}
                  showToggle
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  isPasswordVisible={showPassword}
                >
                  <input
                    {...registerField('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </FormField>

                {mode === 'register' && (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Password must contain:</p>
                    <p>✓ Minimum 8 characters</p>
                    <p>✓ At least one uppercase letter</p>
                    <p>✓ At least one number</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full neon-glow-hover"
                  isLoading={loading}
                >
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </motion.form>
            )}

            {mode === 'forgot' && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit(handleAuthSubmit)}
                className="space-y-6"
              >
                <FormField
                  label="Email"
                  icon={Mail}
                  error={errors.email?.message}
                >
                  <input
                    {...registerField('email')}
                    type="email"
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </FormField>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full neon-glow-hover"
                  isLoading={loading}
                >
                  Send Reset Link
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Mode Switcher */}
          <div className="mt-6 space-y-3 text-center">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => {
                    setMode('register');
                    setServerError(null);
                    clearUnverifiedEmail();
                    reset();
                  }}
                  className="block w-full text-primary-400 hover:text-primary-300 transition-colors text-sm"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  onClick={() => {
                    setMode('forgot');
                    setServerError(null);
                    clearUnverifiedEmail();
                    reset();
                  }}
                  className="block w-full text-gray-400 hover:text-gray-300 transition-colors text-sm"
                >
                  Forgot password?
                </button>
              </>
            )}

            {mode === 'register' && (
              <button
                onClick={() => {
                  setMode('login');
                  setServerError(null);
                  clearUnverifiedEmail();
                  reset();
                }}
                className="text-primary-400 hover:text-primary-300 transition-colors text-sm"
              >
                Already have an account? Sign in
              </button>
            )}

            {mode === 'forgot' && (
              <button
                onClick={() => {
                  setMode('login');
                  setServerError(null);
                  clearUnverifiedEmail();
                  reset();
                }}
                className="text-primary-400 hover:text-primary-300 transition-colors text-sm"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  icon: React.ComponentType<any>;
  error?: string;
  children: React.ReactNode;
  showToggle?: boolean;
  onTogglePassword?: () => void;
  isPasswordVisible?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  icon: Icon,
  error,
  children,
  showToggle,
  onTogglePassword,
  isPasswordVisible,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      {children}
      {showToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
        >
          {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
    {error && (
      <p className="text-accent-400 text-sm mt-2">{error}</p>
    )}
  </div>
);

export default AuthPage;