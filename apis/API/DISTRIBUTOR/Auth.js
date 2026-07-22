const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Distributor = require('../../MODALS/Distributor');
const DistributorWallet = require('../../MODALS/DistributorWallet');
const Franchise = require('../../MODALS/Franchise');
const AdminData = require('../../MODALS/AdminData');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Transaction = require('../../MODALS/transactions');
const Wallets = require('../../MODALS/wallets');
const form_validator = require('../../utils/form-validators');
const { nextPanelUid } = require('../../utils/panelIdentity');
const { ensurePanelWallet, ensureWalletSlug } = require('../../utils/panelWallet');
const { errorLogger } = require('../../utils/logger');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const {
    resolvePlacement,
    isDuplicateKeyError
} = require('../../SERVICES/BinaryPlacement');
const {
    INTERNAL_SERVER_ERROR,
    INVALID_CREDENTIALS,
    USERNAME_ALREADY_EXISTS,
    INVALID_USERNAME,
    INVALID_SPONSOR
} = require('../../utils/errorMessages');
const { buildTeamSummary, buildBinarySummary, buildRepurchaseSummary } = require('./Team');

/**
 * Income Overview: every active income wallet on the distributor
 * (wallet_type === 'income'). Catalog income wallets are synced first
 * so new types appear on existing users without re-registering.
 */
