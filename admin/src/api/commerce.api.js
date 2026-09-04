import api from './axios';

export const commerceApi = {
  // Products
  getProducts: (params) => api.get('/get-products', { params }),
  getProduct: (productId) => api.get('/get-product', { params: { productId } }),
  createProduct: (payload) => api.post('/create-product', payload),
  updateProduct: (payload) => api.post('/update-product', payload),
  uploadMedia: (formData) =>
    api.post('/upload-product-media', formData, {
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
  toggleVisibility: (payload) => api.post('/toggle-product-visibility', payload),
  updateStock: (payload) => api.post('/update-product-stock', payload),
  getStockHistory: (params) => api.get('/get-stock-history', { params }),
  getLowStock: (params) => api.get('/get-low-stock-products', { params }),
  getOutOfStock: (params) => api.get('/get-out-of-stock-products', { params }),
  getInventory: (params) => api.get('/get-inventory', { params }),

  // Packages
  getPackages: (params) => api.get('/get-packages', { params }),
  getPackage: (packageId) => api.get('/get-package', { params: { packageId } }),
  createPackage: (payload) => api.post('/create-package', payload),
  updatePackage: (payload) => api.post('/update-package', payload),
  togglePackageStatus: (payload) => api.post('/toggle-package-status', payload),

  // Orders
  getOrders: (params) => api.get('/get-commerce-orders', { params }),
  getOrder: (orderId) => api.get('/get-commerce-order', { params: { orderId } }),
  updateOrderStatus: (payload) => api.post('/update-order-status', payload),
  updateShipping: (payload) => api.post('/update-order-shipping', payload),
  verifyOrderPayment: (payload) => api.post('/verify-order-payment', payload),
  rejectOrderPayment: (payload) => api.post('/reject-order-payment', payload),
  downloadInvoice: (orderId) =>
    api.get('/download-invoice', { params: { orderId }, responseType: 'blob' }),
  createGuestInvoice: (payload) => api.post('/create-guest-invoice', payload),
};
