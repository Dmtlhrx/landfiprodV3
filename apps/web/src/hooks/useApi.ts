import { useState, useCallback } from 'react';
import ky from 'ky';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const activeOperations = new Set<string>();

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Request failed');
        }
      },
    ],
  },
});

const fetchWithRetry = async <T>(
  requestFn: () => Promise<T>,
  operationId?: string,
  retries = 3,
  delay = 60000
): Promise<T> => {
  if (operationId && activeOperations.has(operationId)) {
    console.warn(`Opération ${operationId} déjà en cours, on skip...`);
    return Promise.reject(new Error(`Opération ${operationId} déjà en cours`));
  }

  if (operationId) activeOperations.add(operationId);

  try {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await requestFn();
      } catch (err: any) {
        if (err.message.includes('429') && attempt < retries - 1) {
          console.warn(`Rate limited. Retry ${attempt + 1} in ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
    throw new Error('Échec après plusieurs tentatives (Rate Limited).');
  } finally {
    if (operationId) activeOperations.delete(operationId);
  }
};

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  operationId?: string;
}

export const useApi = <T = any>(options: UseApiOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Opération réussie',
    operationId,
  } = options;

  // Récupérer le token et l'URL depuis le store
  const token = useAuthStore((state) => state.token);
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchWithRetry(apiCall, operationId);
      setData(result);

      if (showSuccessToast) toast.success(successMessage);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      if (showErrorToast) toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showSuccessToast, showErrorToast, successMessage, operationId]);

  const get = useCallback((url: string) => execute(() => api.get(url).json<T>()), [execute]);
  
  const post = useCallback((url: string, data?: any, kyOptions?: any) => {
    return execute(() => {
      // Si data est FormData, on l'envoie directement dans body
      if (data instanceof FormData) {
        return api.post(url, { 
          body: data,
          ...kyOptions,
          // Ne pas définir json ni headers pour FormData
        }).json<T>();
      }
      
      // Sinon, comportement normal pour JSON
      return api.post(url, { 
        json: data,
        ...kyOptions 
      }).json<T>();
    });
  }, [execute]);
  
  const put = useCallback((url: string, data?: any, kyOptions?: any) => {
    return execute(() => {
      // Même logique pour PUT
      if (data instanceof FormData) {
        return api.put(url, { 
          body: data,
          ...kyOptions 
        }).json<T>();
      }
      
      return api.put(url, { 
        json: data,
        ...kyOptions 
      }).json<T>();
    });
  }, [execute]);
  
  const del = useCallback((url: string) => execute(() => api.delete(url).json<T>()), [execute]);

  return { 
    loading, 
    error, 
    data, 
    get, 
    post, 
    put, 
    delete: del, 
    execute,
    authToken: token,
    baseUrl: baseUrl
  };
};