import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, getDemoAccounts } from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('veloop_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);

  // Fetch current user if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid, clearing token.');
          localStorage.removeItem('veloop_auth_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto-login to demo user by default for rich instant preview experience
        try {
          const loginRes = await apiLogin('alex.vance@example.com', 'password123');
          localStorage.setItem('veloop_auth_token', loginRes.token);
          setToken(loginRes.token);
          setUser(loginRes.user);
        } catch (err) {
          // If backend not reached yet, default empty state
          console.warn('Default demo login deferred.');
        }
      }

      // Fetch demo accounts list
      try {
        const demoRes = await getDemoAccounts();
        if (demoRes.success) {
          setDemoAccounts(demoRes.accounts);
        }
      } catch (e) {
        // Ignore
      }

      setLoading(false);
    };

    initAuth();
  }, [token]);

  const loginUser = async (emailOrUsername, password) => {
    const res = await apiLogin(emailOrUsername, password);
    localStorage.setItem('veloop_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logoutUser = () => {
    localStorage.removeItem('veloop_auth_token');
    setToken(null);
    setUser(null);
  };

  const updateWallet = (newWallet) => {
    if (user && newWallet) {
      setUser((prev) => ({
        ...prev,
        wallet: newWallet,
      }));
    }
  };

  const switchAccount = async (targetEmail, targetPassword = 'password123') => {
    setLoading(true);
    try {
      const res = await apiLogin(targetEmail, targetPassword);
      localStorage.setItem('veloop_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      console.error('Account switch failed:', err);
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
