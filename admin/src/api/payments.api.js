import api from './axios';

export const paymentsApi = {
  getPaymentSettings: () => api.get('/get-payment-settings'),
  updatePaymentSettings: (payload) => api.post('/update-payment-settings', payload),
  uploadPaymentQr: (formData) =>
    api.post('/upload-payment-qr', formData, {
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
  getFundDeposits: (params) => api.get('/get-fund-deposits', { params }),
  approveFundDeposit: (payload) => api.post('/approve-fund-deposit', payload),
  rejectFundDeposit: (payload) => api.post('/reject-fund-deposit', payload),
  sendFund: (payload) => api.post('/send-fund', payload),
  getSendFundHistory: (params) => api.get('/get-send-fund-history', { params }),
};
