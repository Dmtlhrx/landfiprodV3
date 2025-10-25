import { create } from 'zustand';
import { Parcel } from '@hedera-africa/ui';

interface ParcelState {
  parcels: Parcel[];
  loading: boolean;
  error: string | null;
  filters: {
    minArea?: number;
    maxArea?: number;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    location?: string;
  };
  setParcels: (parcels: Parcel[]) => void;
  addParcel: (parcel: Parcel) => void;
  updateParcel: (id: string, parcel: Partial<Parcel>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<ParcelState['filters']>) => void;
  clearFilters: () => void;
}

export const useParcelStore = create<ParcelState>((set) => ({
  parcels: [],
  loading: false,
  error: null,
  filters: {},
  setParcels: (parcels) => set({ parcels }),
  addParcel: (parcel) => set((state) => ({ parcels: [...state.parcels, parcel] })),
  updateParcel: (id, parcelUpdate) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        p.id === id ? { ...p, ...parcelUpdate } : p
      ),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  clearFilters: () => set({ filters: {} }),
}));