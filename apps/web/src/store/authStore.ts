import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@hedera-africa/ui';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  wallet: {
    isConnected: boolean;
    accountId?: string;
    network?: string;
  };
  login: (user: User, token: string) => void;
  logout: () => void;
  connectWallet: (accountId: string, network: string) => void;
  disconnectWallet: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      wallet: {
        isConnected: false,
      },
      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          wallet: { isConnected: false },
        }),
      connectWallet: (accountId, network) =>
        set((state) => ({
          wallet: {
            isConnected: true,
            accountId,
            network,
          },
        })),
      disconnectWallet: () =>
        set((state) => ({
          wallet: { isConnected: false },
        })),
    }),
    {
      name: 'hedera-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        wallet: state.wallet,
      }),
      
    }
  )
);