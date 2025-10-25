import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ky from 'ky';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

interface AuthError {
  error?: string;
  code?: string;
  details?: Array<{
    field?: string;
    message: string;
  }>;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    walletHedera?: string;
    role: string;
    did?: string;
    createdAt: string;
  };
  accessToken: string;
  message?: string;
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { login: setAuthUser } = useAuthStore();
  const navigate = useNavigate();

  const login = async (data: LoginData) => {
    setLoading(true);
    setUnverifiedEmail(null);
    try {
      const response = await ky.post('api/auth/login', {
        json: data,
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json<AuthResponse>();

      setAuthUser(response.user, response.accessToken);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      
      // Handle specific error codes
      if (errorData.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email);
        toast.error('Please verify your email before signing in');
      } else if (errorData.code === 'INVALID_CREDENTIALS') {
        toast.error('Invalid email or password');
      } else {
        toast.error(errorData.error || 'Login failed');
      }
      
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      const response = await ky.post('api/auth/register', {
        json: data,
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json<AuthResponse>();

      // Note: User is not logged in until email is verified
      toast.success('Registration successful! Check your email.');
      // Redirect to email verification pending page
      navigate('/auth/verify-email-pending');
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      
      if (errorData.details && Array.isArray(errorData.details)) {
        // Show validation errors
        errorData.details.forEach(err => {
          toast.error(`${err.field || 'Error'}: ${err.message}`);
        });
      } else if (errorData.code === 'EMAIL_EXISTS') {
        toast.error('This email is already registered');
      } else {
        toast.error(errorData.error || 'Registration failed');
      }
      
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setLoading(true);
    try {
      const response = await ky.post('api/auth/verify-email', {
        json: { token },
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json();

      toast.success('Email verified! You can now sign in');
      navigate('/auth/login');
      return response;
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      
      if (errorData.code === 'INVALID_TOKEN') {
        toast.error('Link expired or invalid. Request a new one.');
      } else {
        toast.error(errorData.error || 'Verification failed');
      }
      
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      const response = await ky.post('api/auth/forgot-password', {
        json: { email },
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json();

      toast.success('Check your email to reset your password');
      return response;
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      toast.error(errorData.error || 'Request failed');
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setLoading(true);
    try {
      const response = await ky.post('api/auth/reset-password', {
        json: { token, password: newPassword },
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json();

      toast.success('Password reset! You can now sign in');
      navigate('/auth/login');
      return response;
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      
      if (errorData.code === 'INVALID_TOKEN') {
        toast.error('Link expired. Please request a new one.');
      } else if (errorData.details) {
        errorData.details.forEach(err => {
          toast.error(err.message);
        });
      } else {
        toast.error(errorData.error || 'Password reset failed');
      }
      
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setLoading(true);
    try {
      const response = await ky.post('api/auth/resend-verification-email', {
        json: { email },
        prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      }).json();

      toast.success('Verification email sent! Check your inbox.');
      setUnverifiedEmail(null);
      return response;
    } catch (error: any) {
      const errorData: AuthError = error.response ? await error.response.json() : {};
      toast.error(errorData.error || 'Failed to resend email');
      throw errorData;
    } finally {
      setLoading(false);
    }
  };

  return { 
    login, 
    register, 
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendVerificationEmail,
    loading,
    unverifiedEmail,
    clearUnverifiedEmail: () => setUnverifiedEmail(null),
  };
};