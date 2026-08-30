const CommerceOrder = require('../../MODALS/CommerceOrder');
const Invoice = require('../../MODALS/Invoice');
const Product = require('../../MODALS/Product');
const Distributor = require('../../MODALS/Distributor');
const Franchise = require('../../MODALS/Franchise');
const ThemeUser = require('../../MODALS/ThemeUser');
const Package = require('../../MODALS/Package');
const StockHistory = require('../../MODALS/StockHistory');
const AuditService = require('../../SERVICES/AuditService');
const CommerceService = require('../../SERVICES/CommerceService');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const FLOW = [
    'pending',
    'confirmed',
    'packed',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered'
];

const FULFILLMENT = [
    'confirmed',
    'packed',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered'
];

const TERMINAL = ['cancelled', 'returned', 'refunded'];

function isValidTransition(from, to) {
    if (from === to) return false;
    if (TERMINAL.includes(from)) return false;
    if (TERMINAL.includes(to)) {
        // Allow cancel/return/refund from any non-terminal (except delivered for cancel is ok too)
        return true;
    }
    const fromIdx = FLOW.indexOf(from);
    const toIdx = FLOW.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return false;
    return toIdx === fromIdx + 1 || toIdx > fromIdx;
}

async function resolveBuyerUidsBySearch(search, buyerRole) {
    const q = String(search || '').trim();
    if (!q) return [];
    const regex = { $regex: q, $options: 'i' };
    const roles = buyerRole ? [buyerRole] : ['distributor', 'franchise', 'theme'];
    const uids = new Set();

    await Promise.all(roles.map(async (role) => {
        if (role === 'distributor') {
            const rows = await Distributor.find(
                { $or: [{ username: regex }, { name: regex }] },
                'uid'
            ).lean();
            rows.forEach((row) => uids.add(row.uid));
            return;
        }
        if (role === 'franchise') {
            const rows = await Franchise.find(
                {
                    $or: [
                        { username: regex },
                        { owner_name: regex },
                        { business_name: regex }
                    ]
                },
                'uid'
            ).lean();
            rows.forEach((row) => uids.add(row.uid));
            return;
        }
        if (role === 'theme') {
            const rows = await ThemeUser.find(
                { $or: [{ username: regex }, { name: regex }] },
                'uid'
            ).lean();
            rows.forEach((row) => uids.add(row.uid));
        }
    }));

    return [...uids];
}

