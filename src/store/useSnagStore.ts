import { create } from 'zustand';
import { SnagStatus } from '../types/database';

interface SnagFilterState {
  searchQuery: string;
  selectedStatus: SnagStatus | 'all';
  setSearchQuery: (query: string) => void;
  setSelectedStatus: (status: SnagStatus | 'all') => void;
  resetFilters: () => void;
}

export const useSnagStore = create<SnagFilterState>((set) => ({
  searchQuery: '',
  selectedStatus: 'all',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  resetFilters: () => set({ searchQuery: '', selectedStatus: 'all' }),
}));