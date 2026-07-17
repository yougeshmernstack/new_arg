const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { FranchiseAuth } = require("../API/FRANCHISE/Auth");

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
franchise.get('/get-dashboard', FranchiseAuth.getDashboard);
franchise.get('/get-profile', FranchiseAuth.getProfile);
franchise.post('/update-profile', FranchiseAuth.updateProfile);
franchise.get('/get-notifications', FranchiseAuth.getNotifications);

module.exports = franchise;