async function attachBuyerProfiles(orders = []) {
    if (!orders.length) return [];

    const byRole = {
        distributor: new Set(),
        franchise: new Set(),
        theme: new Set()
    };

    for (const order of orders) {
        const role = order.buyer_role;
        const uid = Number(order.buyer_uid);
        if (byRole[role] && Number.isFinite(uid)) byRole[role].add(uid);
    }

    const [distributors, franchises, themes] = await Promise.all([
        byRole.distributor.size
            ? Distributor.find(
                { uid: { $in: [...byRole.distributor] } },
                'uid distributorId username name activated_package_id package_bv'
            ).lean()
            : [],
        byRole.franchise.size
            ? Franchise.find(
                { uid: { $in: [...byRole.franchise] } },
                'uid franchiseId username owner_name business_name'
            ).lean()
            : [],
        byRole.theme.size
            ? ThemeUser.find(
                { uid: { $in: [...byRole.theme] } },
                'uid themeUserId username name'
            ).lean()
            : []
    ]);

    const packageIds = [
        ...new Set(
            distributors
                .map((row) => Number(row.activated_package_id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    ];
    const packages = packageIds.length
        ? await Package.find({ packageId: { $in: packageIds } }).select('packageId name bv').lean()
        : [];
    const packageMap = new Map(packages.map((pkg) => [Number(pkg.packageId), pkg]));

    const distUids = distributors.map((row) => Number(row.uid)).filter(Boolean);
    const highestByUid = new Map();
    if (distUids.length) {
        const highestRows = await CommerceOrder.aggregate([
            {
                $match: {
                    buyer_uid: { $in: distUids },
                    order_type: 'distributor_package_purchase',
                    order_status: {
                        $in: [
                            'confirmed',
                            'packed',
                            'shipped',
                            'in_transit',
                            'out_for_delivery',
                            'delivered'
                        ]
                    }
                }
            },
            { $sort: { bv: -1, created_date: -1 } },
            {
                $group: {
                    _id: '$buyer_uid',
                    packageId: { $first: '$packageId' },
                    package_name: { $first: '$package_name' },
                    bv: { $first: '$bv' }
                }
            }
        ]);
        for (const row of highestRows) {
            highestByUid.set(Number(row._id), row);
        }
    }

    const missingPkgIds = [
        ...new Set(
            [...highestByUid.values()]
                .map((row) => Number(row.packageId))
                .filter((id) => Number.isFinite(id) && id > 0 && !packageMap.has(id))
        )
    ];
    if (missingPkgIds.length) {
        const extraPkgs = await Package.find({ packageId: { $in: missingPkgIds } })
            .select('packageId name bv')
            .lean();
        for (const pkg of extraPkgs) {
            packageMap.set(Number(pkg.packageId), pkg);
        }
    }

    const profileMap = {};
    for (const row of distributors) {
        const highest = highestByUid.get(Number(row.uid));
        const activatedPkg = row.activated_package_id != null
            ? packageMap.get(Number(row.activated_package_id))
            : null;
        const highestPkg = highest?.packageId != null
            ? packageMap.get(Number(highest.packageId))
            : null;
        const useHighest =
            highest && Number(highest.bv || 0) >= Number(row.package_bv || 0);
        profileMap[`distributor:${row.uid}`] = {
            buyer_name: row.name || '',
            buyer_username: row.username || '',
            buyer_panel_id: row.distributorId || null,
            highest_package_name: useHighest
                ? (highestPkg?.name || highest.package_name || '')
                : (activatedPkg?.name || ''),
            highest_package_bv: useHighest
                ? Number(highest.bv || 0)
                : Number(row.package_bv || activatedPkg?.bv || 0)
        };
    }
    for (const row of franchises) {
        profileMap[`franchise:${row.uid}`] = {
            buyer_name: row.owner_name || row.business_name || '',
            buyer_username: row.username || '',
            buyer_panel_id: row.franchiseId || null,
            highest_package_name: '',
            highest_package_bv: 0
        };
    }
    for (const row of themes) {
        profileMap[`theme:${row.uid}`] = {
            buyer_name: row.name || row.username || '',
            buyer_username: row.username || '',
            buyer_panel_id: row.themeUserId || null,
            highest_package_name: '',
            highest_package_bv: 0
        };
    }

    return orders.map((order) => {
        const plain = order && typeof order.toObject === 'function' ? order.toObject() : { ...order };
        const profile = profileMap[`${plain.buyer_role}:${plain.buyer_uid}`] || {};
        return {
            ...plain,
            buyer_name: profile.buyer_name || '',
            buyer_username: profile.buyer_username || '',
            buyer_panel_id: profile.buyer_panel_id || null,
            highest_package_name: profile.highest_package_name || '',
            highest_package_bv: Number(profile.highest_package_bv || 0)
        };
    });
}

class ORDER_ADMIN {
    async getOrders(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.status) filter.order_status = req.query.status;
            if (req.query.order_type) filter.order_type = req.query.order_type;
            if (req.query.buyer_role) filter.buyer_role = req.query.buyer_role;
            if (req.query.payment_status) {
                // Manual proof status: none | submitted | verified | rejected
                filter['payment.status'] = String(req.query.payment_status);
            }
            if (req.query.search) {
                const search = String(req.query.search).trim();
                const or = [
                    { order_number: { $regex: search, $options: 'i' } },
                    { invoice_number: { $regex: search, $options: 'i' } },
                    { package_name: { $regex: search, $options: 'i' } }
                ];
                const asUid = Number(search);
                if (Number.isFinite(asUid) && String(asUid) === search) {
                    or.push({ buyer_uid: asUid });
                }
                const matchedBuyerUids = await resolveBuyerUidsBySearch(search, req.query.buyer_role);
                if (matchedBuyerUids.length) {
                    or.push({ buyer_uid: { $in: matchedBuyerUids } });
                }
                filter.$or = or;
            }

            // Prefer orders awaiting payment verification at the top
            const [list, total] = await Promise.all([
                CommerceOrder.aggregate([
                    { $match: filter },
                    {
                        $addFields: {
                            _pay_priority: {
                                $cond: [{ $eq: ['$payment.status', 'submitted'] }, 0, 1]
                            }
                        }
                    },
                    { $sort: { _pay_priority: 1, created_date: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    { $project: { _pay_priority: 0 } }
                ]),
                CommerceOrder.countDocuments(filter)
            ]);

            const enriched = await attachBuyerProfiles(list);

            return res.status(200).json({
                status: 200,
                message: 'Orders fetched.',
                data: enriched,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getOrder(req, res) {
        try {
            const orderId = Number(req.query.orderId || req.params.orderId || req.body.orderId);
            const order = await CommerceOrder.findOne({ orderId });
            if (!order) {
                return res.status(404).json({ code: 404, message: 'Order not found.' });
            }
            const invoice = await Invoice.findOne({ orderId: order.orderId });
            const [enriched] = await attachBuyerProfiles([order]);
            return res.status(200).json({
                status: 200,
                message: 'Order fetched.',
                data: {
                    order: enriched,
                    invoice,
                    shipping: enriched.shipping,
                    timeline: enriched.timeline
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateStatus(req, res) {
        try {
            const orderId = Number(req.body.orderId || req.params.orderId);
            const { status, remark } = req.body;
            if (!orderId || !status) {
                return res.status(400).json({ code: 400, message: 'orderId and status are required.' });
            }

            const order = await CommerceOrder.findOne({ orderId });
            if (!order) {
                return res.status(404).json({ code: 404, message: 'Order not found.' });
            }

            if (!isValidTransition(order.order_status, status)) {
                return res.status(400).json({
                    code: 400,
                    message: `Cannot change status from ${order.order_status} to ${status}.`
                });
            }

            // Payment must be verified before confirming / fulfillment
            if (FULFILLMENT.includes(status) && order.payment_status !== 'received') {
                return res.status(400).json({
                    code: 400,
                    message: 'Payment must be verified before confirming this order. Use Verify Payment first.'
                });
            }

            const previousStatus = order.order_status;
            order.order_status = status;
            order.timeline.push({
                status,
                remark: remark || `Status updated to ${status}`,
                updated_by: req.user.uid,
                updated_by_role: req.user.role || 'admin',
                updated_by_name: req.user.username || 'Admin',
                updated_at: new Date()
            });

            if (status === 'shipped' || status === 'in_transit') {
                order.dispatch_status = 'dispatched';
            }
            if (status === 'delivered') {
                order.dispatch_status = 'delivered';
                if (!order.shipping) order.shipping = {};
                order.shipping.delivered_date = new Date();
            }
            if (status === 'cancelled') {
                // Reverse franchise inventory first if it was credited on confirm
                if (order.order_type === 'franchise_purchase' && order.franchise_stock_credited) {
                    try {
                        await CommerceService.debitFranchiseInventoryOnCancel(order, req.user.uid);
                    } catch (invErr) {
                        if (invErr.statusCode === 400) {
                            return res.status(400).json({ code: 400, message: invErr.message });
                        }
                        throw invErr;
                    }
                }

                order.dispatch_status = 'cancelled';
                // Restore admin warehouse stock
                for (const item of order.items) {
                    const product = await Product.findOneAndUpdate(
                        { productId: item.productId },
                        { $inc: { stock: item.quantity }, $set: { updated_at: new Date() } },
                        { new: true }
                    );
                    if (product) {
                        await new StockHistory({
                            scope: 'admin',
                            productId: product.productId,
                            sku: product.sku,
                            action: 'cancel',
                            quantity: item.quantity,
                            previous_available: product.stock - item.quantity,
                            new_available: product.stock,
                            reference_type: 'order',
                            reference_id: order.order_number,
                            remark: `Stock restored — order cancelled`,
                            created_by: req.user.uid
                        }).save();
                    }
                }

                // Reverse repurchase BV credited on distributor product purchase
                if (
                    order.order_type === 'distributor_purchase' &&
                    order.repurchase_bv_credited &&
                    Number(order.bv) > 0
                ) {
                    await Distributor.updateOne(
                        { uid: order.buyer_uid },
                        { $inc: { repurchase_bv: -Math.abs(Number(order.bv) || 0) } }
                    );
                    order.repurchase_bv_credited = false;
                }
            }

            // Credit franchise inventory when confirming / jumping into fulfillment
            if (
                order.order_type === 'franchise_purchase' &&
                FULFILLMENT.includes(status) &&
                !order.franchise_stock_credited
            ) {
                try {
                    await CommerceService.creditFranchiseInventory(order, req.user.uid);
                } catch (invErr) {
                    if (invErr.statusCode === 400) {
                        return res.status(400).json({ code: 400, message: invErr.message });
                    }
                    throw invErr;
                }
            }

            if (status === 'refunded') {
                order.payment_status = 'refunded';
            }

            await order.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'UPDATE_ORDER_STATUS',
                target_uid: order.buyer_uid,
                target_role: order.buyer_role,
                target_type: 'order',
                target_id: order.orderId,
                ip: req.ip,
                meta: { from: previousStatus, to: status, order_number: order.order_number }
            });

            return res.status(200).json({
                ...REQUEST_SUCCESS,
                message: 'Order status updated.',
                data: order
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateShipping(req, res) {
        try {
            const orderId = Number(req.body.orderId || req.params.orderId);
            if (!orderId) {
                return res.status(400).json({ code: 400, message: 'orderId is required.' });
            }

            const order = await CommerceOrder.findOne({ orderId });
            if (!order) {
                return res.status(404).json({ code: 404, message: 'Order not found.' });
            }

            const fields = [
                'courier_name', 'tracking_number', 'shipping_partner',
                'dispatch_date', 'estimated_delivery', 'delivered_date'
            ];
            if (!order.shipping) order.shipping = {};
            for (const key of fields) {
                if (req.body[key] !== undefined) {
                    if (['dispatch_date', 'estimated_delivery', 'delivered_date'].includes(key)) {
                        order.shipping[key] = req.body[key] ? new Date(req.body[key]) : null;
                    } else {
                        order.shipping[key] = req.body[key] || '';
                    }
                }
            }
            order.markModified('shipping');

            if (req.body.remark) {
                order.timeline.push({
                    status: order.order_status,
                    remark: req.body.remark,
                    updated_by: req.user.uid,
                    updated_by_role: req.user.role || 'admin',
                    updated_by_name: req.user.username || 'Admin',
                    updated_at: new Date()
                });
            }

            await order.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'UPDATE_SHIPPING',
                target_type: 'order',
                target_id: order.orderId,
                ip: req.ip,
                meta: { order_number: order.order_number, shipping: order.shipping }
            });

            return res.status(200).json({
                ...REQUEST_SUCCESS,
                message: 'Shipping details updated.',
                data: order
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async verifyOrderPayment(req, res) {
        try {
            const orderId = Number(req.body.orderId || req.params.orderId);
            const { remark } = req.body;
            const result = await CommerceService.verifyOrderPayment({
                orderId,
                adminUser: req.user,
                remark
            });

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'VERIFY_ORDER_PAYMENT',
                target_uid: result.order.buyer_uid,
                target_role: result.order.buyer_role,
                target_type: 'order',
                target_id: result.order.orderId,
                ip: req.ip,
                meta: {
                    order_number: result.order.order_number,
                    utr: result.order.payment?.utr,
                    already: result.already
                }
            });

            return res.status(200).json({
                ...REQUEST_SUCCESS,
                message: result.already
                    ? 'Payment already verified.'
                    : 'Payment verified. Order confirmed.',
                data: { order: result.order, invoice: result.invoice }
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async rejectOrderPayment(req, res) {
        try {
            const orderId = Number(req.body.orderId || req.params.orderId);
            const { remark } = req.body;
            const order = await CommerceService.rejectOrderPayment({
                orderId,
                adminUser: req.user,
                remark
            });

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'REJECT_ORDER_PAYMENT',
                target_uid: order.buyer_uid,
                target_role: order.buyer_role,
                target_type: 'order',
                target_id: order.orderId,
                ip: req.ip,
                meta: { order_number: order.order_number, utr: order.payment?.utr }
            });

            return res.status(200).json({
                ...REQUEST_SUCCESS,
                message: 'Payment proof rejected. Buyer can re-submit.',
                data: { order }
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async downloadInvoice(req, res) {
        try {
            const orderId = Number(req.query.orderId || req.params.orderId || req.body.orderId);
            if (!orderId) {
                return res.status(400).json({ code: 400, message: 'orderId is required.' });
            }

            const InvoiceDocument = require('../../SERVICES/InvoiceDocument');
            const result = await InvoiceDocument.ensurePaidInvoiceDocument(orderId);
            const filename = `${result.invoice.invoice_number || `order-${orderId}`}.html`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send(result.html);
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const OrderAdmin = new ORDER_ADMIN();
module.exports = OrderAdmin;
module.exports.FLOW = FLOW;
module.exports.TERMINAL = TERMINAL;
