const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserData = require('../../MODALS/userData');
const Franchise = require('../../MODALS/Franchise');
const Inventory = require('../../MODALS/Inventory');
const Notification = require('../../MODALS/Notification');
const AuditService = require('../../SERVICES/AuditService');
const form_validator = require('../../utils/form-validators');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const { INTERNAL_SERVER_ERROR, INVALID_CREDENTIALS, USERNAME_ALREADY_EXISTS, INVALID_USERNAME } = require('../../utils/errorMessages');

class FRANCHISE_AUTH {
    async login(req, res) {
        const { username, password } = req.body;
        try {
            const user = await UserData.findOne({ username });
            if (!user || !user.roles || !user.roles.includes('franchise')) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (user.blockStatus === 1) {
                return res.status(403).json({ code: 403, message: 'Franchise account is blocked.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const franchise = await Franchise.findOne({ uid: user.uid });
            if (!franchise || franchise.status === 'disabled') {
                return res.status(403).json({ code: 403, message: 'Franchise account is disabled.' });
            }

            const payload = {
                uid: user.uid,
                username: user.username,
                role: 'franchise',
                franchiseId: franchise.franchiseId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await UserData.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({ ...loginSuccess, token, user, franchise });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const user = await UserData.findOne({ uid }).select('-password');
            const franchise = await Franchise.findOne({ uid });
            return res.status(200).json({ status: 200, message: 'Profile fetched.', user, franchise });
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

            const franchiseUpdates = {};
            if (name) franchiseUpdates.owner_name = name;
            if (email) franchiseUpdates.email = email;
            if (mobile) franchiseUpdates.mobile = mobile;
            if (photo) franchiseUpdates.photo = photo;
            if (address) franchiseUpdates.address = address;

            if (Object.keys(franchiseUpdates).length) {
                await Franchise.updateOne({ uid }, { $set: franchiseUpdates });
            }

            const user = await UserData.findOne({ uid }).select('-password');
            const franchise = await Franchise.findOne({ uid });
            return res.status(200).json({ ...REQUEST_SUCCESS, user, franchise });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const franchise = await Franchise.findOne({ uid });
            if (!franchise) {
                return res.status(404).json({ code: 404, message: 'Franchise profile not found.' });
            }

            const inventoryAgg = await Inventory.aggregate([
                { $match: { franchiseId: franchise.franchiseId } },
                {
                    $group: {
                        _id: null,
                        available_stock: { $sum: '$available_stock' },
                        purchased_stock: { $sum: '$purchased_stock' },
                        reserved_stock: { $sum: '$reserved_stock' },
                        sold_stock: { $sum: '$sold_stock' },
                        returned_stock: { $sum: '$returned_stock' },
                        damaged_stock: { $sum: '$damaged_stock' },
                        sku_count: { $sum: 1 }
                    }
                }
            ]);

            const unreadNotifications = await Notification.countDocuments({ uid, role: 'franchise', is_read: 0 });

            return res.status(200).json({
                status: 200,
                message: 'Franchise dashboard fetched.',
                data: {
                    franchise,
                    inventory: inventoryAgg[0] || {
                        available_stock: 0,
                        purchased_stock: 0,
                        reserved_stock: 0,
                        sold_stock: 0,
                        returned_stock: 0,
                        damaged_stock: 0,
                        sku_count: 0
                    },
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
            const filter = { uid, role: 'franchise' };
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

class ADMIN_FRANCHISE {
    async createFranchise(req, res) {
        try {
            const {
                name,
                email,
                mobile,
                username,
                password,
                business_name,
                owner_name,
                address,
                gst_number,
                photo,
                id_card_validity
            } = req.body;

            const validUserNameResult = await form_validator.generateUserName(username || 'franchise');
            if (!validUserNameResult.status) {
                return res.status(INVALID_USERNAME.code).json({ ...INVALID_USERNAME });
            }

            const isUsernameExist = await UserData.findOne({ username: validUserNameResult.userName });
            if (isUsernameExist) {
                return res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
            }

            const isStrongPassword = await form_validator.generatePassword(password);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            const totalUsers = await UserData.countDocuments();
            const validity = id_card_validity ? new Date(id_card_validity) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const user = new UserData({
                name: owner_name || name,
                email,
                mobile,
                password: hashedPassword,
                username: validUserNameResult.userName,
                uid: totalUsers + 1,
                roles: ['franchise'],
                user_type: 'franchise',
                status: 1,
                sponsor_Id: 0,
                photo: photo || null,
                id_card_validity: validity,
                joining_date: new Date(),
                lastActivity: new Date()
            });
            const savedUser = await user.save();

            const franchise = new Franchise({
                uid: savedUser.uid,
                business_name: business_name || `${savedUser.name} Franchise`,
                owner_name: owner_name || savedUser.name,
                email: email || '',
                mobile: mobile || '',
                address: address || {},
                gst_number: gst_number || '',
                photo: photo || null,
                status: 'active',
                joining_date: new Date(),
                id_card_validity: validity,
                created_by: req.user.uid
            });
            await franchise.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'CREATE_FRANCHISE',
                target_uid: savedUser.uid,
                target_role: 'franchise',
                target_type: 'franchise',
                target_id: franchise.franchiseId,
                ip: req.ip,
                meta: { username: savedUser.username, business_name: franchise.business_name }
            });

            return res.status(201).json({
                ...registrationSuccess,
                user: { ...savedUser.toObject(), password: undefined },
                franchise
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getFranchises(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.status) filter.status = req.query.status;
            if (req.query.search) {
                filter.$or = [
                    { business_name: { $regex: req.query.search, $options: 'i' } },
                    { owner_name: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } },
                    { mobile: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                Franchise.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Franchise.countDocuments(filter)
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Franchises fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const FranchiseAuth = new FRANCHISE_AUTH();
const AdminFranchise = new ADMIN_FRANCHISE();
module.exports = { FranchiseAuth, AdminFranchise };
