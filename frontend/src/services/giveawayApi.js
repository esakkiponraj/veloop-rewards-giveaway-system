import { apiRequest } from './apiClient.js';

export const getCurrentGiveaway = async () => {
  return await apiRequest('/giveaways/current');
};

export const getPreviousGiveaways = async () => {
  return await apiRequest('/giveaways/previous');
};

export const getGiveawayBySlug = async (slug) => {
  return await apiRequest(`/giveaways/slug/${slug}`);
};

export const getGiveawayById = async (id) => {
  return await apiRequest(`/giveaways/${id}`);
};

export const getPrizeBySlug = async (slug) => {
  return await apiRequest(`/giveaways/prizes/${slug}`);
};

export const getGiveawayPrizeDetails = async (giveawayId, prizeId) => {
  return await apiRequest(`/giveaways/${giveawayId}/prizes/${prizeId}`);
};

export const getMyGiveawayStatus = async (giveawayId, prizeId = null) => {
  const url = prizeId
    ? `/giveaways/${giveawayId}/prizes/${prizeId}/my-status`
    : `/giveaways/${giveawayId}/my-status`;
  return await apiRequest(url);
};

export const joinGiveaway = async (giveawayId, prizeId, idempotencyKey) => {
  const url = prizeId
    ? `/giveaways/${giveawayId}/prizes/${prizeId}/join`
    : `/giveaways/${giveawayId}/join`;
  return await apiRequest(url, {
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
  const url = prizeId
    ? `/giveaways/${giveawayId}/prizes/${prizeId}/claim`
    : `/giveaways/${giveawayId}/claim`;
  return await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ prizeId, ...claimData }),
  });
};

export const getMyClaim = async (giveawayId, prizeId = null) => {
  const url = prizeId
    ? `/giveaways/${giveawayId}/prizes/${prizeId}/my-claim`
    : `/giveaways/${giveawayId}/my-claim`;
  return await apiRequest(url);
};

export const getMyEntries = async () => {
  return await apiRequest('/giveaways/user/my-entries');
};
