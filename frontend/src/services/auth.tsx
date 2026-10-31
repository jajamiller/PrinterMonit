import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, tokenStorage } from './api';
import type { User } from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStorage.get()) {
      setLoading(false);
      return;
    }
    getMe().then(setUser).catch(() => tokenStorage.clear()).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      await apiLogin(email, password);
      const userData = await getMe();
      setUser(userData);
      localStorage.setItem('user_name', userData.full_name || email);
    },
    async register(data) {
      await apiRegister(data);
      await apiLogin(data.email, data.password);
      const userData = await getMe();
      setUser(userData);
      localStorage.setItem('user_name', userData.full_name || data.email);
    },
    logout() {
      apiLogout();
      setUser(null);
      localStorage.removeItem('user_name');
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider');
  return context;
}
