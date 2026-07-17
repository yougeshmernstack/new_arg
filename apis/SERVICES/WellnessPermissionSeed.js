const { PermissionRoute } = require('../MODALS/Permission');
const { errorLogger } = require('../utils/logger');

const WELLNESS_PERMISSIONS = [
    // Admin – franchise management & login-as
    { route: '/create-franchise', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Create Franchise', showInMenu: false }, description: 'Admin creates franchise' },
    { route: '/get-franchises', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Franchises', icon: 'store', order: 20, showInMenu: true }, description: 'List franchises' },
    { route: '/get-distributors', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Distributors', icon: 'users', order: 21, showInMenu: true }, description: 'List distributors' },
    { route: '/get-theme-users', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Theme Users', icon: 'user', order: 22, showInMenu: true }, description: 'List theme users' },
    { route: '/login-as-user', routeFor: 'admin', method: 'POST', roles: ['admin'], menuMeta: { label: 'Login As User', showInMenu: false }, description: 'Admin login as franchise/distributor/theme' },
    { route: '/get-audit-logs', routeFor: 'admin', method: 'GET', roles: ['admin'], menuMeta: { label: 'Audit Logs', icon: 'list', order: 90, showInMenu: true }, description: 'Audit logs' },
    { route: '/wellness-dashboard', routeFor: 'admin', method: 'GET', roles: ['admin', 'manager'], menuMeta: { label: 'Wellness Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Wellness admin dashboard stats' },

    // Franchise
    { route: '/login', routeFor: 'franchise', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Franchise login' },
    { route: '/get-dashboard', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Franchise dashboard' },
    { route: '/get-profile', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Franchise profile' },
    { route: '/update-profile', routeFor: 'franchise', method: 'POST', roles: ['franchise'], menuMeta: { showInMenu: false }, description: 'Update franchise profile' },
    { route: '/get-notifications', routeFor: 'franchise', method: 'GET', roles: ['franchise'], menuMeta: { label: 'Notifications', icon: 'bell', order: 80, showInMenu: true }, description: 'Franchise notifications' },

    // Distributor
    { route: '/register', routeFor: 'distributor', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Distributor registration with sponsor' },
    { route: '/login', routeFor: 'distributor', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Distributor login' },
    { route: '/get-dashboard', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Distributor dashboard' },
    { route: '/get-profile', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Distributor profile' },
    { route: '/update-profile', routeFor: 'distributor', method: 'POST', roles: ['distributor'], menuMeta: { showInMenu: false }, description: 'Update distributor profile' },
    { route: '/get-notifications', routeFor: 'distributor', method: 'GET', roles: ['distributor'], menuMeta: { label: 'Notifications', icon: 'bell', order: 80, showInMenu: true }, description: 'Distributor notifications' },

    // Theme
    { route: '/register', routeFor: 'theme', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Theme free registration' },
    { route: '/login', routeFor: 'theme', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Theme login' },
    { route: '/get-dashboard', routeFor: 'theme', method: 'GET', roles: ['theme'], menuMeta: { label: 'Dashboard', icon: 'dashboard', order: 1, showInMenu: true }, description: 'Theme dashboard' },
    { route: '/get-profile', routeFor: 'theme', method: 'GET', roles: ['theme'], menuMeta: { label: 'Profile', icon: 'user', order: 99, showInMenu: true }, description: 'Theme profile' },
    { route: '/update-profile', routeFor: 'theme', method: 'POST', roles: ['theme'], menuMeta: { showInMenu: false }, description: 'Update theme profile' },
    { route: '/get-notifications', routeFor: 'theme', method: 'GET', roles: ['theme'], menuMeta: { label: 'Notifications', icon: 'bell', order: 80, showInMenu: true }, description: 'Theme notifications' }
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
module.exports = wellnessPermissionSeed;
