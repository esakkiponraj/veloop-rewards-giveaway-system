import { apiClient } from './apiClient.js';

export const getWalletOverview = async () => {
  return await apiClient.get('/wallet');
};

export const claimDailyBonus = async () => {
  return await apiClient.post('/wallet/daily-bonus', {});
};

export const requestWithdrawal = async ({ amount, payoutMethod, accountDetail }) => {
  return await apiClient.post('/wallet/withdraw', {
    amount,
    payoutMethod,
    accountDetail,
  });
};

export const getTransactionHistory = async (filter = 'ALL') => {
  return await apiClient.get(`/wallet/history?filter=${filter}`);
};
