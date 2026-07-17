const express = require("express");

var bodyParser = require("body-parser");
const cors = require("cors");
const authenticator = require("../utils/authuser");
const AdminController = require("../API/ADMIN/AdminController");
const PaymentAction = require("../API/ADMIN/PaymentOptions");
const Dashboard = require("../API/ADMIN/Dashboard");
const Order = require("../SERVICES/Order");
const transaction = require("../SERVICES/Transaction");
const Users = require("../API/ADMIN/User");
const Funds = require("../API/ADMIN/FundController");
const Rewards = require("../API/ADMIN/Rewards");
const paymentController = require("../API/USER/Payment");
const Team = require("../API/USER/Team");
const company_info = require("../API/USER/Info");
const newsController = require("../SERVICES/newsController");
const upload = require("../utils/upload");
const PlansSetting = require("../API/ADMIN/plansettings");
const RouteController = require("../API/ADMIN/RouteController");

const balance = require("../API/USER/balances.js");
const profile = require("../API/USER/profile");
const withdrawal = require("../API/ADMIN/withdrawal");
const ProfileUpdate = require("../API/ADMIN/ProfileUpdate");
const support = require("../SERVICES/support.js");
const Action = require("../SERVICES/Activity.js");
const orderValidator = require("../utils/order-validators");
const AdminTopup = require("../API/ADMIN/Topup");
const payOutMethod = require("../API/USER/PayOutOptions");
const OTPService = require("../SERVICES/OTPService");
const { AdminFranchise } = require("../API/FRANCHISE/Auth");
const { AdminDistributor } = require("../API/DISTRIBUTOR/Auth");
const { AdminTheme } = require("../API/THEME/Auth");
const WellnessAdmin = require("../API/ADMIN/WellnessAdmin");
const AuditService = require("../SERVICES/AuditService");
const wellnessPermissionSeed = require("../SERVICES/WellnessPermissionSeed");
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
admin.post('/register', upload.single('proofUrl'), Users.register);
admin.post('/login', AdminController.login);
admin.post('/login-user', AdminController.loginUser);
admin.post('/get-plan-id', AdminController.getPlanById);
admin.post('/send-otp', OTPService.sendOTP);
admin.post('/forgot-password', OTPService.verifyOTP, AdminController.forgotPassword);
admin.post('/update-plan/:planId', AdminController.updatePlan);
admin.get('/save_payment_option', PaymentAction.seedPaymentOptions);
admin.post('/add-bank-details', PaymentAction.addBankDetail);
admin.post('/add-upi-details', PaymentAction.addUPIDetail);
admin.post('/add-web3-details', PaymentAction.addWeb3Detail);
admin.post('/delete-bank-details', PaymentAction.deleteBankDetail);
admin.post('/delete-upi-details', PaymentAction.deleteUPIDetail);
admin.post('/delete-web3-details', PaymentAction.deleteWeb3Detail);
admin.post('/set-default-bank-details', PaymentAction.setDefaultBankDetail);
admin.post('/check_username', profile.check_username);
admin.post('/add_fund', Funds.generateFund);
admin.post('/retrieve_fund', Funds.retrieveFund);
admin.get('/retrieve_wallet', Funds.retrieve_wallets);
admin.get('/get-payment-method', paymentController.getPaymentOptions);
admin.post('/sendcryp-payment-request', paymentController.SendCrypPaymentRequest);
admin.post('/manual-payment-status', paymentController.manualPaymentStatus);
admin.get('/get-company-info', company_info.getInfo);

admin.get('/get-ticket', support.getTicketById);
admin.get('/get-all-tickets', support.getAllTickets);
admin.post('/update-ticket', support.updateTicket);
// admin.post('/tickets/:ticketId/add-comment', support.adminAddComment);
admin.post('/add-comment', support.adminAddComment);

