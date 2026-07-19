import api from './axios';

export const storeApi = {
  getProducts: (params) => api.get('/get-products', { params }),
  getProduct: (productId) => api.get('/get-product', { params: { productId } }),
  getPackages: (params) => api.get('/get-packages', { params }),
  getPackage: (packageId) => api.get('/get-package', { params: { packageId } }),
  purchasePackage: (payload) => api.post('/purchase-package', payload),
  getCart: () => api.get('/get-cart'),
  addToCart: (payload) => api.post('/add-to-cart', payload),
  updateCartItem: (payload) => api.post('/update-cart-item', payload),
  removeCartItem: (payload) => api.post('/remove-cart-item', payload),
  checkout: (payload) => api.post('/checkout', payload),
  getOrders: (params) => api.get('/get-orders', { params }),
  getOrder: (orderId) => api.get('/get-order', { params: { orderId } }),
};
