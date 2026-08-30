const jwt = require('jsonwebtoken');
const Franchise = require('../../MODALS/Franchise');
const Distributor = require('../../MODALS/Distributor');
const ThemeUser = require('../../MODALS/ThemeUser');
const Package = require('../../MODALS/Package');
const Product = require('../../MODALS/Product');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Transaction = require('../../MODALS/transactions');
const Wallets = require('../../MODALS/wallets');
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

function todayRange() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return { todayStart, todayEnd };
}

function daysAgoStart(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
}

function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function buildDayKeys(days) {
    const keys = [];
    const start = daysAgoStart(days);
    for (let i = 0; i < days; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        keys.push({
            key: localDateKey(d),
            label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        });
    }
    return keys;
}

function fillSeries(dayKeys, rows, fields) {
    const map = Object.fromEntries((rows || []).map((row) => [row._id, row]));
    return dayKeys.map(({ key, label }) => {
        const hit = map[key] || {};
        const point = { date: key, label };
        fields.forEach((field) => {
            point[field] = round2(hit[field]);
        });
        return point;
    });
}

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
            const chartDays = Math.min(30, Math.max(7, Number(req.query.days) || 14));
            const { todayStart, todayEnd } = todayRange();
            const rangeStart = daysAgoStart(chartDays);
            const dayKeys = buildDayKeys(chartDays);

            const incomeWallets = await Wallets.find({ status: 1, wallet_type: 'income' }, 'slug name')
                .sort({ id: 1 })
                .lean();
            const incomeSlugs = incomeWallets.map((w) => w.slug).filter(Boolean);
            const incomeNameMap = Object.fromEntries(
                incomeWallets.map((w) => [w.slug, w.name || w.slug])
            );

            const packageMatch = {
                order_type: 'distributor_package_purchase',
                order_status: { $nin: ['cancelled', 'refunded'] }
            };
            const orderValidMatch = {
                order_status: { $nin: ['cancelled', 'refunded'] }
            };
            const incomeMatch = {
                source: { $in: incomeSlugs.length ? incomeSlugs : ['__none__'] },
                debit_credit: 'credit',
                status: { $ne: 2 },
                panel: 'distributor'
            };
            const todayCond = {
                $and: [{ $gte: ['$created_date', todayStart] }, { $lte: ['$created_date', todayEnd] }]
            };
            const todayTxCond = {
                $and: [{ $gte: ['$time', todayStart] }, { $lte: ['$time', todayEnd] }]
            };

            const [
                franchiseCount,
                distributorCount,
                themeUserCount,
                packageCatalogCount,
                productCount,
                orderCount,
                lowStockCount,
                outOfStockCount,
                pendingOrders,
                deliveredOrders,
                revenueAgg,
                lowStockProducts,
                outOfStockProducts,
                packagePurchaseAgg,
                packageByPkgAgg,
                packageCatalog,
                bvPurchaseAgg,
                incomeByTypeAgg,
                usersActive,
                usersInactive,
                usersTodayJoined,
                usersTodayActive,
                orderSeriesAgg,
                incomeSeriesAgg,
                usersJoinedSeriesAgg,
                usersActiveSeriesAgg,
                orderTypePieAgg
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
                    { $match: orderValidMatch },
                    { $group: { _id: null, revenue: { $sum: '$grand_total' } } }
                ]),
                Product.find({ status: 'enabled', stock: { $gt: 0, $lte: threshold } })
                    .sort({ stock: 1 })
                    .limit(10)
                    .select('productId product_name sku stock is_hidden'),
                Product.find({ status: 'enabled', stock: { $lte: 0 } })
                    .sort({ updated_at: -1 })
                    .limit(10)
                    .select('productId product_name sku stock is_hidden'),
                CommerceOrder.aggregate([
                    { $match: packageMatch },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            amount: { $sum: '$grand_total' },
                            bv: { $sum: '$bv' },
                            todayCount: { $sum: { $cond: [todayCond, 1, 0] } },
                            todayAmount: { $sum: { $cond: [todayCond, '$grand_total', 0] } },
                            todayBv: { $sum: { $cond: [todayCond, '$bv', 0] } }
                        }
                    }
                ]),
                CommerceOrder.aggregate([
                    { $match: packageMatch },
                    {
                        $group: {
                            _id: '$packageId',
                            package_name: { $first: '$package_name' },
                            count: { $sum: 1 },
                            amount: { $sum: '$grand_total' },
                            bv: { $sum: '$bv' },
                            todayCount: { $sum: { $cond: [todayCond, 1, 0] } },
                            todayAmount: { $sum: { $cond: [todayCond, '$grand_total', 0] } },
                            todayBv: { $sum: { $cond: [todayCond, '$bv', 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Package.find({ status: { $ne: 'disabled' } })
                    .sort({ packageId: 1 })
                    .select('packageId name price discounted_amount bv status')
                    .lean(),
                CommerceOrder.aggregate([
                    { $match: orderValidMatch },
                    {
                        $group: {
                            _id: null,
                            bv: { $sum: '$bv' },
                            todayBv: { $sum: { $cond: [todayCond, '$bv', 0] } }
                        }
                    }
                ]),
                incomeSlugs.length
                    ? Transaction.aggregate([
                        { $match: incomeMatch },
                        {
                            $group: {
                                _id: '$source',
                                totalAmount: { $sum: '$amount' },
                                todayAmount: {
                                    $sum: { $cond: [todayTxCond, '$amount', 0] }
                                },
                                count: { $sum: 1 },
                                todayCount: { $sum: { $cond: [todayTxCond, 1, 0] } }
                            }
                        }
                    ])
                    : Promise.resolve([]),
                Distributor.countDocuments({ status: 'active' }),
                Distributor.countDocuments({ status: 'inactive' }),
                Distributor.countDocuments({
                    joining_date: { $gte: todayStart, $lte: todayEnd }
                }),
                Distributor.countDocuments({
                    status: 'active',
                    activation_date: { $gte: todayStart, $lte: todayEnd }
                }),
                CommerceOrder.aggregate([
                    {
                        $match: {
                            ...orderValidMatch,
                            created_date: { $gte: rangeStart }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$created_date',
                                    timezone: 'Asia/Kolkata'
                                }
                            },
                            orders: { $sum: 1 },
                            amount: { $sum: '$grand_total' },
                            bv: { $sum: '$bv' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                incomeSlugs.length
                    ? Transaction.aggregate([
                        {
                            $match: {
                                ...incomeMatch,
                                time: { $gte: rangeStart }
                            }
                        },
                        {
                            $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$time',
                                    timezone: 'Asia/Kolkata'
                                }
                            },
                                amount: { $sum: '$amount' },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ])
                    : Promise.resolve([]),
                Distributor.aggregate([
                    { $match: { joining_date: { $gte: rangeStart } } },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$joining_date',
                                    timezone: 'Asia/Kolkata'
                                }
                            },
                            joined: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                Distributor.aggregate([
                    {
                        $match: {
                            status: 'active',
                            activation_date: { $gte: rangeStart, $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$activation_date',
                                    timezone: 'Asia/Kolkata'
                                }
                            },
                            activated: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
                CommerceOrder.aggregate([
                    { $match: orderValidMatch },
                    {
                        $group: {
                            _id: '$order_type',
                            count: { $sum: 1 },
                            amount: { $sum: '$grand_total' }
                        }
                    }
                ])
            ]);

            const pkg = packagePurchaseAgg[0] || {};
            const bvAll = bvPurchaseAgg[0] || {};

            const salesByPkgId = Object.fromEntries(
                (packageByPkgAgg || []).map((row) => [Number(row._id), row])
            );
            const packageSalesItems = (packageCatalog || []).map((p) => {
                const hit = salesByPkgId[Number(p.packageId)];
                return {
                    packageId: Number(p.packageId),
                    name: p.name || `Package ${p.packageId}`,
                    totalCount: Number(hit?.count) || 0,
                    todayCount: Number(hit?.todayCount) || 0,
                    totalAmount: round2(hit?.amount),
                    todayAmount: round2(hit?.todayAmount),
                    totalBv: round2(hit?.bv),
                    todayBv: round2(hit?.todayBv)
                };
            });
            // Include any sold packages missing from catalog (deleted/disabled)
            for (const row of packageByPkgAgg || []) {
                const id = Number(row._id);
                if (!id || packageSalesItems.some((p) => p.packageId === id)) continue;
                packageSalesItems.push({
                    packageId: id,
                    name: row.package_name || `Package ${id}`,
                    totalCount: Number(row.count) || 0,
                    todayCount: Number(row.todayCount) || 0,
                    totalAmount: round2(row.amount),
                    todayAmount: round2(row.todayAmount),
                    totalBv: round2(row.bv),
                    todayBv: round2(row.todayBv)
                });
            }
            packageSalesItems.sort((a, b) => a.packageId - b.packageId);

            const incomeItems = incomeSlugs.map((slug) => {
                const hit = incomeByTypeAgg.find((row) => row._id === slug);
                return {
                    slug,
                    name: incomeNameMap[slug] || slug,
                    totalAmount: round2(hit?.totalAmount),
                    todayAmount: round2(hit?.todayAmount),
                    count: Number(hit?.count) || 0,
                    todayCount: Number(hit?.todayCount) || 0
                };
            });

            const incomeTotal = {
                totalAmount: round2(incomeItems.reduce((s, i) => s + i.totalAmount, 0)),
                todayAmount: round2(incomeItems.reduce((s, i) => s + i.todayAmount, 0))
            };

            const joinedMap = Object.fromEntries(
                usersJoinedSeriesAgg.map((row) => [row._id, Number(row.joined) || 0])
            );
            const activeMap = Object.fromEntries(
                usersActiveSeriesAgg.map((row) => [row._id, Number(row.activated) || 0])
            );

            const usersSeries = dayKeys.map(({ key, label }) => ({
                date: key,
                label,
                joined: joinedMap[key] || 0,
                activated: activeMap[key] || 0
            }));

            const orderTypeLabels = {
                franchise_purchase: 'Franchise',
                distributor_purchase: 'Distributor',
                theme_purchase: 'Theme',
                distributor_package_purchase: 'Package'
            };

            return res.status(200).json({
                status: 200,
                message: 'Wellness dashboard fetched.',
                data: {
                    franchises: franchiseCount,
                    distributors: distributorCount,
                    theme_users: themeUserCount,
                    packages: packageCatalogCount,
                    products: productCount,
                    orders: orderCount,
                    low_stock: lowStockCount,
                    out_of_stock: outOfStockCount,
                    pending_orders: pendingOrders,
                    delivered_orders: deliveredOrders,
                    revenue: round2(revenueAgg[0]?.revenue),
                    low_stock_products: lowStockProducts,
                    out_of_stock_products: outOfStockProducts,
                    low_stock_threshold: threshold,

                    package_purchases: {
                        totalCount: Number(pkg.count) || 0,
                        todayCount: Number(pkg.todayCount) || 0,
                        totalAmount: round2(pkg.amount),
                        todayAmount: round2(pkg.todayAmount),
                        totalBv: round2(pkg.bv),
                        todayBv: round2(pkg.todayBv),
                        by_package: packageSalesItems
                    },
                    bv_purchasing: {
                        totalBv: round2(bvAll.bv),
                        todayBv: round2(bvAll.todayBv),
                        packageTotalBv: round2(pkg.bv),
                        packageTodayBv: round2(pkg.todayBv)
                    },
                    income: {
                        total: incomeTotal,
                        by_type: incomeItems
                    },
                    users: {
                        total: distributorCount,
                        active: usersActive,
                        inactive: usersInactive,
                        todayJoined: usersTodayJoined,
                        todayActivated: usersTodayActive
                    },
                    charts: {
                        days: chartDays,
                        orders: fillSeries(dayKeys, orderSeriesAgg, ['orders', 'amount', 'bv']),
                        income: fillSeries(dayKeys, incomeSeriesAgg, ['amount', 'count']),
                        users: usersSeries,
                        income_pie: incomeItems
                            .filter((item) => item.totalAmount > 0)
                            .map((item) => ({
                                name: item.name,
                                slug: item.slug,
                                value: item.totalAmount,
                                today: item.todayAmount
                            })),
                        order_type_pie: orderTypePieAgg.map((row) => ({
                            name: orderTypeLabels[row._id] || row._id || 'Other',
                            value: Number(row.count) || 0,
                            amount: round2(row.amount)
                        })),
                        users_pie: [
                            { name: 'Active', value: usersActive },
                            { name: 'Inactive', value: usersInactive }
                        ].filter((item) => item.value > 0)
                    }
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