async function buildIncomeSummary(uid) {
    const catalogIncome = await Wallets.find({ status: 1, wallet_type: 'income' }).lean();
    for (const item of catalogIncome) {
        await ensureWalletSlug(DistributorWallet, uid, item.slug);
    }

    const walletDoc = await DistributorWallet.findOne({ uid: Number(uid) }).lean();
    const incomeWallets = (walletDoc?.wallets || []).filter(
        (w) => w.wallet_type === 'income' && Number(w.wallet_status) === 1
    );

    const keys = incomeWallets.map((w) => w.slug).filter(Boolean);
    const rows = keys.length
        ? await Transaction.aggregate([
            {
                $match: {
                    uid: Number(uid),
                    panel: 'distributor',
                    debit_credit: 'credit',
                    source: { $in: keys },
                    status: { $ne: 2 }
                }
            },
            {
                $group: {
                    _id: '$source',
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ])
        : [];

    const bySource = Object.fromEntries(rows.map((row) => [row._id, row]));
    const items = incomeWallets.map((w) => {
        const hit = bySource[w.slug];
        const walletValue = Number(w.value) || 0;
        const txAmount = Number(hit?.amount) || 0;
        return {
            key: w.slug,
            label: w.name || w.slug,
            amount: Math.round((walletValue || txAmount) * 100) / 100,
            count: Number(hit?.count) || 0
        };
    });

    const total = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    return { total, items };
}

function sanitizeDistributor(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.password;
    return obj;
}

async function resolveSponsor(sponsorUsername) {
    const username = String(sponsorUsername || '').trim();
    if (!username) return null;

    const usernameQuery = { username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } };

    const franchise = await Franchise.findOne(usernameQuery);
    if (franchise) {
        return { uid: franchise.uid, type: 'franchise' };
    }

    const distributor = await Distributor.findOne(usernameQuery);
    if (distributor) {
        return { uid: distributor.uid, type: 'distributor' };
    }

    const admin = await AdminData.findOne(usernameQuery);
    if (admin) {
        return { uid: admin.uid, type: 'admin' };
    }

    return null;
}

class DISTRIBUTOR_AUTH {
    async register(req, res) {
        try {
            const { name, email, mobile, password, username, sponsor_Id, address, photo, placement } = req.body;

            if (!sponsor_Id || !String(sponsor_Id).trim()) {
                return res.status(400).json({ code: 400, message: 'Sponsor username is required for distributor registration.' });
            }

            const sponsor = await resolveSponsor(sponsor_Id);
            if (!sponsor) {
                return res.status(INVALID_SPONSOR.code).json({ ...INVALID_SPONSOR });
            }

            let parent_Id = null;
            let position = null;
            if (sponsor.type === 'distributor') {
                try {
                    const placed = await resolvePlacement(sponsor.uid, placement);
                    parent_Id = placed.parent_Id;
                    position = placed.position;
                } catch (placementErr) {
                    if (placementErr && placementErr.isPlacementError) {
                        return res.status(placementErr.code || 400).json({
                            code: placementErr.code || 400,
                            message: placementErr.message
                        });
                    }
                    throw placementErr;
                }
            }

            const usernameInput = String(username || '').trim();
            let validUserNameResult;
            if (usernameInput) {
                validUserNameResult = await form_validator.generateUserName(usernameInput);
            } else {
                let attempts = 0;
                let exists = true;
                validUserNameResult = { status: false };
                while (attempts < 12 && exists) {
                    validUserNameResult = await form_validator.generateAutomaticUserName('dist');
                    if (!validUserNameResult.status) break;
                    exists = await Distributor.findOne({ username: validUserNameResult.userName });
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

            const isUsernameExist = await Distributor.findOne({ username: validUserNameResult.userName });
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
            const uid = await nextPanelUid('distributor');
            const validity = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

            const distributor = new Distributor({
                uid,
                username: validUserNameResult.userName,
                password: hashedPassword,
                name,
                email,
                mobile,
                sponsor_Id: sponsor.uid,
                sponsor_uid: sponsor.uid,
                sponsor_type: sponsor.type,
                parent_Id,
                position,
                address: address || {},
                photo: photo || null,
                status: 'inactive',
                joining_date: new Date(),
                id_card_validity: validity,
                lastActivity: new Date()
            });
            try {
                await distributor.save();
            } catch (saveErr) {
                if (isDuplicateKeyError(saveErr) && parent_Id != null) {
                    return res.status(400).json({
                        code: 400,
                        message: `${position === 'left' ? 'Left' : 'Right'} position already filled.`
                    });
                }
                throw saveErr;
            }
            await ensurePanelWallet(DistributorWallet, uid);

            const payload = {
                uid: distributor.uid,
                username: distributor.username,
                role: 'distributor',
                distributorId: distributor.distributorId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);

            return res.status(201).json({
                ...registrationSuccess,
                token,
                user: payload,
                distributor: sanitizeDistributor(distributor)
            });
        } catch (error) {
            if (error && error.isPlacementError) {
                return res.status(error.code || 400).json({
                    code: error.code || 400,
                    message: error.message
                });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        try {
            const distributor = await Distributor.findOne({ username });
            if (!distributor) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (distributor.blockStatus === 1 || distributor.status === 'disabled') {
                return res.status(403).json({ code: 403, message: 'Distributor account is disabled or blocked.' });
            }

            const passwordMatch = await bcrypt.compare(password, distributor.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            const payload = {
                uid: distributor.uid,
                username: distributor.username,
                role: 'distributor',
                distributorId: distributor.distributorId
            };
            const token = jwt.sign(payload, process.env.JWT_KEY);
            await Distributor.updateOne({ uid: distributor.uid }, { $set: { lastActivity: new Date() } });

            return res.status(200).json({
                ...loginSuccess,
                token,
                user: payload,
                distributor: sanitizeDistributor(distributor)
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProfile(req, res) {
        try {
            const { uid } = req.user;
            const distributor = await Distributor.findOne({ uid }).select('-password');
            return res.status(200).json({ status: 200, message: 'Profile fetched.', distributor });
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
            if (address) updates.address = address;
            if (Object.keys(updates).length) {
                await Distributor.updateOne({ uid }, { $set: updates });
            }

            const distributor = await Distributor.findOne({ uid }).select('-password');
            return res.status(200).json({ ...REQUEST_SUCCESS, distributor });
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

            const user = await Distributor.findOne({ uid });
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
            await Distributor.updateOne({ uid }, { $set: { password: hashedPassword } });

            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Password updated successfully.' });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboard(req, res) {
        try {
            const { uid } = req.user;
            const distributor = await Distributor.findOne({ uid }).select('-password');
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
            const wallet = await DistributorWallet.findOne({ uid });
            const team = await buildTeamSummary(uid);
            const income = await buildIncomeSummary(uid);
            const binary = await buildBinarySummary(uid);
            const repurchase = await buildRepurchaseSummary(uid);

            return res.status(200).json({
                status: 200,
                message: 'Distributor dashboard fetched.',
                data: {
                    distributor,
                    orders: orderStats[0] || { total_orders: 0, total_amount: 0 },
                    wallet,
                    team,
                    income,
                    binary,
                    repurchase
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    /**
     * Credit history for one income wallet slug (e.g. direct_income).
     */
    async getIncomeHistory(req, res) {
        try {
            const { uid } = req.user;
            const slug = String(req.query.slug || '').trim();
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

            if (!slug) {
                return res.status(400).json({ status: 400, message: 'Income slug is required.' });
            }

            const catalog = await Wallets.findOne({
                slug,
                status: 1,
                wallet_type: 'income'
            }).lean();

            if (!catalog) {
                return res.status(404).json({ status: 404, message: 'Income type not found.' });
            }

            await ensureWalletSlug(DistributorWallet, uid, slug);
            const walletDoc = await DistributorWallet.findOne(
                { uid: Number(uid), 'wallets.slug': slug },
                { 'wallets.$': 1 }
            ).lean();
            const walletEntry = walletDoc?.wallets?.[0];
            const balance = Math.round((Number(walletEntry?.value) || 0) * 100) / 100;

            const match = {
                uid: Number(uid),
                panel: 'distributor',
                source: slug,
                debit_credit: 'credit',
                status: { $ne: 2 }
            };

            const [total, rows, sumRows] = await Promise.all([
                Transaction.countDocuments(match),
                Transaction.find(match)
                    .sort({ time: -1, createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select(
                        'tx_Id amount debit_credit source wallet_type tx_type remark time status to_from to_from_username level income_percent business order_Id metadata createdAt'
                    )
                    .lean(),
                Transaction.aggregate([
                    { $match: match },
                    { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
                ])
            ]);

            const creditedTotal = Math.round((Number(sumRows[0]?.totalAmount) || 0) * 100) / 100;

            return res.status(200).json({
                status: 200,
                message: 'Income history fetched.',
                data: {
                    slug,
                    label: catalog.name || slug,
                    balance,
                    creditedTotal,
                    creditCount: Number(sumRows[0]?.count) || 0,
                    items: rows
                },
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.max(1, Math.ceil(total / limit))
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getDashboardBanners(req, res) {
        try {
            const DashboardBanner = require('../../MODALS/DashboardBanner');
            const { BANNER_WIDTH, BANNER_HEIGHT } = require('../../MODALS/DashboardBanner');
            const list = await DashboardBanner.find({ status: 'active' })
                .sort({ sortOrder: 1, created_at: -1 })
                .select('bannerId title imageUrl linkUrl sortOrder')
                .lean();
            return res.status(200).json({
                status: 200,
                message: 'Dashboard banners fetched.',
                data: list,
                meta: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

}

async function resolveSponsorLabel(sponsorUid, sponsorType) {
    if (sponsorUid == null) return null;
    const uid = Number(sponsorUid);

    if (sponsorType === 'franchise') {
        const franchise = await Franchise.findOne({ uid }).select('username business_name owner_name');
        return franchise
            ? {
                username: franchise.username,
                name: franchise.business_name || franchise.owner_name || franchise.username
            }
            : null;
    }
    if (sponsorType === 'admin') {
        const admin = await AdminData.findOne({ uid }).select('username name');
        return admin ? { username: admin.username, name: admin.name || admin.username } : null;
    }
    if (sponsorType === 'distributor') {
        const distributor = await Distributor.findOne({ uid }).select('username name');
        return distributor ? { username: distributor.username, name: distributor.name } : null;
    }

    const distributor = await Distributor.findOne({ uid }).select('username name');
    if (distributor) return { username: distributor.username, name: distributor.name };
    const franchise = await Franchise.findOne({ uid }).select('username business_name owner_name');
    if (franchise) {
        return {
            username: franchise.username,
            name: franchise.business_name || franchise.owner_name || franchise.username
        };
    }
    const admin = await AdminData.findOne({ uid }).select('username name');
    return admin ? { username: admin.username, name: admin.name || admin.username } : null;
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
                    { mobile: { $regex: req.query.search, $options: 'i' } },
                    { username: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                Distributor.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
                Distributor.countDocuments(filter)
            ]);

            const parentUids = [
                ...new Set(list.map((d) => d.parent_Id).filter((id) => id != null).map(Number))
            ];
            const parents = parentUids.length
                ? await Distributor.find({ uid: { $in: parentUids } }).select('uid username name')
                : [];
            const parentMap = new Map(parents.map((p) => [Number(p.uid), p]));

            const sponsorCache = new Map();
            const data = await Promise.all(
                list.map(async (doc) => {
                    const item = sanitizeDistributor(doc);
                    const sponsorKey = `${item.sponsor_type || ''}:${item.sponsor_Id}`;
                    if (!sponsorCache.has(sponsorKey)) {
                        sponsorCache.set(
                            sponsorKey,
                            await resolveSponsorLabel(item.sponsor_Id, item.sponsor_type)
                        );
                    }
                    const sponsor = sponsorCache.get(sponsorKey);
                    const parent = item.parent_Id != null ? parentMap.get(Number(item.parent_Id)) : null;

                    return {
                        ...item,
                        sponsor_username: sponsor?.username || null,
                        sponsor_name: sponsor?.name || null,
                        parent_username: parent?.username || null,
                        parent_name: parent?.name || null
                    };
                })
            );

            return res.status(200).json({
                status: 200,
                message: 'Distributors fetched.',
                data,
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
