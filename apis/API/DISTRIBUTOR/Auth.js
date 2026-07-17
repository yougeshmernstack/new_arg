const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserData = require('../../MODALS/userData');
const Distributor = require('../../MODALS/Distributor');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Notification = require('../../MODALS/Notification');
const form_validator = require('../../utils/form-validators');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const {
    INTERNAL_SERVER_ERROR,
    INVALID_CREDENTIALS,
    USERNAME_ALREADY_EXISTS,
    INVALID_USERNAME,
    INVALID_SPONSOR
} = require('../../utils/errorMessages');

class DISTRIBUTOR_AUTH {
    async register(req, res) {
        try {
            const { name, email, mobile, password, username, sponsor_Id, address, photo } = req.body;

            if (!sponsor_Id) {
                return res.status(400).json({ code: 400, message: 'Sponsor ID is required for distributor registration.' });
            }

            // Sponsor must be an existing franchise or distributor
            const sponsorUser = await UserData.findOne({
                $or: [
                    { uid: Number(sponsor_Id) },
                    { username: String(sponsor_Id) }
                ]
            });
            if (!sponsorUser) {
                return res.status(INVALID_SPONSOR.code).json({ ...INVALID_SPONSOR });
            }
            const allowedSponsorRoles = ['franchise', 'distributor', 'admin'];
            const hasSponsorRole = sponsorUser.roles && sponsorUser.roles.some((r) => allowedSponsorRoles.includes(r));
            if (!hasSponsorRole) {
                return res.status(400).json({ code: 400, message: 'Invalid sponsor. Sponsor must be Franchise, Distributor or Admin.' });
            }

            const validUserNameResult = await form_validator.generateUserName(username || 'distributor');
            if (!validUserNameResult.status) {
                return res.status(INVALID_USERNAME.code).json({ ...INVALID_USERNAME });
            }

            const isUsernameExist = await UserData.findOne({ username: validUserNameResult.userName });
            if (isUsernameExist) {
                return res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
            }

            const isEmail = await form_validator.isEmail(email);
            if (!isEmail.status) {
                return res.status(400).json({ ...isEmail });
            }

            const isStrongPassword = await form_validator.generatePassword(password);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            const totalUsers = await UserData.countDocuments();
            const validity = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const user = new UserData({
                name,
                email,
                mobile,
                password: hashedPassword,
                username: validUserNameResult.userName,
                uid: totalUsers + 1,
                roles: ['distributor'],
                user_type: 'distributor',
                status: 1,
                sponsor_Id: sponsorUser.uid,
                photo: photo || null,
                id_card_validity: validity,
                joining_date: new Date(),
                lastActivity: new Date()
            });
            const savedUser = await user.save();

            const distributor = new Distributor({
                uid: savedUser.uid,
                name,
                email,
                mobile,
                sponsor_Id: sponsorUser.uid,
                sponsor_uid: sponsorUser.uid,
                address: address || {},
                photo: photo || null,
                status: 'active',
                joining_date: new Date(),
                id_card_validity: validity
            });
            await distributor.save();

            const payload = {
                uid: savedUser.uid,
                username: savedUser.username,
                role: 'distributor',
                distributorId: distributor.distributorId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);

            return res.status(201).json({
                ...registrationSuccess,
                token,
                user: { ...savedUser.toObject(), password: undefined },
                distributor
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        try {
            const user = await UserData.findOne({ username });
            if (!user || !user.roles || !user.roles.includes('distributor')) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (user.blockStatus === 1) {
                return res.status(403).json({ code: 403, message: 'Distributor account is blocked.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const distributor = await Distributor.findOne({ uid: user.uid });
            if (!distributor || distributor.status === 'disabled') {
                return res.status(403).json({ code: 403, message: 'Distributor account is disabled.' });
            }

            const payload = {
                uid: user.uid,
                username: user.username,
                role: 'distributor',
                distributorId: distributor.distributorId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await UserData.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({ ...loginSuccess, token, user, distributor });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const user = await UserData.findOne({ uid }).select('-password');
            const distributor = await Distributor.findOne({ uid });
            return res.status(200).json({ status: 200, message: 'Profile fetched.', user, distributor });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateProfile(req, res) {
        try {
            const { uid } = req.user;
            const { name, email, mobile, address, photo } = req.body;
            const updates = {};
            if (name) updates.name = name;
            if (email) updates.email = email;
            if (mobile) updates.mobile = mobile;
            if (photo) updates.photo = photo;
            if (Object.keys(updates).length) {
                await UserData.updateOne({ uid }, { $set: updates });
            }

            const distUpdates = {};
            if (name) distUpdates.name = name;
            if (email) distUpdates.email = email;
            if (mobile) distUpdates.mobile = mobile;
            if (photo) distUpdates.photo = photo;
            if (address) distUpdates.address = address;
            if (Object.keys(distUpdates).length) {
                await Distributor.updateOne({ uid }, { $set: distUpdates });
            }

            const user = await UserData.findOne({ uid }).select('-password');
            const distributor = await Distributor.findOne({ uid });
            return res.status(200).json({ ...REQUEST_SUCCESS, user, distributor });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const distributor = await Distributor.findOne({ uid });
            const orderStats = await CommerceOrder.aggregate([
                { $match: { buyer_uid: uid, buyer_role: 'distributor' } },
                {
                    $group: {
                        _id: null,
                        total_orders: { $sum: 1 },
                        total_amount: { $sum: '$grand_total' }
                    }
                }
            ]);
            const unreadNotifications = await Notification.countDocuments({ uid, role: 'distributor', is_read: 0 });

            return res.status(200).json({
                status: 200,
                message: 'Distributor dashboard fetched.',
                data: {
                    distributor,
                    orders: orderStats[0] || { total_orders: 0, total_amount: 0 },
                    unreadNotifications
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getNotifications(req, res) {
        try {
            const { uid } = req.user;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = { uid, role: 'distributor' };
            const [list, total] = await Promise.all([
                Notification.find(filter).sort({ created_date: -1 }).skip(skip).limit(limit),
                Notification.countDocuments(filter)
            ]);
            return res.status(200).json({
                status: 200,
                message: 'Notifications fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

class ADMIN_DISTRIBUTOR {
    async getDistributors(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.status) filter.status = req.query.status;
            if (req.query.search) {
                filter.$or = [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } },
                    { mobile: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                Distributor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Distributor.countDocuments(filter)
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Distributors fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const DistributorAuth = new DISTRIBUTOR_AUTH();
const AdminDistributor = new ADMIN_DISTRIBUTOR();
module.exports = { DistributorAuth, AdminDistributor };
