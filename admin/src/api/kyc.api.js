import api from './axios';

export const kycApi = {
  getKycList: (params) => api.get('/get-kyc-list', { params }),
  getKyc: (params) => api.get('/get-kyc', { params }),
  approveKyc: (payload) => api.post('/approve-kyc', payload),
  rejectKyc: (payload) => api.post('/reject-kyc', payload),
};
