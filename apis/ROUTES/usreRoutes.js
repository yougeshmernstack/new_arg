const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const profile = require("../API/USER/profile");
const { getAllRoutes, getAuthRoutes } = require("../utils/get-all-routes");
const GAME = require("../API/GAME/gameClass");
const authenticator = require("../utils/authuser");
const paymentController = require("../API/USER/Payment");
const upload = require("../utils/upload");
const balance = require("../API/USER/balances");
const runGame = require("../SERVICES/game");
const transaction = require("../SERVICES/Transaction");
const Html_Page = require("../SERVICES/HTMLpages");
const withdraw = require("../API/USER/Withdraw");
const Team = require("../API/USER/Team");
const orderValidator = require("../utils/order-validators");
const topup = require("../API/USER/Topup");
const Action = require("../SERVICES/Activity");
const Order = require("../SERVICES/Order");
const rank = require("../API/USER/getRanks");
const Rewards = require("../SERVICES/Rank&Rewards");
const submitKyc = require("../API/USER/Kyc");
const payOutMethod = require("../API/USER/PayOutOptions");
const company_info = require("../API/USER/Info");
const P2P = require("../API/USER/P2P");
const support = require("../SERVICES/support");
const OTPService = require("../SERVICES/OTPService");
const newsController = require("../SERVICES/newsController");
const withdrawal = require("../API/USER/Withdraw");
const UpdateTeam = require("../SERVICES/UpdateTeam");
const crossDatabaseTransfer = require("../SERVICES/CrossDBWalletTransfer");
const roiClosing = require("../SERVICES/Roi");
var u_router = express.Router();
var jsonParser = bodyParser.json();
u_router.use(jsonParser);
const corsOptions = {
  origin: '*', // Replace with your React app's URL
  methods: 'GET,POST',
};
u_router.use(cors(corsOptions));
u_router.use(bodyParser.urlencoded({ extended: false }));
u_router.use((req, res, next) => authenticator.authenticateToken(req, res, next, 'user'));
// u_router.use(authenticator.authenticate.bind(authenticator));
u_router.post('/register', profile.register);
u_router.post('/login', profile.login);
u_router.get('/get-payment-address', paymentController.generateOrRetrieveAddress);
u_router.post('/forgot-password', OTPService.verifyOTP, profile.forgotPassword);
u_router.post('/register-with-dap', profile.registerWithDap);
u_router.post('/login-with-dap', profile.loginWithDap);
u_router.post('/check_username', profile.check_username);
u_router.post('/update-password', profile.updatePassword);
// u_router.post('/update-profile',OTPService.verifyOTP, profile.updateProfile);
u_router.post('/update-profile', profile.updateProfile);
u_router.post('/get_all_games', GAME.all_games);
u_router.get('/get_all_providers', GAME.getProvider);
u_router.post('/game_init', GAME.game_init);
u_router.get('/get_profile', profile.get_profile);
u_router.get('/get-all-activity',Action.getAllActivities);
u_router.post('/get_profile_by_username', profile.get_profile_by_username);
u_router.get('/get_wallets', balance.getAllWallets);
u_router.get('/get_team_section', balance.getTeamSection);
u_router.get('/get-ranks',rank.getRanks);
u_router.get('/get_gamingwallet_for_Activation',rank.get_gamingwallet_for_Activation);
// u_router.get('/get-community-bonus',rank.getcomunity_bonus);
u_router.get('/get_upline_bonus',rank.get_upline_bonus);
// u_router.get('/get-achieve-ranks',  rank.achieve_rank);
// u_router.post('/claim_reward', rank.claimReward);
u_router.get('/get_page', Html_Page.Get_page);
u_router.post('/get_level_team', Team.getLevelTeam);

u_router.get('/principal_withdrawal', withdraw.principal_withdrawal, Action.act, withdraw.update_order_after_withdrawal);



u_router.get('/get_all_team', Team.getOverallTeam);
u_router.post('/get_genealogy_tree', Team.getGenealogyTree);
u_router.post('/withdraw', withdraw.withdraw, Action.act);
u_router.post('/topup', orderValidator.validatePackage, topup.topupWithFund, Action.act, Order.saveOrder);

