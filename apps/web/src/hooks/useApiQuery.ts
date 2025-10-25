// api.ts - Configuration API
import ky from 'ky';
import { useAuthStore } from '@/store/authStore';

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL || 'https://lanfi-aze.up.railway.app',
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
  },
});

// hooks/useApiQuery.ts - Pour les GET (lecture)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api';

// ✅ Hook pour les requêtes GET (avec cache automatique)
export const useApiQuery = <T>(
  key: string | string[],
  url: string,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    showErrorToast?: boolean;
  } = {}
) => {
  const { showErrorToast = true, ...queryOptions } = options;

  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => api.get(url).json<T>(),
    staleTime: 5 * 60 * 1000, // 5 minutes par défaut
    cacheTime: 10 * 60 * 1000, // 10 minutes par défaut
    onError: (error: any) => {
      if (showErrorToast) {
        const message = error?.message || 'Une erreur est survenue';
        toast.error(message);
      }
    },
    retry: (failureCount, error: any) => {
      // Retry seulement pour certaines erreurs
      if (error?.message?.includes('429')) return failureCount < 3;
      if (error?.message?.includes('500')) return failureCount < 2;
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions,
  });
};

// ✅ Hook pour les mutations POST/PUT/DELETE
export const useApiMutation = <T, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
    invalidateKeys?: string[][];
  } = {}
) => {
  const queryClient = useQueryClient();
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Opération réussie',
    invalidateKeys = [],
    ...mutationOptions
  } = options;

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (showSuccessToast) toast.success(successMessage);
      
      // Invalider les caches concernés
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      mutationOptions.onSuccess?.(data, variables);
    },
    onError: (error: any, variables) => {
      if (showErrorToast) {
        const message = error?.message || 'Une erreur est survenue';
        toast.error(message);
      }
      mutationOptions.onError?.(error, variables);
    },
  });
};

// ✅ Hooks spécialisés pour vos endpoints
export const useApiPost = <T, TData = any>(
  url: string,
  options: Parameters<typeof useApiMutation>[1] = {}
) => {
  return useApiMutation<T, TData>(
    (data) => api.post(url, { json: data }).json<T>(),
    options
  );
};

export const useApiPut = <T, TData = any>(
  url: string,
  options: Parameters<typeof useApiMutation>[1] = {}
) => {
  return useApiMutation<T, TData>(
    (data) => api.put(url, { json: data }).json<T>(),
    options
  );
};

export const useApiDelete = <T>(
  url: string,
  options: Parameters<typeof useApiMutation>[1] = {}
) => {
  return useApiMutation<T, void>(
    () => api.delete(url).json<T>(),
    options
  );
};

