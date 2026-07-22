import api from './axios';

const formUpload = (formData) => ({
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
});

export const websiteApi = {
  getWebsiteContent: () => api.get('/get-website-content'),
  updateWebsiteContent: (payload) => api.post('/update-website-content', payload),
  uploadWebsiteMedia: (formData) =>
    api.post('/upload-website-media', formData, formUpload(formData)),

  getLegalDocuments: (params) => api.get('/get-legal-documents', { params }),
  getLegalDocument: (documentId) => api.get('/get-legal-document', { params: { documentId } }),
  createLegalDocument: (payload) => api.post('/create-legal-document', payload),
  updateLegalDocument: (payload) => api.post('/update-legal-document', payload),
  toggleLegalDocumentStatus: (payload) => api.post('/toggle-legal-document-status', payload),
  uploadLegalPdf: (formData) =>
    api.post('/upload-legal-pdf', formData, formUpload(formData)),

  getDashboardBanners: (params) => api.get('/get-dashboard-banners', { params }),
  createDashboardBanner: (payload) => api.post('/create-dashboard-banner', payload),
  updateDashboardBanner: (payload) => api.post('/update-dashboard-banner', payload),
  toggleDashboardBannerStatus: (payload) => api.post('/toggle-dashboard-banner-status', payload),
  uploadDashboardBanner: (formData) =>
    api.post('/upload-dashboard-banner', formData, formUpload(formData)),
};
