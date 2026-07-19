import api from './axios';

export const authApi = {
  login: (payload) => api.post('/login', payload),
  forgotPassword: (payload) => api.post('/forgot-password', payload),
  sendOtp: (payload) => api.post('/send-otp', payload),
  changePassword: (payload) => api.post('/change-password', payload),
};
