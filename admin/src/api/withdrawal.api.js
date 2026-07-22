import api from './axios';

export const withdrawalApi = {
  getWithdrawals: (params) => api.get('/get-withdrawals', { params }),
  approveWithdrawal: (payload) => api.post('/approve-withdrawal', payload),
  rejectWithdrawal: (payload) => api.post('/reject-withdrawal', payload),
};
