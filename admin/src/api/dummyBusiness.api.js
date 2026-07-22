import api from './axios';

export const dummyBusinessApi = {
  grant: (payload) => api.post('/grant-dummy-business', payload),
  getHistory: (params) => api.get('/get-dummy-business-history', { params }),
};
