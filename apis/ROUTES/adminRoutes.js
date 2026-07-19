const express = require("express");

var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const AdminController = require("../API/ADMIN/AdminController");
const company_info = require("../API/USER/Info");
const PlansSetting = require("../API/ADMIN/plansettings");
const RouteController = require("../API/ADMIN/RouteController");
const { AdminFranchise } = require("../API/FRANCHISE/Auth");
const { AdminDistributor } = require("../API/DISTRIBUTOR/Auth");
const { AdminTheme } = require("../API/THEME/Auth");
const WellnessAdmin = require("../API/ADMIN/WellnessAdmin");
const ProductAdmin = require("../API/ADMIN/ProductAdmin");
const PackageAdmin = require("../API/ADMIN/PackageAdmin");
const OrderAdmin = require("../API/ADMIN/OrderAdmin");
const AuditService = require("../SERVICES/AuditService");
const wellnessPermissionSeed = require("../SERVICES/WellnessPermissionSeed");
const mediaUpload = require("../utils/mediaUpload");
const paymentUpload = require("../utils/paymentUpload");
const PaymentSettings = require("../API/ADMIN/PaymentSettings");
var admin = express.Router();
var jsonParser = bodyParser.json();
admin.use(jsonParser);
const corsOptions = {
  origin: '*', // Replace with your React app's URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
admin.use(cors(corsOptions));
admin.use(bodyParser.urlencoded({ extended: false }));
admin.use((req, res, next) => authenticator.authenticateToken(req, res, next, 'admin'));
admin.post('/login', AdminController.login);
admin.post('/register', AdminController.createAdmin);
admin.post('/get-plan-id', AdminController.getPlanById);
admin.post('/forgot-password', AdminController.forgotPassword);
admin.post('/update-plan/:planId', AdminController.updatePlan);
admin.get('/get-company-info', company_info.getInfo);
admin.get('/getAllPackage', PlansSetting.getAllPackage);
admin.get('/get-routes', RouteController.getRoutesByRole);
admin.get('/get-routes-by-role', RouteController.getRoutesByUserRole);
admin.post('/update-route-role', RouteController.updateRouteRole);

admin.post('/change-password', AdminController.updatePassword);
admin.post('/update-admin-password', AdminController.updatePassword);

admin.post('/update-broadcast-info',company_info.updateBroadcastInfo);

// ===== Wellness Commerce (Phase 1) =====
admin.post('/create-franchise', AdminFranchise.createFranchise);
admin.get('/get-franchises', AdminFranchise.getFranchises);
admin.get('/get-distributors', AdminDistributor.getDistributors);
admin.get('/get-theme-users', AdminTheme.getThemeUsers);
admin.post('/login-as-user', WellnessAdmin.loginAsUser);
admin.get('/get-audit-logs', AuditService.getLogs);
admin.get('/wellness-dashboard', WellnessAdmin.wellnessDashboard);
admin.post('/seed-wellness-permissions', wellnessPermissionSeed.run);

// ===== Wellness Commerce — Products & Stock =====
admin.post('/upload-product-media', mediaUpload.array('files', 10), ProductAdmin.uploadMedia);
admin.post('/create-product', ProductAdmin.createProduct);
admin.post('/update-product', ProductAdmin.updateProduct);
admin.post('/toggle-product-visibility', ProductAdmin.toggleVisibility);
admin.post('/update-product-stock', ProductAdmin.updateStock);
admin.get('/get-products', ProductAdmin.getProducts);
admin.get('/get-product', ProductAdmin.getProduct);
admin.get('/get-stock-history', ProductAdmin.getStockHistory);
admin.get('/get-low-stock-products', ProductAdmin.getLowStock);
admin.get('/get-out-of-stock-products', ProductAdmin.getOutOfStock);
admin.get('/get-inventory', ProductAdmin.getInventory);

// ===== Wellness Commerce — Packages =====
admin.post('/create-package', PackageAdmin.createPackage);
admin.post('/update-package', PackageAdmin.updatePackage);
admin.post('/toggle-package-status', PackageAdmin.toggleStatus);
admin.get('/get-packages', PackageAdmin.getPackages);
admin.get('/get-package', PackageAdmin.getPackage);

// ===== Wellness Commerce — Orders & Shipping =====
admin.get('/get-commerce-orders', OrderAdmin.getOrders);
admin.get('/get-commerce-order', OrderAdmin.getOrder);
admin.post('/update-order-status', OrderAdmin.updateStatus);
admin.post('/update-order-shipping', OrderAdmin.updateShipping);

// ===== Fund Wallet — Payment settings & deposits =====
admin.get('/get-payment-settings', PaymentSettings.getPaymentSettings);
admin.post('/update-payment-settings', PaymentSettings.updatePaymentSettings);
admin.post('/upload-payment-qr', paymentUpload.single('file'), PaymentSettings.uploadPaymentQr);
admin.get('/get-fund-deposits', PaymentSettings.getFundDeposits);
admin.post('/approve-fund-deposit', PaymentSettings.approveFundDeposit);
admin.post('/reject-fund-deposit', PaymentSettings.rejectFundDeposit);
admin.post('/send-fund', PaymentSettings.sendFund);
admin.get('/get-send-fund-history', PaymentSettings.getSendFundHistory);

module.exports = admin;
