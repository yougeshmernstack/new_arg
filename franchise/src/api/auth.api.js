import api from './axios';

export const authApi = {
  login: (payload) => api.post('/login', payload),
};

export const franchiseApi = {
  getDashboard: () => api.get('/get-dashboard'),
  getProfile: () => api.get('/get-profile'),
  updateProfile: (payload) => api.post('/update-profile', payload),
  getNotifications: (params) => api.get('/get-notifications', { params }),
};
