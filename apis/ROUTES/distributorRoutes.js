const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { DistributorAuth } = require("../API/DISTRIBUTOR/Auth");
const DistributorTeam = require("../API/DISTRIBUTOR/Team");
const Storefront = require("../API/COMMERCE/Storefront");
const DistributorFund = require("../API/DISTRIBUTOR/Fund");
const paymentUpload = require("../utils/paymentUpload");

var distributor = express.Router();
var jsonParser = bodyParser.json();
distributor.use(jsonParser);
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
distributor.use(cors(corsOptions));
distributor.use(bodyParser.urlencoded({ extended: false }));
distributor.use((req, res, next) => authenticator.authenticateToken(req, res, next, 'distributor'));

distributor.post('/register', DistributorAuth.register);
distributor.post('/login', DistributorAuth.login);
distributor.get('/get-dashboard', DistributorAuth.getDashboard);
distributor.get('/get-profile', DistributorAuth.getProfile);
distributor.post('/update-profile', DistributorAuth.updateProfile);
distributor.post('/change-password', DistributorAuth.changePassword);
distributor.get('/get-direct-team', DistributorTeam.getDirectTeam);
distributor.get('/get-generation-team', DistributorTeam.getGenerationTeam);
distributor.get('/get-binary-legs', DistributorTeam.getBinaryLegs);
distributor.get('/get-binary-tree', DistributorTeam.getBinaryTree);

distributor.get('/get-products', Storefront.listProducts);
distributor.get('/get-product', Storefront.getProduct);
distributor.get('/get-packages', Storefront.listPackages);
distributor.get('/get-package', Storefront.getPackage);
distributor.post('/purchase-package', Storefront.purchasePackage);
distributor.get('/get-cart', Storefront.getCart);
distributor.post('/add-to-cart', Storefront.addToCart);
distributor.post('/update-cart-item', Storefront.updateCartItem);
distributor.post('/remove-cart-item', Storefront.removeCartItem);
distributor.post('/checkout', Storefront.checkout);
distributor.get('/get-orders', Storefront.myOrders);
distributor.get('/get-order', Storefront.getOrder);

// ===== Fund Wallet =====
distributor.get('/get-payment-methods', DistributorFund.getPaymentMethods);
distributor.get('/get-fund-wallet', DistributorFund.getFundWallet);
distributor.post('/submit-fund-deposit', paymentUpload.single('proof'), DistributorFund.submitFundDeposit);
distributor.get('/get-fund-deposits', DistributorFund.getFundDeposits);

module.exports = distributor;
