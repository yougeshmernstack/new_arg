const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { FranchiseAuth } = require("../API/FRANCHISE/Auth");
const Storefront = require("../API/COMMERCE/Storefront");
const DistributorFund = require("../API/DISTRIBUTOR/Fund");
const paymentUpload = require("../utils/paymentUpload");
const OTPService = require("../SERVICES/OTPService");

var franchise = express.Router();
var jsonParser = bodyParser.json();
franchise.use(jsonParser);
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
franchise.use(cors(corsOptions));
franchise.use(bodyParser.urlencoded({ extended: false }));
franchise.use((req, res, next) => authenticator.authenticateToken(req, res, next, 'franchise'));

franchise.post('/login', FranchiseAuth.login);
franchise.post('/send-otp', (req, res, next) => {
  req.panelRole = 'franchise';
  return OTPService.sendOTP(req, res, next);
});
franchise.post('/forgot-password', (req, res, next) => {
  req.panelRole = 'franchise';
  return OTPService.verifyOTP(req, res, () => FranchiseAuth.forgotPassword(req, res));
});
franchise.get('/get-dashboard', FranchiseAuth.getDashboard);
franchise.get('/get-inventory', FranchiseAuth.getInventory);
franchise.get('/get-profile', FranchiseAuth.getProfile);
franchise.post('/update-profile', FranchiseAuth.updateProfile);
franchise.post('/change-password', FranchiseAuth.changePassword);

franchise.get('/get-products', Storefront.listProducts);
franchise.get('/get-product', Storefront.getProduct);
franchise.get('/get-cart', Storefront.getCart);
franchise.post('/add-to-cart', Storefront.addToCart);
franchise.post('/update-cart-item', Storefront.updateCartItem);
franchise.post('/remove-cart-item', Storefront.removeCartItem);
franchise.post('/checkout', Storefront.checkout);
franchise.get('/get-orders', Storefront.myOrders);
franchise.get('/get-order', Storefront.getOrder);
franchise.get('/download-invoice', Storefront.downloadInvoice);
franchise.get('/get-payment-methods', DistributorFund.getPaymentMethods);
franchise.post('/submit-order-payment', paymentUpload.single('proof'), Storefront.submitOrderPayment);

module.exports = franchise;
