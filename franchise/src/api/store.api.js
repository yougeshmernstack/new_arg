import api from './axios';

export const storeApi = {
  getProducts: (params) => api.get('/get-products', { params }),
  getProduct: (productId) => api.get('/get-product', { params: { productId } }),
  getCart: () => api.get('/get-cart'),
  addToCart: (payload) => api.post('/add-to-cart', payload),
  updateCartItem: (payload) => api.post('/update-cart-item', payload),
  removeCartItem: (payload) => api.post('/remove-cart-item', payload),
  checkout: (payload) => api.post('/checkout', payload),
  getOrders: (params) => api.get('/get-orders', { params }),
  getOrder: (orderId) => api.get('/get-order', { params: { orderId } }),
  downloadInvoice: (orderId) =>
    api.get('/download-invoice', { params: { orderId }, responseType: 'blob' }),
  getPaymentMethods: () => api.get('/get-payment-methods'),
  submitOrderPayment: (formData) =>
    api.post('/submit-order-payment', formData, {
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
};
