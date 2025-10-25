import { create } from 'zustand';

interface UIState {
  theme: 'dark' | 'light';
  language: 'fr' | 'en';
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    timestamp: string;
    read: boolean;
  }>;
  modals: {
    walletConnect: boolean;
    parcelDetails: boolean;
    loanConfirm: boolean;
  };
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (language: 'fr' | 'en') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'dark',
  language: 'fr',
  sidebarOpen: false,
  notifications: [],
  modals: {
    walletConnect: false,
    parcelDetails: false,
    loanConfirm: false,
  },
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
    }));
  },
  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  clearNotifications: () => set({ notifications: [] }),
  openModal: (modal) => {
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    }));
  },
  closeModal: (modal) => {
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    }));
  },
  closeAllModals: () => {
    set((state) => ({
      modals: Object.keys(state.modals).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as UIState['modals']
      ),
    }));
  },
}));