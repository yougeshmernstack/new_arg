import api from './axios';

export const rankRewardApi = {
  getRewardProgress: () => api.get('/get-reward-progress'),
  getRoyalityProgress: () => api.get('/get-royality-progress'),
  getTravelingProgress: () => api.get('/get-traveling-progress'),
};
