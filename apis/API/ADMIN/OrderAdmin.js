const CommerceOrder = require('../../MODALS/CommerceOrder');
const Invoice = require('../../MODALS/Invoice');
const Product = require('../../MODALS/Product');
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
            if (req.query.search) {
                filter.$or = [
                    { order_number: { $regex: req.query.search, $options: 'i' } },
                    { invoice_number: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                CommerceOrder.find(filter).sort({ created_date: -1 }).skip(skip).limit(limit),
                CommerceOrder.countDocuments(filter)
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Orders fetched.',
                data: list,
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
            return res.status(200).json({
                status: 200,
                message: 'Order fetched.',
                data: { order, invoice, shipping: order.shipping, timeline: order.timeline }
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
}

const OrderAdmin = new ORDER_ADMIN();
module.exports = OrderAdmin;
module.exports.FLOW = FLOW;
module.exports.TERMINAL = TERMINAL;
