import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  registerLogoutGuard: (guard:()=>Promise<boolean>)=>()=>void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const guards = useRef(new Set<()=>Promise<boolean>>());
  const registerLogoutGuard = useCallback((guard:()=>Promise<boolean>) => {
    guards.current.add(guard);
    return () => { guards.current.delete(guard); };
  }, []);
  const logout = useCallback(async () => {
    for (const guard of guards.current) if (!await guard()) return;
    localStorage.removeItem('token');
    localStorage.removeItem('flowcraft_selected_project');
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.getMe()
      .then((res) => { if (localStorage.getItem('token') === token) setUser(res.data); })
      .catch(() => {
        if (localStorage.getItem('token') === token) localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const register = async (username: string, password: string, name?: string) => {
    const res = await authApi.register(username, password, name);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, registerLogoutGuard, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
