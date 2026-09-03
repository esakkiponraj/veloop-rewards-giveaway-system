import { apiRequest } from './apiClient.js';

export const login = async (emailOrUsername, password) => {
  return await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrUsername, password }),
  });
};

export const register = async (userData) => {
  return await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const googleAuth = async (credential) => {
  return await apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
};

export const getMe = async () => {
  return await apiRequest('/auth/me');
};

export const getDemoAccounts = async () => {
  return await apiRequest('/auth/demo-accounts');
};
