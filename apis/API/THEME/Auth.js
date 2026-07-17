const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserData = require('../../MODALS/userData');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Cart = require('../../MODALS/Cart');
const Wishlist = require('../../MODALS/Wishlist');
const Notification = require('../../MODALS/Notification');
const form_validator = require('../../utils/form-validators');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const {
    INTERNAL_SERVER_ERROR,
    INVALID_CREDENTIALS,
    USERNAME_ALREADY_EXISTS,
    INVALID_USERNAME
} = require('../../utils/errorMessages');

class THEME_AUTH {
    async register(req, res) {
        try {
            const { name, email, mobile, password, username } = req.body;

            const validUserNameResult = await form_validator.generateUserName(username || 'customer');
            if (!validUserNameResult.status) {
                return res.status(INVALID_USERNAME.code).json({ ...INVALID_USERNAME });
            }

            const isUsernameExist = await UserData.findOne({ username: validUserNameResult.userName });
            if (isUsernameExist) {
                return res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
            }

            if (email) {
                const isEmail = await form_validator.isEmail(email);
                if (!isEmail.status) {
                    return res.status(400).json({ ...isEmail });
                }
            }

            const isStrongPassword = await form_validator.generatePassword(password);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            const totalUsers = await UserData.countDocuments();

            const user = new UserData({
                name,
                email,
                mobile,
                password: hashedPassword,
                username: validUserNameResult.userName,
                uid: totalUsers + 1,
                roles: ['theme'],
                user_type: 'theme',
                status: 1,
                sponsor_Id: 0,
                joining_date: new Date(),
                lastActivity: new Date()
            });
            const savedUser = await user.save();

            await new Cart({ uid: savedUser.uid, items: [] }).save();

            const payload = {
                uid: savedUser.uid,
                username: savedUser.username,
                role: 'theme'
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);

            return res.status(201).json({
                ...registrationSuccess,
                token,
                user: { ...savedUser.toObject(), password: undefined }
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
            if (!user || !user.roles || !user.roles.includes('theme')) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (user.blockStatus === 1) {
                return res.status(403).json({ code: 403, message: 'Account is blocked.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const payload = {
                uid: user.uid,
                username: user.username,
                role: 'theme'
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await UserData.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({ ...loginSuccess, token, user });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const user = await UserData.findOne({ uid }).select('-password');
            return res.status(200).json({ status: 200, message: 'Profile fetched.', user });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateProfile(req, res) {
        try {
            const { uid } = req.user;
            const { name, email, mobile, photo } = req.body;
            const updates = {};
            if (name) updates.name = name;
            if (email) updates.email = email;
            if (mobile) updates.mobile = mobile;
            if (photo) updates.photo = photo;
            if (Object.keys(updates).length) {
                await UserData.updateOne({ uid }, { $set: updates });
            }
            const user = await UserData.findOne({ uid }).select('-password');
            return res.status(200).json({ ...REQUEST_SUCCESS, user });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const [orderStats, cart, wishlistCount, unreadNotifications] = await Promise.all([
                CommerceOrder.aggregate([
                    { $match: { buyer_uid: uid, buyer_role: 'theme' } },
                    {
                        $group: {
                            _id: null,
                            total_orders: { $sum: 1 },
                            total_amount: { $sum: '$grand_total' }
                        }
                    }
                ]),
                Cart.findOne({ uid }),
                Wishlist.countDocuments({ uid }),
                Notification.countDocuments({ uid, role: 'theme', is_read: 0 })
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Theme dashboard fetched.',
                data: {
                    orders: orderStats[0] || { total_orders: 0, total_amount: 0 },
                    cart_items: cart ? cart.items.length : 0,
                    wishlist_count: wishlistCount,
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
            const filter = { uid, role: 'theme' };
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

class ADMIN_THEME {
    async getThemeUsers(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = { roles: 'theme' };
            if (req.query.search) {
                filter.$or = [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } },
                    { username: { $regex: req.query.search, $options: 'i' } },
                    { mobile: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                UserData.find(filter).select('-password').sort({ joining_date: -1 }).skip(skip).limit(limit),
                UserData.countDocuments(filter)
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Theme users fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const ThemeAuth = new THEME_AUTH();
const AdminTheme = new ADMIN_THEME();
module.exports = { ThemeAuth, AdminTheme };
