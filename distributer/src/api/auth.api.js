import api from './axios';

export const authApi = {
  login: (payload) => api.post('/login', payload),
  register: (payload) => api.post('/register', payload),
};

export const distributorApi = {
  getDashboard: () => api.get('/get-dashboard'),
  getProfile: () => api.get('/get-profile'),
  updateProfile: (payload) => api.post('/update-profile', payload),
  getNotifications: (params) => api.get('/get-notifications', { params }),
};
