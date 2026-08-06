import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

const storedToken = localStorage.getItem('financas_token');
const storedUser = localStorage.getItem('financas_user');
const initialUser = storedToken && storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: storedToken,
  isAuthenticated: !!storedToken && !!storedUser,

  loadFromStorage: () => {
    const token = localStorage.getItem('financas_token');
    const userStr = localStorage.getItem('financas_user');
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr), isAuthenticated: true });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('financas_token', token);
    localStorage.setItem('financas_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token, user } = res.data;
    localStorage.setItem('financas_token', token);
    localStorage.setItem('financas_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('financas_token');
    localStorage.removeItem('financas_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
