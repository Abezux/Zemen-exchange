import { create } from 'zustand';
import axios from 'axios';

// Configure axios for production
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';
axios.defaults.withCredentials = true;

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  verificationStatus?: string; // "unverified" | "pending" | "verified"
  accountType?: string; // "user" | "merchant"
  paymentMethods?: any[];
  wallet?: {
    balance: number;
    lockedBalance: number;
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
  updateProfile: (data: FormData | { name?: string; bio?: string; avatarUrl?: string }) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
  updateProfile: async (data) => {
    let response;
    if (data instanceof FormData) {
      response = await axios.patch('/api/user/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await axios.patch('/api/user/profile', data);
    }
    const updatedUser = response.data;
    set({ user: updatedUser });
    return updatedUser;
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
