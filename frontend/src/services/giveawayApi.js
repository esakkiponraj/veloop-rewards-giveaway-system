import { apiRequest } from './apiClient.js';

export const getCurrentGiveaway = async () => {
  return await apiRequest('/giveaways/current');
};

export const getPreviousGiveaways = async () => {
  return await apiRequest('/giveaways/previous');
};

export const getGiveawayById = async (id) => {
  return await apiRequest(`/giveaways/${id}`);
};

export const getPrizeBySlug = async (slug) => {
  return await apiRequest(`/giveaways/prizes/${slug}`);
};

export const getMyGiveawayStatus = async (giveawayId) => {
  return await apiRequest(`/giveaways/${giveawayId}/my-status`);
};

export const joinGiveaway = async (giveawayId, prizeId, idempotencyKey) => {
  return await apiRequest(`/giveaways/${giveawayId}/join`, {
    method: 'POST',
    body: JSON.stringify({ prizeId, idempotencyKey }),
  });
};

export const getGiveawayWinners = async (giveawayId) => {
  return await apiRequest(`/giveaways/${giveawayId}/winners`);
};

export const getAllPreviousWinners = async () => {
  return await apiRequest('/giveaways/previous/winners');
};

export const claimPrize = async (giveawayId, prizeId, claimData) => {
  return await apiRequest(`/giveaways/${giveawayId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ prizeId, ...claimData }),
  });
};

export const getMyClaim = async (giveawayId) => {
  return await apiRequest(`/giveaways/${giveawayId}/my-claim`);
};

export const getMyEntries = async () => {
  return await apiRequest('/giveaways/user/my-entries');
};
