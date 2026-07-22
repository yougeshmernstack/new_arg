const { PermissionRoute } = require('../MODALS/Permission');
const { errorLogger } = require('../utils/logger');

const BUYER_STOREFRONT = (routeFor, role) => [
    { route: '/get-products', routeFor, method: 'GET', roles: [role], menuMeta: { label: 'Products', icon: 'box', order: 10, showInMenu: true }, description: 'Browse products' },
    { route: '/get-product', routeFor, method: 'GET', roles: [role], menuMeta: { showInMenu: false }, description: 'Product detail' },
    { route: '/get-cart', routeFor, method: 'GET', roles: [role], menuMeta: { label: 'Cart', icon: 'cart', order: 11, showInMenu: true }, description: 'Get cart' },
    { route: '/add-to-cart', routeFor, method: 'POST', roles: [role], menuMeta: { showInMenu: false }, description: 'Add to cart' },
    { route: '/update-cart-item', routeFor, method: 'POST', roles: [role], menuMeta: { showInMenu: false }, description: 'Update cart item' },
    { route: '/remove-cart-item', routeFor, method: 'POST', roles: [role], menuMeta: { showInMenu: false }, description: 'Remove cart item' },
    { route: '/checkout', routeFor, method: 'POST', roles: [role], menuMeta: { showInMenu: false }, description: 'Checkout / place order' },
    { route: '/get-orders', routeFor, method: 'GET', roles: [role], menuMeta: { label: 'Orders', icon: 'list', order: 12, showInMenu: true }, description: 'My orders' },
    { route: '/get-order', routeFor, method: 'GET', roles: [role], menuMeta: { showInMenu: false }, description: 'Order detail' },
];

