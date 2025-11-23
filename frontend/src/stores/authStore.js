import { create } from 'zustand';
import { authAPI } from '../services/api';
import offlineStorage from '../services/offlineStorage';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      await offlineStorage.saveUser(user);
      
      set({ user, token, loading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.message || 'Login failed', loading: false });
      return { success: false, error: error.message };
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.register(data);
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      await offlineStorage.saveUser(user);
      
      set({ user, token, loading: false });
      return { success: true };
    } catch (error) {
      set({ error: error.message || 'Registration failed', loading: false });
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    await offlineStorage.clearAll();
    
    set({ user: null, token: null });
  },

  setUser: (user) => set({ user })
}));
