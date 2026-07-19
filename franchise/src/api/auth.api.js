import api from './axios';

export const authApi = {
  login: (payload) => api.post('/login', payload),
  changePassword: (payload) => api.post('/change-password', payload),
};

export const franchiseApi = {
  getDashboard: () => api.get('/get-dashboard'),
  getInventory: (params) => api.get('/get-inventory', { params }),
  getProfile: () => api.get('/get-profile'),
  updateProfile: (payload) => api.post('/update-profile', payload),
  getNotifications: (params) => api.get('/get-notifications', { params }),
};
