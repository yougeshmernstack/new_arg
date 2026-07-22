import api from './axios';

export const walletApi = {
  getPaymentMethods: () => api.get('/get-payment-methods'),
  getFundWallet: () => api.get('/get-fund-wallet'),
  getFundDeposits: () => api.get('/get-fund-deposits'),
  submitFundDeposit: (formData) =>
    api.post('/submit-fund-deposit', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: [(data, headers) => {
        if (headers && typeof headers.set === 'function') {
          headers.set('Content-Type', undefined);
        } else if (headers) {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
        return data;
      }],
    }),
  getWithdrawInfo: () => api.get('/get-withdraw-info'),
  requestWithdraw: (payload) => api.post('/request-withdraw', payload),
  getWithdrawHistory: (params) => api.get('/get-withdraw-history', { params }),
};
