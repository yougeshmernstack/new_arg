import api from './axios';

export const wellnessApi = {
  getDashboard: () => api.get('/wellness-dashboard'),
  getFranchises: (params) => api.get('/get-franchises', { params }),
  createFranchise: (payload) => api.post('/create-franchise', payload),
  getDistributors: (params) => api.get('/get-distributors', { params }),
  getThemeUsers: (params) => api.get('/get-theme-users', { params }),
  loginAsUser: (payload) => api.post('/login-as-user', payload),
  getAuditLogs: (params) => api.get('/get-audit-logs', { params }),
  getStats: () => api.get('/get-dashboard-data'),
};
