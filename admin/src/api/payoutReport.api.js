import api from './axios';

export const payoutReportApi = {
  getSummary: () => api.get('/payout-report'),
  getBySlug: (slug, params = {}) =>
    api.get('/get-payout-report-detail', { params: { slug, ...params } }),
};
