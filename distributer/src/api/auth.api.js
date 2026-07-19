import api from './axios';

export const authApi = {
  login: (payload) => api.post('/login', payload),
  register: (payload) => api.post('/register', payload),
  changePassword: (payload) => api.post('/change-password', payload),
};

export const distributorApi = {
  getDashboard: () => api.get('/get-dashboard'),
  getProfile: () => api.get('/get-profile'),
  updateProfile: (payload) => api.post('/update-profile', payload),
  getNotifications: (params) => api.get('/get-notifications', { params }),
  getDirectTeam: (params) => api.get('/get-direct-team', { params }),
  getGenerationTeam: (params) => api.get('/get-generation-team', { params }),
  getBinaryLegs: () => api.get('/get-binary-legs'),
  getBinaryTree: (params) => api.get('/get-binary-tree', { params }),
};
