const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Franchise = require('../../MODALS/Franchise');
const FranchiseWallet = require('../../MODALS/FranchiseWallet');
const Inventory = require('../../MODALS/Inventory');
const Product = require('../../MODALS/Product');
const AuditService = require('../../SERVICES/AuditService');
const form_validator = require('../../utils/form-validators');
const { nextPanelUid } = require('../../utils/panelIdentity');
const { ensurePanelWallet } = require('../../utils/panelWallet');
const { errorLogger } = require('../../utils/logger');
const sms = require('../../SERVICES/SmsService');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const { INTERNAL_SERVER_ERROR, INVALID_CREDENTIALS, USERNAME_ALREADY_EXISTS, INVALID_USERNAME } = require('../../utils/errorMessages');

const LOW_STOCK_THRESHOLD = 10;

function sanitizeFranchise(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.password;
    return obj;
}

class FRANCHISE_AUTH {
    async login(req, res) {
        const { username, password } = req.body;
        try {
            const franchise = await Franchise.findOne({ username });
            if (!franchise) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (franchise.blockStatus === 1 || franchise.status === 'disabled') {
                return res.status(403).json({ code: 403, message: 'Franchise account is disabled or blocked.' });
            }

            const passwordMatch = await bcrypt.compare(password, franchise.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const payload = {
                uid: franchise.uid,
                username: franchise.username,
                role: 'franchise',
                franchiseId: franchise.franchiseId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await Franchise.updateOne({ uid: franchise.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({ ...loginSuccess, token, franchise: sanitizeFranchise(franchise) });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const franchise = await Franchise.findOne({ uid }).select('-password');
            return res.status(200).json({ status: 200, message: 'Profile fetched.', franchise });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateProfile(req, res) {
        try {
            const { uid } = req.user;
            const { name, email, mobile, address, photo, business_name, owner_name } = req.body;
            const updates = {};
            if (owner_name || name) updates.owner_name = owner_name || name;
            if (business_name) updates.business_name = business_name;
            if (email) updates.email = email;
            if (mobile) updates.mobile = mobile;
            if (photo) updates.photo = photo;
            if (address) updates.address = address;

            if (Object.keys(updates).length) {
                await Franchise.updateOne({ uid }, { $set: updates });
            }

            const franchise = await Franchise.findOne({ uid }).select('-password');
            return res.status(200).json({ ...REQUEST_SUCCESS, franchise });
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

            const user = await Franchise.findOne({ uid });
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
            await Franchise.updateOne({ uid }, { $set: { password: hashedPassword } });

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
            await Franchise.updateOne({ uid: req.user.uid }, { $set: { password: hashedPassword } });
            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Password reset successfully.' });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const franchise = await Franchise.findOne({ uid }).select('-password');
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

            const wallet = await FranchiseWallet.findOne({ uid });

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
                    wallet
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getInventory(req, res) {
        try {
            const { uid } = req.user;
            const franchise = await Franchise.findOne({ uid }).select('-password');
            if (!franchise) {
                return res.status(404).json({ code: 404, message: 'Franchise profile not found.' });
            }

            const threshold = Number(req.query.threshold) || LOW_STOCK_THRESHOLD;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const skip = (page - 1) * limit;
            const search = (req.query.search || '').trim();
            const stockFilter = req.query.stock;

            const match = { franchiseId: franchise.franchiseId };
            if (req.query.status) match.status = req.query.status;

            if (stockFilter === 'low') {
                match.available_stock = { $gt: 0, $lte: threshold };
            } else if (stockFilter === 'out') {
                match.available_stock = { $lte: 0 };
            }

            if (search) {
                const products = await Product.find({
                    $or: [
                        { product_name: { $regex: search, $options: 'i' } },
                        { sku: { $regex: search, $options: 'i' } }
                    ]
                }).select('productId');
                match.$or = [
                    { productId: { $in: products.map((p) => p.productId) } },
                    { sku: { $regex: search, $options: 'i' } }
                ];
            }

            const [rows, total, summaryAgg] = await Promise.all([
                Inventory.aggregate([
                    { $match: match },
                    { $sort: { available_stock: 1, productId: 1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'productId',
                            foreignField: 'productId',
                            as: 'product'
                        }
                    },
                    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 0,
                            inventoryId: 1,
                            productId: 1,
                            sku: { $ifNull: ['$product.sku', '$sku'] },
                            product_name: { $ifNull: ['$product.product_name', 'Unknown product'] },
                            images: { $ifNull: ['$product.images', []] },
                            mrp: { $ifNull: ['$product.mrp', 0] },
                            franchise_price: { $ifNull: ['$product.franchise_price', 0] },
                            categoryId: '$product.categoryId',
                            brandId: '$product.brandId',
                            available_stock: 1,
                            purchased_stock: 1,
                            reserved_stock: 1,
                            sold_stock: 1,
                            returned_stock: 1,
                            damaged_stock: 1,
                            status: 1,
                            updated_at: 1
                        }
                    }
                ]),
                Inventory.countDocuments(match),
                Inventory.aggregate([
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
                            sku_count: { $sum: 1 },
                            low_stock_products: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gt: ['$available_stock', 0] },
                                                { $lte: ['$available_stock', threshold] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            },
                            out_of_stock_products: {
                                $sum: { $cond: [{ $lte: ['$available_stock', 0] }, 1, 0] }
                            }
                        }
                    }
                ])
            ]);

            const data = rows.map((row) => {
                const available = Number(row.available_stock) || 0;
                let stock_status = 'ok';
                if (available <= 0) stock_status = 'out';
                else if (available <= threshold) stock_status = 'low';
                return { ...row, stock_status };
            });

            return res.status(200).json({
                status: 200,
                message: 'Franchise inventory fetched.',
                data,
                summary: summaryAgg[0] || {
                    available_stock: 0,
                    purchased_stock: 0,
                    reserved_stock: 0,
                    sold_stock: 0,
                    returned_stock: 0,
                    damaged_stock: 0,
                    sku_count: 0,
                    low_stock_products: 0,
                    out_of_stock_products: 0
                },
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 }
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

            const isUsernameExist = await Franchise.findOne({ username: validUserNameResult.userName });
            if (isUsernameExist) {
                return res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
            }

            const isStrongPassword = await form_validator.generatePassword(password);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);
            const uid = await nextPanelUid('franchise');
            const validity = id_card_validity ? new Date(id_card_validity) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const franchise = new Franchise({
                uid,
                username: validUserNameResult.userName,
                password: hashedPassword,
                business_name: business_name || `${owner_name || name} Franchise`,
                owner_name: owner_name || name,
                email: email || '',
                mobile: mobile || '',
                address: address || {},
                gst_number: gst_number || '',
                photo: photo || null,
                status: 'active',
                joining_date: new Date(),
                id_card_validity: validity,
                created_by: req.user.uid,
                lastActivity: new Date()
            });
            await franchise.save();
            await ensurePanelWallet(FranchiseWallet, uid);

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'CREATE_FRANCHISE',
                target_uid: franchise.uid,
                target_role: 'franchise',
                target_type: 'franchise',
                target_id: franchise.franchiseId,
                ip: req.ip,
                meta: { username: franchise.username, business_name: franchise.business_name }
            });

            if (franchise.mobile) {
                try {
                    await sms.usernameSms(franchise.mobile, franchise.username, isStrongPassword.password);
                } catch (smsErr) {
                    errorLogger(smsErr);
                }
            }

            return res.status(201).json({
                ...registrationSuccess,
                franchise: sanitizeFranchise(franchise)
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
                    { mobile: { $regex: req.query.search, $options: 'i' } },
                    { username: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                Franchise.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
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