admin.post('/set-default-upi-details', PaymentAction.setDefaultUPIDetail);
admin.post('/set-default-web3-details', PaymentAction.setDefaultWeb3Detail);
admin.get('/all-payment-request', Funds.allPaymentRequest);
admin.get('/get-ranks', Rewards.allRewardRequest);
admin.get('/get_upline_bonus', Rewards.get_upline_bonus);
admin.post('/approve_reward_request', Rewards.approveRewardRequests);
admin.post('/approve-payment-request', Funds.approvePaymentRequests);
admin.post('/reject-payment-request', Funds.rejectPaymentRequests);
admin.get('/get-dashboard-data', Dashboard.getStats);
admin.post('/update-coin', Order.updateCoinPrice);
admin.post('/update-principal-withdraw', Order.updateprincipalWithdrawalStatus);
admin.post('/update-bonus-income', PlansSetting.updateBonusIncome);
admin.get('/getAllPackage', PlansSetting.getAllPackage);

admin.get('/get_wallets', balance.getAllWallets);
admin.get('/get-payment-transaction', transaction.getTransactions);
admin.post('/release_income', withdrawal.mannual_release_income);

admin.get('/payout-report', transaction.getIncomeTransactions);
admin.get('/get-all-users', Users.getUserData);
admin.get('/get_all_team', Team.getOverallTeam);
admin.post('/approve-withdrawal-request', withdrawal.approve);
admin.post('/reject-withdrawal-request', withdrawal.reject);
admin.post('/sendcryp-payment-transfer', withdrawal.sendCrypPaymentTransfer);
admin.get('/get-advance-info', withdrawal.getAdvanceInfo);
admin.post('/update-withdrawal-limits', withdrawal.updateWithdrawalLimits);


admin.post('/user-profile-update', ProfileUpdate.adminUpdateUserProfile);
admin.post('/user-password-update', ProfileUpdate.adminUpdateUserPassword);


admin.get('/get_all_orders', Order.getOrders);

admin.get('/total_payout', Dashboard.payout);

admin.get('/get-all-news', newsController.getAllNews);
admin.post('/add-news', upload.single('image'), newsController.addNews);
admin.post('/delete-news', newsController.deleteNews);

admin.post('/update-news', newsController.updateNewsSettings);

admin.post('/placeorder', AdminController.order);
admin.post('/givepower', AdminController.givePower);
admin.get('/get-all-power', AdminController.getAllPower);


admin.post('/disable-enable-activity',Action.disabaleEnableActivity);
admin.get('/disable_activity_list',Action.disableActivity_user);
admin.get('/get-all-activity',Action.getAllActivities);



admin.post('/user_block_unblock', Users.user_block_unblock);
admin.post('/block_unblock_tree_activity', Users.block_unblock_tree_activity);
// admin.get('/get-all-blocked-widthrawal-user',Users.get_blocked_widthrawal_users);
admin.post('/add_capping', Users.add_capping);
admin.get('/get_capping_users', Users.get_capping_users);

// OPTIONAL
admin.get('/get-all-blocked-widthrawal-user', Users.get_blocked_widthrawal_users);

admin.post('/update-user-role', Users.updateUserRole);
admin.get('/get-routes', RouteController.getRoutesByRole);
admin.get('/get-routes-by-role', RouteController.getRoutesByUserRole);
admin.post('/update-route-role', RouteController.updateRouteRole);

// update password for uid 1
admin.post("/update-admin-password", AdminController.updatePassword)

admin.post('/update-broadcast-info',company_info.updateBroadcastInfo);

admin.post('/admin-topup', orderValidator.validatePackage, AdminTopup.adminTopup);

admin.get('/get-bank-details-for-admin', payOutMethod.getBankDetailsForAdmin);
admin.post('/edit-bank-upi-details-for-admin', upload.single('upiImage'), payOutMethod.editBankAndUPIDetailsForAdmin);

// ===== Wellness Commerce (Phase 1) =====
admin.post('/create-franchise', AdminFranchise.createFranchise);
admin.get('/get-franchises', AdminFranchise.getFranchises);
admin.get('/get-distributors', AdminDistributor.getDistributors);
admin.get('/get-theme-users', AdminTheme.getThemeUsers);
admin.post('/login-as-user', WellnessAdmin.loginAsUser);
admin.get('/get-audit-logs', AuditService.getLogs);
admin.get('/wellness-dashboard', WellnessAdmin.wellnessDashboard);
admin.post('/seed-wellness-permissions', wellnessPermissionSeed.run);

module.exports = admin;