const WELLNESS_PERMISSIONS = [
    // Admin – franchise management & login-as
    { route: '/create-franchise', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Create Franchise', showInMenu: false }, description: 'Admin creates franchise' },
    { route: '/get-franchises', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Franchises', icon: 'store', order: 20, showInMenu: true }, description: 'List franchises' },
    { route: '/get-distributors', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Distributors', icon: 'users', order: 21, showInMenu: true }, description: 'List distributors' },
    { route: '/get-theme-users', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Theme Users', icon: 'user', order: 22, showInMenu: true }, description: 'List theme users' },
    { route: '/login-as-user', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Login As User', showInMenu: false }, description: 'Admin login as franchise/distributor/theme' },
    { route: '/get-audit-logs', routeFor: 'admin', method: 'GET', roles: ['admin'], menuMeta: { label: 'Audit Logs', icon: 'list', order: 90, showInMenu: true }, description: 'Audit logs' },
    { route: '/wellness-dashboard', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Wellness Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Wellness admin dashboard stats' },

    // Admin – products & stock
    { route: '/upload-product-media', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Upload product images/videos' },
    { route: '/create-product', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Create product' },
    { route: '/update-product', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update product' },
    { route: '/toggle-product-visibility', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Hide/show product' },
    { route: '/update-product-stock', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update product stock' },
    { route: '/get-products', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Products', icon: 'box', order: 30, showInMenu: true }, description: 'List products' },
    { route: '/get-product', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Get product' },
    { route: '/get-stock-history', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Stock History', icon: 'history', order: 31, showInMenu: true }, description: 'Stock history' },
    { route: '/get-low-stock-products', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Low stock products' },
    { route: '/get-out-of-stock-products', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Out of stock products' },
    { route: '/get-inventory', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Inventory', icon: 'inventory', order: 32, showInMenu: true }, description: 'Inventory remaining vs delivered' },

    // Admin – packages
    { route: '/create-package', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Create activation package' },
    { route: '/update-package', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update activation package' },
    { route: '/toggle-package-status', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Toggle package status' },
    { route: '/get-packages', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Packages', icon: 'package', order: 33, showInMenu: true }, description: 'List packages' },
    { route: '/get-package', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Get package' },

    // Admin – commerce orders
    { route: '/get-commerce-orders', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Orders', icon: 'orders', order: 40, showInMenu: true }, description: 'List commerce orders' },
    { route: '/get-commerce-order', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Commerce order detail' },
    { route: '/update-order-status', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update order status' },
    { route: '/update-order-shipping', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update order shipping' },

    // Admin – fund wallet payment settings & deposits
    { route: '/get-payment-settings', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Payment Settings', icon: 'wallet', order: 50, showInMenu: true }, description: 'Get company bank/UPI settings' },
    { route: '/update-payment-settings', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update company bank/UPI settings' },
    { route: '/upload-payment-qr', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Upload UPI QR code' },
    { route: '/get-fund-deposits', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Fund Deposits', icon: 'wallet', order: 51, showInMenu: true }, description: 'List fund deposit requests' },
    { route: '/approve-fund-deposit', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Approve fund deposit and credit wallet' },
    { route: '/reject-fund-deposit', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Reject fund deposit request' },
    { route: '/send-fund', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Send Fund', icon: 'wallet', order: 52, showInMenu: true }, description: 'Admin credit fund wallet via add_fund activity' },
    { route: '/get-send-fund-history', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Admin send fund credit history' },
    { route: '/get-withdrawals', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Withdrawals', icon: 'wallet', order: 55, showInMenu: true }, description: 'List distributor withdrawal requests' },
    { route: '/approve-withdrawal', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Approve distributor withdrawal request' },
    { route: '/reject-withdrawal', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Reject withdrawal and refund main wallet' },
    { route: '/payout-report', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Payout Report', icon: 'wallet', order: 54, showInMenu: true }, description: 'Admin income payout report summary (total + today)' },
    { route: '/get-payout-report-detail', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Admin income payout report detail by slug' },
    { route: '/grant-dummy-business', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Dummy Business', icon: 'wallet', order: 53, showInMenu: true }, description: 'Grant left/right dummy BV to a distributor (recipient only)' },
    { route: '/get-dummy-business-history', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Dummy business grant history' },
    { route: '/get-reward-achievements', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Reward List', icon: 'gift', order: 56, showInMenu: true }, description: 'List reward rank achievements' },
    { route: '/get-royality-achievements', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Royality List', icon: 'gift', order: 57, showInMenu: true }, description: 'List royality rank achievements' },
    { route: '/get-traveling-achievements', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Traveling List', icon: 'gift', order: 58, showInMenu: true }, description: 'List traveling bonus achievements' },
    { route: '/mark-rank-complete', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Mark rank achievement as completed' },
    { route: '/get-kyc-list', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'KYC Requests', icon: 'user', order: 45, showInMenu: true }, description: 'List distributor KYC submissions' },
    { route: '/get-kyc', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Get distributor KYC detail' },
    { route: '/approve-kyc', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Approve distributor KYC type' },
    { route: '/reject-kyc', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Reject distributor KYC type' },
    { route: '/change-password', routeFor: 'admin', method: 'POST', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Admin change password' },
    { route: '/update-admin-password', routeFor: 'admin', method: 'POST', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Admin change password (legacy)' },

    // Admin – website CMS
    { route: '/get-website-content', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Website Content', icon: 'globe', order: 60, showInMenu: true }, description: 'Get theme website content' },
    { route: '/update-website-content', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update theme website content' },
    { route: '/upload-website-media', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Upload website images' },
    { route: '/get-legal-documents', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Legal Documents', icon: 'file', order: 61, showInMenu: true }, description: 'List legal documents' },
    { route: '/get-legal-document', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { showInMenu: false }, description: 'Get legal document' },
    { route: '/create-legal-document', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Create legal document' },
    { route: '/update-legal-document', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update legal document' },
    { route: '/toggle-legal-document-status', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Toggle legal document status' },
    { route: '/upload-legal-pdf', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Upload legal PDF' },
    { route: '/get-dashboard-banners', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Dashboard Banners', icon: 'image', order: 62, showInMenu: true }, description: 'List distributor dashboard banners' },
    { route: '/create-dashboard-banner', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Create dashboard banner' },
    { route: '/update-dashboard-banner', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Update dashboard banner' },
    { route: '/toggle-dashboard-banner-status', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Toggle dashboard banner status' },
    { route: '/upload-dashboard-banner', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { showInMenu: false }, description: 'Upload dashboard banner image' },

    // Franchise
    { route: '/login', routeFor: 'franchise', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Franchise login' },
    { route: '/get-dashboard', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Franchise dashboard' },
    { route: '/get-inventory', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Inventory', icon: 'inventory', order: 2, showInMenu: true }, description: 'Franchise warehouse inventory' },
    { route: '/get-profile', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Franchise profile' },
    { route: '/update-profile', routeFor: 'franchise', method: 'POST', roles: ['franchise'], menuMeta: { showInMenu: false }, description: 'Update franchise profile' },
    { route: '/change-password', routeFor: 'franchise', method: 'POST', roles: ['franchise'], menuMeta: { showInMenu: false }, description: 'Franchise change password' },
    ...BUYER_STOREFRONT('franchise', 'franchise'),

    // Distributor
    { route: '/register', routeFor: 'distributor', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Distributor registration with sponsor' },
    { route: '/login', routeFor: 'distributor', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Distributor login' },
    { route: '/get-dashboard', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Distributor dashboard' },
    { route: '/get-income-history', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Distributor income history by slug' },
    { route: '/get-dashboard-banners', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Active distributor dashboard banners' },
    { route: '/get-profile', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Distributor profile' },
    { route: '/update-profile', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Update distributor profile' },
    { route: '/change-password', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Distributor change password' },
    { route: '/get-direct-team', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Direct Team', icon: 'users', order: 40, showInMenu: true }, description: 'Distributor direct team list' },
    { route: '/get-generation-team', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Generation Team', icon: 'users', order: 41, showInMenu: true }, description: 'Distributor generation team list' },
    { route: '/get-binary-legs', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Binary Legs', icon: 'users', order: 42, showInMenu: false }, description: 'Distributor left and right binary leg lists' },
    { route: '/get-binary-tree', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Binary Tree', icon: 'users', order: 43, showInMenu: false }, description: 'Distributor binary tree view' },
    { route: '/get-packages', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Packages', icon: 'package', order: 9, showInMenu: true }, description: 'Browse activation packages' },
    { route: '/get-package', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Package detail' },
    { route: '/purchase-package', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Purchase package and activate' },
    { route: '/get-payment-methods', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Active company bank/UPI for deposits' },
    { route: '/get-fund-wallet', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Fund Wallet', icon: 'wallet', order: 8, showInMenu: true }, description: 'Distributor fund wallet balance' },
    { route: '/submit-fund-deposit', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Submit fund deposit with UTR' },
    { route: '/get-fund-deposits', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Distributor fund deposit history' },
    { route: '/get-withdraw-info', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Withdraw', icon: 'wallet', order: 11, showInMenu: true }, description: 'Get main wallet withdrawal info and KYC lock status' },
    { route: '/request-withdraw', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Request withdrawal from main wallet' },
    { route: '/get-withdraw-history', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Distributor withdrawal request history' },
    { route: '/get-kyc', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'KYC', icon: 'user', order: 10, showInMenu: true }, description: 'Get distributor KYC status and details' },
    { route: '/submit-pan-kyc', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Submit PAN KYC' },
    { route: '/submit-bank-kyc', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Submit Bank KYC' },
    { route: '/submit-aadhaar-kyc', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Submit Aadhaar KYC' },
    { route: '/submit-nominee-kyc', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Submit Nominee KYC' },
    { route: '/get-reward-progress', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Reward', icon: 'gift', order: 44, showInMenu: true }, description: 'Distributor reward ranks progress' },
    { route: '/get-royality-progress', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Royality', icon: 'gift', order: 45, showInMenu: true }, description: 'Distributor royality ranks progress' },
    { route: '/get-traveling-progress', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Traveling Allowance', icon: 'gift', order: 46, showInMenu: true }, description: 'Distributor traveling bonus progress' },
    ...BUYER_STOREFRONT('distributor', 'distributor'),
    // Theme
    { route: '/register', routeFor: 'theme', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Theme free registration' },
    { route: '/login', routeFor: 'theme', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Theme login' },
    { route: '/get-dashboard', routeFor: 'theme', method: 'GET', roles: ['theme'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Theme dashboard' },
    { route: '/get-profile', routeFor: 'theme', method: 'GET', roles: ['theme'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Theme profile' },
    { route: '/update-profile', routeFor: 'theme', method: 'POST', roles: ['theme'], menuMeta: { showInMenu: false }, description: 'Update theme profile' },
    { route: '/change-password', routeFor: 'theme', method: 'POST', roles: ['theme'], menuMeta: { showInMenu: false }, description: 'Theme change password' },
    // Theme – public catalog / CMS (no auth / no income)
    { route: '/get-site-content', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public website content' },
    { route: '/get-legal-documents', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public legal documents' },
    { route: '/catalog-products', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public product catalog' },
    { route: '/catalog-product', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public product detail' },
    { route: '/catalog-packages', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public package catalog' },
    { route: '/catalog-package', routeFor: 'theme', method: 'GET', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Public package detail' },
    ...BUYER_STOREFRONT('theme', 'theme')
];

class WellnessPermissionSeed {
    async seed() {
        try {
            let created = 0;
            let skipped = 0;
            for (const perm of WELLNESS_PERMISSIONS) {
                const exists = await PermissionRoute.findOne({
                    route: perm.route,
                    routeFor: perm.routeFor,
                    method: perm.method
                });
                if (exists) {
                    skipped += 1;
                    continue;
                }
                await new PermissionRoute(perm).save();
                created += 1;
            }
            return { success: true, created, skipped, total: WELLNESS_PERMISSIONS.length };
        } catch (error) {
            errorLogger(error);
            return { success: false, error: error.message };
        }
    }

    async run(req, res) {
        try {
            const result = await this.seed();
            if (!result.success) {
                return res.status(500).json({ status: 500, message: 'Permission seed failed.', error: result.error });
            }
            return res.status(200).json({ status: 200, message: 'Wellness permissions seeded.', ...result });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ status: 500, message: 'Internal server error.' });
        }
    }
}

const wellnessPermissionSeed = new WellnessPermissionSeed();
module.exports = {
    seed: (...args) => wellnessPermissionSeed.seed(...args),
    run: (req, res) => wellnessPermissionSeed.run(req, res),
};
