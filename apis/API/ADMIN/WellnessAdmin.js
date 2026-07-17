const jwt = require('jsonwebtoken');
const UserData = require('../../MODALS/userData');
const Franchise = require('../../MODALS/Franchise');
const Distributor = require('../../MODALS/Distributor');
const Package = require('../../MODALS/Package');
const Product = require('../../MODALS/Product');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const AuditService = require('../../SERVICES/AuditService');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess } = require('../../utils/successMessages');
const { INTERNAL_SERVER_ERROR, FORBIDDEN, INVALID_USERNAME } = require('../../utils/errorMessages');

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

            const query = uid ? { uid: Number(uid) } : { username };
            const user = await UserData.findOne(query);
            if (!user) {
                return res.status(400).json({ ...INVALID_USERNAME });
            }
            if (!user.roles || !user.roles.includes(target_role)) {
                return res.status(400).json({ code: 400, message: `User does not have role: ${target_role}` });
            }

            const payload = {
                uid: user.uid,
                username: user.username,
                role: target_role,
                impersonated_by: req.user.uid
            };

            let franchise = null;
            if (target_role === 'franchise') {
                franchise = await Franchise.findOne({ uid: user.uid });
                if (franchise) payload.franchiseId = franchise.franchiseId;
            }
            let distributor = null;
            if (target_role === 'distributor') {
                distributor = await Distributor.findOne({ uid: user.uid });
                if (distributor) payload.distributorId = distributor.distributorId;
            }

            const token = jwt.sign(payload, process.env.JWT_KEY);
            await UserData.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

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

            return res.status(200).json({
                ...loginSuccess,
                token,
                user,
                franchise,
                distributor,
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
            const [
                franchiseCount,
                distributorCount,
                themeUserCount,
                packageCount,
                productCount,
                orderCount
            ] = await Promise.all([
                Franchise.countDocuments({ status: { $ne: 'disabled' } }),
                Distributor.countDocuments({ status: { $ne: 'disabled' } }),
                UserData.countDocuments({ roles: 'theme' }),
                Package.countDocuments({ status: { $ne: 'disabled' } }),
                Product.countDocuments({ status: 'enabled' }),
                CommerceOrder.countDocuments()
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
                    orders: orderCount
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
