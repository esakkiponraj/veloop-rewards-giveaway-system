import { apiClient } from './apiClient.js';

export const getTasks = async () => {
  return await apiClient.get('/tasks');
};

export const claimTask = async (taskId) => {
  return await apiClient.post(`/tasks/${taskId}/claim`, {});
};
