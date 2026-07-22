import api from './axios';

export const rankRewardApi = {
  getRewardList: (params) => api.get('/get-reward-achievements', { params }),
  getRoyalityList: (params) => api.get('/get-royality-achievements', { params }),
  getTravelingList: (params) => api.get('/get-traveling-achievements', { params }),
  markComplete: (payload) => api.post('/mark-rank-complete', payload),
};
