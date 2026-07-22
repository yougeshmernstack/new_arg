import api from './axios';

const multipart = {
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
};

export const kycApi = {
  getKyc: () => api.get('/get-kyc'),
  submitPanKyc: (formData) => api.post('/submit-pan-kyc', formData, multipart),
  submitBankKyc: (formData) => api.post('/submit-bank-kyc', formData, multipart),
  submitAadhaarKyc: (formData) => api.post('/submit-aadhaar-kyc', formData, multipart),
  submitNomineeKyc: (formData) => api.post('/submit-nominee-kyc', formData, multipart),
};
