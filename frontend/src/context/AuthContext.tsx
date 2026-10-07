import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, type UserProfile } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  role: 'STUDENT' | 'ADMIN' | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username?: string; roll_number?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cas_user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cas_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const role = user?.role || null;

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('cas_auth_token');
      if (savedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('cas_user_profile', JSON.stringify(profile));
        } catch (err) {
          console.error('Session validation failed:', err);
          localStorage.removeItem('cas_auth_token');
          localStorage.removeItem('cas_user_profile');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: { username?: string; roll_number?: string; password: string }) => {
    const res = await api.login(credentials);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('cas_auth_token', res.token);
    localStorage.setItem('cas_user_profile', JSON.stringify(res.user));
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('cas_auth_token');
      localStorage.removeItem('cas_user_profile');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
