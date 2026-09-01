import { apiClient } from './apiClient.js';

export const getReferrals = async () => {
  return await apiClient.get('/referrals');
};

export const applyReferralCode = async (code) => {
  return await apiClient.post('/referrals/apply', { code });
};
