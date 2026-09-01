import { apiClient } from './apiClient.js';

export const getAds = async () => {
  return await apiClient.get('/ads');
};

export const completeAd = async (adId, idempotencyKey) => {
  return await apiClient.post(`/ads/${adId}/complete`, {
    idempotencyKey,
  });
};