u_router.post('/place-order-with-dap', orderValidator.validatePackage, topup.request, Order.placeOrder);
u_router.post('/confirm-order-with-dap', Order.confirmOrder);
u_router.post('/submit-bank-kyc', upload.single('document'), submitKyc.baknKyc);
u_router.post('/submit-pan-kyc', upload.single('document'), submitKyc.panKyc);
u_router.post('/submit-address-kyc', upload.fields([{ name: 'documentFront' }, { name: 'documentBack' }]), submitKyc.addressKyc);

u_router.get('/get-all-package', topup.getAllPackage);
u_router.get('/get-payment-method', paymentController.getPaymentOptions);
u_router.post('/payment-request', upload.single('proof'), paymentController.submitPaymentRequest);
u_router.get('/get-payment-transaction', transaction.getTransactions);
u_router.get('/get_income_transaction_community_team', transaction.getcommunity_team_transactions);
u_router.get('/payout-report', transaction.getIncomeTransactions);
u_router.get('/get_orders', Order.getOrders);
u_router.get('/get-company-info', company_info.getInfo);

u_router.post('/add-bank-details', payOutMethod.addBankDetail);
u_router.get('/get-bank-details', payOutMethod.getBankDetails);
u_router.post('/add-upi-details', payOutMethod.addUPIDetail);
u_router.get('/get-upi-details', payOutMethod.getUPIDetails);
u_router.post('/add-web3-details',payOutMethod.addWeb3Detail);
// u_router.post('/add-web3-details', OTPService.verifyOTP, payOutMethod.addWeb3Detail);
u_router.get('/get-web3-details', payOutMethod.getWeb3Details);
u_router.post('/delete-bank-details', payOutMethod.deleteBankDetail);
u_router.post('/delete-upi-details', payOutMethod.deleteUPIDetail);
u_router.post('/delete-web3-details', payOutMethod.deleteWeb3Detail);
u_router.post('/set-default-bank-details', payOutMethod.setDefaultBankDetail);
u_router.post('/set-default-upi-details', payOutMethod.setDefaultUPIDetail);
u_router.post('/set-default-web3-details', payOutMethod.setDefaultWeb3Detail);
u_router.get('/get-user-payment-details', payOutMethod.getUserPaymentOptions);

u_router.post('/create-ticket', upload.array('attachments', 10), support.createTicket);
u_router.get('/get-ticket', support.getUserTickets);
u_router.get('/get-ticket-types', support.getTicketTypes);
// u_router.post('/tickets/:ticketId/add-comment', support.addComment);
u_router.post('/add-comment', support.addComment);


u_router.post('/cancel-withdrawal-request', withdrawal.cancelWithdrawalRequest);

u_router.get('/getBusinessByDateRange', topup.getBusinessByDateRange);
// u_router.post('/sendcryp-payment-request', paymentController.SendCrypPaymentRequest);
// u_router.post('/manual-payment-status', paymentController.manualPaymentStatus);

u_router.get('/get-all-news', newsController.getAllNews);
u_router.get('/get-business', Order.getBusinessData);
// P2P  
u_router.post('/send-otp', OTPService.sendOTP);
u_router.post('/fund_transfer', OTPService.verifyOTP, P2P.fundTransfer, Action.act, P2P.recieveFund, Action.act);
u_router.post('/place-add-fund-dap',  Order.placeAddFund);
u_router.post('/confirm-add-fund-dap',orderValidator.validateFund, Order.confirmAddFund);

u_router.post('/main-to-fund-transfer', P2P.transferNonWorkingToFundWallet);

// u_router.post('/calculate-bussiness',UpdateTeam.calculateBusiness);

// console.log(routes)

u_router.get('/get_capping_bar', balance.checkBusinessAchievement_for_booster);

// u_router.get('/get_team_business',rank.getcommunityTeamBusiness);// this is for community team business

// u_router.get('/active_user_level_bussiness', UpdateTeam.activeUserBussiness)

// u_router.get('/getCappingReport',getCappingReport);

u_router.post('/transferFunds', crossDatabaseTransfer.transferFunds);
u_router.post('/checkUserInGamingDB', crossDatabaseTransfer.checkUserInGamingDB);

// Add new route for claiming ROI income
u_router.post('/claim-roi-income',roiClosing.claimIncome);

// Add new route for checking income eligibility
u_router.get('/check-income-eligibility', balance.checkIncomeEligibility);

u_router.post('/get_income_by_levels', Team.getLevelIncomeDetails);
  

module.exports = u_router;