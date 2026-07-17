const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const { DistributorAuth } = require("../API/DISTRIBUTOR/Auth");

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
distributor.get('/get-notifications', DistributorAuth.getNotifications);

module.exports = distributor;
