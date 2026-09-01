import { apiRequest } from './apiClient.js';

export const getAdminOverview = async () => {
  return await apiRequest('/admin/overview');
};

export const triggerWinnerDraw = async (giveawayId) => {
  return await apiRequest(`/admin/giveaways/${giveawayId}/draw-winners`, {
    method: 'POST',
  });
};

export const setGiveawayStatus = async (giveawayId, status) => {
  return await apiRequest(`/admin/giveaways/${giveawayId}/set-status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
};

export const getFraudEvents = async () => {
  return await apiRequest('/admin/fraud-events');
};

export const getAllClaims = async (status = '') => {
  const query = status ? `?status=${status}` : '';
  return await apiRequest(`/admin/claims${query}`);
};

export const processClaim = async (claimId, updateData) => {
  return await apiRequest(`/admin/claims/${claimId}/process`, {
    method: 'POST',
    body: JSON.stringify(updateData),
  });
};

export const getAuditLogs = async () => {
  return await apiRequest('/admin/audit-logs');
};
