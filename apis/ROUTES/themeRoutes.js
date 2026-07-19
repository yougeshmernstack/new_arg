const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { ThemeAuth } = require("../API/THEME/Auth");
const Storefront = require("../API/COMMERCE/Storefront");

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
theme.get('/get-dashboard', ThemeAuth.getDashboard);
theme.get('/get-profile', ThemeAuth.getProfile);
theme.post('/update-profile', ThemeAuth.updateProfile);
theme.post('/change-password', ThemeAuth.changePassword);

theme.get('/get-products', Storefront.listProducts);
theme.get('/get-product', Storefront.getProduct);
theme.get('/get-cart', Storefront.getCart);
theme.post('/add-to-cart', Storefront.addToCart);
theme.post('/update-cart-item', Storefront.updateCartItem);
theme.post('/remove-cart-item', Storefront.removeCartItem);
theme.post('/checkout', Storefront.checkout);
theme.get('/get-orders', Storefront.myOrders);
theme.get('/get-order', Storefront.getOrder);

module.exports = theme;
