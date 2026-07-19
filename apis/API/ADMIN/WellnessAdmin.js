const jwt = require('jsonwebtoken');
const Franchise = require('../../MODALS/Franchise');
const Distributor = require('../../MODALS/Distributor');
const ThemeUser = require('../../MODALS/ThemeUser');
const Package = require('../../MODALS/Package');
const Product = require('../../MODALS/Product');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const AuditService = require('../../SERVICES/AuditService');
const { LOW_STOCK_THRESHOLD } = require('./ProductAdmin');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess } = require('../../utils/successMessages');
const { INTERNAL_SERVER_ERROR, FORBIDDEN, INVALID_USERNAME } = require('../../utils/errorMessages');

const PANEL_MODELS = {
    franchise: Franchise,
    distributor: Distributor,
    theme: ThemeUser
};

class WELLNESS_ADMIN {
    async loginAsUser(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ ...FORBIDDEN });
            }

            const { username, uid, target_role } = req.body;
            if (!target_role || !['franchise', 'distributor', 'theme'].includes(target_role)) {
                return res.status(400).json({ code: 400, message: 'target_role must be franchise, distributor or theme.' });
            }

            const Model = PANEL_MODELS[target_role];
            const query = uid ? { uid: Number(uid) } : { username };
            const user = await Model.findOne(query);
            if (!user) {
                return res.status(400).json({ ...INVALID_USERNAME });
            }

            const payload = {
                uid: user.uid,
                username: user.username,
                role: target_role,
                impersonated_by: req.user.uid
            };

            let franchise = null;
            let distributor = null;
            if (target_role === 'franchise') {
                franchise = user;
                payload.franchiseId = user.franchiseId;
            }
            if (target_role === 'distributor') {
                distributor = user;
                payload.distributorId = user.distributorId;
            }
            if (target_role === 'theme') {
                payload.themeUserId = user.themeUserId;
            }

            const token = jwt.sign(payload, process.env.JWT_KEY);
            await Model.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: 'admin',
                action: 'LOGIN_AS_USER',
                target_uid: user.uid,
                target_role,
                target_type: 'user',
                target_id: user.uid,
                ip: req.ip,
                meta: { username: user.username, target_role }
            });

            const safeUser = user.toObject();
            delete safeUser.password;

            return res.status(200).json({
                ...loginSuccess,
                token,
                user: safeUser,
                franchise: franchise ? (({ password, ...rest }) => rest)(franchise.toObject()) : null,
                distributor: distributor ? (({ password, ...rest }) => rest)(distributor.toObject()) : null,
                impersonated: true,
                target_role
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async wellnessDashboard(req, res) {
        try {
            const threshold = Number(req.query.low_stock_threshold) || LOW_STOCK_THRESHOLD;

            const [
                franchiseCount,
                distributorCount,
                themeUserCount,
                packageCount,
                productCount,
                orderCount,
                lowStockCount,
                outOfStockCount,
                pendingOrders,
                deliveredOrders,
                revenueAgg,
                lowStockProducts,
                outOfStockProducts
            ] = await Promise.all([
                Franchise.countDocuments({ status: { $ne: 'disabled' } }),
                Distributor.countDocuments({ status: { $ne: 'disabled' } }),
                ThemeUser.countDocuments({ status: 1 }),
                Package.countDocuments({ status: { $ne: 'disabled' } }),
                Product.countDocuments({ status: 'enabled' }),
                CommerceOrder.countDocuments(),
                Product.countDocuments({ status: 'enabled', stock: { $gt: 0, $lte: threshold } }),
                Product.countDocuments({ status: 'enabled', stock: { $lte: 0 } }),
                CommerceOrder.countDocuments({ order_status: 'pending' }),
                CommerceOrder.countDocuments({ order_status: 'delivered' }),
                CommerceOrder.aggregate([
                    { $match: { order_status: { $nin: ['cancelled', 'refunded'] } } },
                    { $group: { _id: null, revenue: { $sum: '$grand_total' } } }
                ]),
                Product.find({ status: 'enabled', stock: { $gt: 0, $lte: threshold } })
                    .sort({ stock: 1 })
                    .limit(10)
                    .select('productId product_name sku stock is_hidden'),
                Product.find({ status: 'enabled', stock: { $lte: 0 } })
                    .sort({ updated_at: -1 })
                    .limit(10)
                    .select('productId product_name sku stock is_hidden')
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Wellness dashboard fetched.',
                data: {
                    franchises: franchiseCount,
                    distributors: distributorCount,
                    theme_users: themeUserCount,
                    packages: packageCount,
                    products: productCount,
                    orders: orderCount,
                    low_stock: lowStockCount,
                    out_of_stock: outOfStockCount,
                    pending_orders: pendingOrders,
                    delivered_orders: deliveredOrders,
                    revenue: revenueAgg[0]?.revenue || 0,
                    low_stock_products: lowStockProducts,
                    out_of_stock_products: outOfStockProducts,
                    low_stock_threshold: threshold
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const WellnessAdmin = new WELLNESS_ADMIN();
module.exports = WellnessAdmin;
