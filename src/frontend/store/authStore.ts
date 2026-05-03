import { create } from 'zustand';
import axios from 'axios';

axios.defaults.withCredentials = true;

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  wallet?: {
    balance: number;
  };
  settings?: {
    buyRate: number;
    sellRate: number;
  };
  merchant?: {
    id: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  checkAuth: async () => {
    // Only set loading if we don't already have a status to avoid flicker loops
    set((state) => ({ isLoading: state.user === null }));
    try {
      const response = await axios.get('/api/user/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  logout: async () => {
    try {
      await axios.post('/api/auth/logout');
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
