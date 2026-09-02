import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, getDemoAccounts } from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('veloop_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const hasInitializedRef = React.useRef(false);

  // Fetch current user or demo accounts once on mount
  const initAuth = useCallback(async () => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    setLoading(true);
    const storedToken = localStorage.getItem('veloop_auth_token');

    if (storedToken) {
      try {
        const res = await getMe();
        if (res && res.user) {
          setUser(res.user);
          setToken(storedToken);
        } else {
          throw new Error('User not found');
        }
      } catch (err) {
        console.warn('Stored session invalid or expired. Resetting auth state.');
        localStorage.removeItem('veloop_auth_token');
        setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
      setToken(null);
    }

    // Load available demo profiles in development
    try {
      const demoRes = await getDemoAccounts();
      if (demoRes && demoRes.success && Array.isArray(demoRes.accounts)) {
        setDemoAccounts(demoRes.accounts);
      }
    } catch (e) {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const loginUser = async (emailOrUsername, password) => {
    setLoading(true);
    try {
      const res = await apiLogin(emailOrUsername, password);
      if (!res || !res.token) {
        throw new Error('Authentication response did not contain a valid session token.');
      }
      localStorage.setItem('veloop_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    } catch (err) {
      // Failed login attempt must not overwrite or corrupt valid state
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('veloop_auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await getMe();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.warn('Could not refresh authoritative user profile:', e);
    }
  };

  const updateWallet = (newWallet) => {
    if (user && newWallet) {
      setUser((prev) => (prev ? { ...prev, wallet: newWallet } : prev));
    }
  };

  const switchAccount = async (targetEmail, targetPassword = null) => {
    setLoading(true);
    try {
      // Automatically choose correct password if not explicitly specified
      const password = targetPassword || (targetEmail === 'admin@veloop.io' ? 'admin123' : 'password123');
      const res = await apiLogin(targetEmail, password);
      localStorage.setItem('veloop_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    } catch (err) {
      console.error('Account switch failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        demoAccounts,
        login: loginUser,
        logout: logoutUser,
        refreshUser,
        updateWallet,
        switchAccount,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
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
