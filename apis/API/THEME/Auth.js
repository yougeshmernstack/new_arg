const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ThemeUser = require('../../MODALS/ThemeUser');
const ThemeUserWallet = require('../../MODALS/ThemeUserWallet');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Cart = require('../../MODALS/Cart');
const Wishlist = require('../../MODALS/Wishlist');
const form_validator = require('../../utils/form-validators');
const { nextPanelUid } = require('../../utils/panelIdentity');
const { ensurePanelWallet } = require('../../utils/panelWallet');
const { errorLogger } = require('../../utils/logger');
const Email = require('../../SERVICES/SendEmail');
const sms = require('../../SERVICES/SmsService');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const {
    INTERNAL_SERVER_ERROR,
    INVALID_CREDENTIALS,
    USERNAME_ALREADY_EXISTS,
    INVALID_USERNAME
} = require('../../utils/errorMessages');

function sanitizeThemeUser(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.password;
    return obj;
}

class THEME_AUTH {
    async register(req, res) {
        try {
            const { name, email, mobile, password, username } = req.body;

            const usernameInput = String(username || '').trim();
            let validUserNameResult;
            if (usernameInput) {
                validUserNameResult = await form_validator.generateUserName(usernameInput);
            } else {
                let attempts = 0;
                let exists = true;
                validUserNameResult = { status: false };
                while (attempts < 12 && exists) {
                    validUserNameResult = await form_validator.generateAutomaticUserName('ARG');
                    if (!validUserNameResult.status) break;
                    exists = await ThemeUser.findOne({ username: validUserNameResult.userName });
                    attempts += 1;
                }
                if (exists) {
                    return res.status(500).json({ code: 500, message: 'Could not generate a unique username. Please try again.' });
                }
            }
            if (!validUserNameResult.status) {
                const code = validUserNameResult.code || INVALID_USERNAME.code;
                const message = validUserNameResult.message || INVALID_USERNAME.message;
                return res.status(code).json({ code, message });
            }

            const isUsernameExist = await ThemeUser.findOne({ username: validUserNameResult.userName });
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
            const uid = await nextPanelUid('theme');

            const user = new ThemeUser({
                uid,
                username: validUserNameResult.userName,
                password: hashedPassword,
                name,
                email,
                mobile,
                status: 1,
                joining_date: new Date(),
                lastActivity: new Date()
            });
            const savedUser = await user.save();

            await new Cart({ uid: savedUser.uid, items: [] }).save();
            await ensurePanelWallet(ThemeUserWallet, savedUser.uid);

            if (savedUser.email) {
                try {
                    await Email.sendWelcome({
                        email: savedUser.email,
                        name: savedUser.name,
                        username: savedUser.username,
                        password: isStrongPassword.password,
                        role: 'customer'
                    });
                } catch (mailErr) {
                    errorLogger(mailErr);
                }
            }

            if (savedUser.mobile) {
                try {
                    await sms.usernameSms(savedUser.mobile, savedUser.username, isStrongPassword.password);
                } catch (smsErr) {
                    errorLogger(smsErr);
                }
            }

            const payload = {
                uid: savedUser.uid,
                username: savedUser.username,
                role: 'theme',
                themeUserId: savedUser.themeUserId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);

            return res.status(201).json({
                ...registrationSuccess,
                token,
                user: sanitizeThemeUser(savedUser)
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        try {
            const user = await ThemeUser.findOne({ username });
            if (!user) {
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
                role: 'theme',
                themeUserId: user.themeUserId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await ThemeUser.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({ ...loginSuccess, token, user: sanitizeThemeUser(user) });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const user = await ThemeUser.findOne({ uid }).select('-password');
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
                await ThemeUser.updateOne({ uid }, { $set: updates });
            }
            const user = await ThemeUser.findOne({ uid }).select('-password');
            return res.status(200).json({ ...REQUEST_SUCCESS, user });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async changePassword(req, res) {
        try {
            const { uid } = req.user;
            const currentPassword = req.body.currentPassword || req.body.oldPassword;
            const { newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ code: 400, message: 'Current and new password are required.' });
            }

            const user = await ThemeUser.findOne({ uid });
            if (!user) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const passwordMatch = await bcrypt.compare(currentPassword, user.password);
            if (!passwordMatch) {
                return res.status(400).json({ code: 400, message: 'Current password is incorrect.' });
            }

            const isStrongPassword = await form_validator.generatePassword(newPassword);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            await ThemeUser.updateOne({ uid }, { $set: { password: hashedPassword } });

            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Password updated successfully.' });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async forgotPassword(req, res) {
        try {
            const newPassword = req.body.newPassword || req.body.password;
            if (!newPassword) {
                return res.status(400).json({ code: 400, message: 'New password is required.' });
            }
            const isStrongPassword = await form_validator.generatePassword(newPassword);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }
            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            await ThemeUser.updateOne({ uid: req.user.uid }, { $set: { password: hashedPassword } });
            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Password reset successfully.' });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const [orderStats, cart, wishlistCount, wallet] = await Promise.all([
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
                ThemeUserWallet.findOne({ uid })
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Theme dashboard fetched.',
                data: {
                    orders: orderStats[0] || { total_orders: 0, total_amount: 0 },
                    cart_items: cart ? cart.items.length : 0,
                    wishlist_count: wishlistCount,
                    wallet
                }
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
            const filter = {};
            if (req.query.search) {
                const raw = String(req.query.search).trim();
                filter.$or = [
                    { name: { $regex: raw, $options: 'i' } },
                    { email: { $regex: raw, $options: 'i' } },
                    { username: { $regex: raw, $options: 'i' } },
                    { mobile: { $regex: raw, $options: 'i' } }
                ];
                if (/^\d+$/.test(raw)) {
                    const num = Number(raw);
                    filter.$or.push({ themeUserId: num }, { uid: num });
                }
            }

            const [list, total] = await Promise.all([
                ThemeUser.find(filter).select('-password').sort({ joining_date: -1 }).skip(skip).limit(limit),
                ThemeUser.countDocuments(filter)
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
