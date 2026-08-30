const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { ThemeAuth } = require("../API/THEME/Auth");
const Storefront = require("../API/COMMERCE/Storefront");
const ThemeCatalog = require("../API/THEME/Catalog");
const DistributorFund = require("../API/DISTRIBUTOR/Fund");
const paymentUpload = require("../utils/paymentUpload");
const OTPService = require("../SERVICES/OTPService");

var theme = express.Router();
var jsonParser = bodyParser.json();
theme.use(jsonParser);
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
theme.use(cors(corsOptions));
theme.use(bodyParser.urlencoded({ extended: false }));
theme.use((req, res, next) => authenticator.authenticateToken(req, res, next, 'theme'));

theme.post('/register', ThemeAuth.register);
theme.post('/login', ThemeAuth.login);
theme.post('/send-otp', (req, res, next) => {
  req.panelRole = 'theme';
  return OTPService.sendOTP(req, res, next);
});
theme.post('/forgot-password', (req, res, next) => {
  req.panelRole = 'theme';
  return OTPService.verifyOTP(req, res, () => ThemeAuth.forgotPassword(req, res));
});
theme.get('/get-dashboard', ThemeAuth.getDashboard);
theme.get('/get-profile', ThemeAuth.getProfile);
theme.post('/update-profile', ThemeAuth.updateProfile);
theme.post('/change-password', ThemeAuth.changePassword);

// Public catalog / CMS (roles: public — no income fields)
theme.get('/get-site-content', ThemeCatalog.getSiteContent);
theme.get('/get-legal-documents', ThemeCatalog.getLegalDocuments);
theme.get('/catalog-products', ThemeCatalog.listProducts);
theme.get('/catalog-product', ThemeCatalog.getProduct);
theme.get('/catalog-packages', ThemeCatalog.listPackages);
theme.get('/catalog-package', ThemeCatalog.getPackage);

theme.get('/get-products', Storefront.listProducts);
theme.get('/get-product', Storefront.getProduct);
theme.get('/get-cart', Storefront.getCart);
theme.post('/add-to-cart', Storefront.addToCart);
theme.post('/update-cart-item', Storefront.updateCartItem);
theme.post('/remove-cart-item', Storefront.removeCartItem);
theme.post('/checkout', Storefront.checkout);
theme.get('/get-orders', Storefront.myOrders);
theme.get('/get-order', Storefront.getOrder);
theme.get('/download-invoice', Storefront.downloadInvoice);
theme.get('/get-payment-methods', DistributorFund.getPaymentMethods);
theme.post('/submit-order-payment', paymentUpload.single('proof'), Storefront.submitOrderPayment);

module.exports = theme;
