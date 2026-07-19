const Product = require('../../MODALS/Product');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const Invoice = require('../../MODALS/Invoice');
const CommerceService = require('../../SERVICES/CommerceService');
const { priceForRole } = require('../../SERVICES/CommerceService');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

class STOREFRONT {
    async listProducts(req, res) {
        try {
            const role = req.user.role;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;

            const filter = {
                status: 'enabled',
                is_hidden: false
            };
            if (req.query.categoryId) filter.categoryId = Number(req.query.categoryId);
            if (req.query.brandId) filter.brandId = Number(req.query.brandId);
            if (req.query.packageId) filter.packageId = Number(req.query.packageId);
            if (req.query.in_stock === 'true') filter.stock = { $gt: 0 };
            if (req.query.search) {
                filter.$or = [
                    { product_name: { $regex: req.query.search, $options: 'i' } },
                    { sku: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const [list, total] = await Promise.all([
                Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Product.countDocuments(filter)
            ]);

            const data = list.map((p) => {
                const obj = p.toObject({ virtuals: true });
                return {
                    ...obj,
                    price: priceForRole(p, role),
                    out_of_stock: (p.stock || 0) <= 0
                };
            });

            return res.status(200).json({
                status: 200,
                message: 'Products fetched.',
                data,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProduct(req, res) {
        try {
            const role = req.user.role;
            const productId = Number(req.query.productId || req.params.productId);
            const product = await Product.findOne({
                productId,
                status: 'enabled',
                is_hidden: false
            });
            if (!product) {
                return res.status(404).json({ code: 404, message: 'Product not found.' });
            }
            const obj = product.toObject({ virtuals: true });
            return res.status(200).json({
                status: 200,
                message: 'Product fetched.',
                data: {
                    ...obj,
                    price: priceForRole(product, role),
                    out_of_stock: (product.stock || 0) <= 0
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getCart(req, res) {
        try {
            const cart = await CommerceService.getCart(req.user.uid);
            return res.status(200).json({ status: 200, message: 'Cart fetched.', data: cart });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async addToCart(req, res) {
        try {
            const cart = await CommerceService.addToCart(req.user.uid, req.user.role, req.body);
            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Added to cart.', data: cart });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateCartItem(req, res) {
        try {
            const cart = await CommerceService.updateCartItem(req.user.uid, req.user.role, req.body);
            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Cart updated.', data: cart });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async removeCartItem(req, res) {
        try {
            const productId = Number(req.params.productId || req.body.productId);
            const cart = await CommerceService.removeCartItem(req.user.uid, productId);
            return res.status(200).json({ ...REQUEST_SUCCESS, message: 'Item removed.', data: cart });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async checkout(req, res) {
        try {
            const { shipping_address, idempotency_key, remark } = req.body;
            const result = await CommerceService.checkout({
                user: req.user,
                shipping_address: shipping_address || {},
                idempotency_key,
                remark
            });
            return res.status(result.duplicate ? 200 : 201).json({
                ...REQUEST_SUCCESS,
                message: result.duplicate ? 'Order already placed.' : 'Order placed successfully.',
                data: {
                    order: result.order,
                    invoice: result.invoice,
                    duplicate: result.duplicate
                }
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async myOrders(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {
                buyer_uid: req.user.uid,
                buyer_role: req.user.role
            };
            if (req.query.status) filter.order_status = req.query.status;

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
            const orderId = Number(req.query.orderId || req.params.orderId);
            const order = await CommerceOrder.findOne({
                orderId,
                buyer_uid: req.user.uid,
                buyer_role: req.user.role
            });
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

    async listPackages(req, res) {
        try {
            if (req.user.role !== 'distributor') {
                return res.status(403).json({ code: 403, message: 'Packages are only available to distributors.' });
            }
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const result = await CommerceService.listPackagesForDistributor({ page, limit });
            return res.status(200).json({
                status: 200,
                message: 'Packages fetched.',
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getPackage(req, res) {
        try {
            if (req.user.role !== 'distributor') {
                return res.status(403).json({ code: 403, message: 'Packages are only available to distributors.' });
            }
            const packageId = Number(req.query.packageId || req.params.packageId);
            const result = await CommerceService.listPackagesForDistributor({ packageId });
            return res.status(200).json({
                status: 200,
                message: 'Package fetched.',
                data: result.data
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async purchasePackage(req, res) {
        try {
            const { packageId, shipping_address, idempotency_key, remark } = req.body;
            const result = await CommerceService.purchasePackage({
                user: req.user,
                packageId,
                shipping_address: shipping_address || {},
                idempotency_key,
                remark
            });
            return res.status(result.duplicate ? 200 : 201).json({
                ...REQUEST_SUCCESS,
                message: result.duplicate
                    ? 'Package order already placed.'
                    : 'Package purchased. Your account is now active.',
                data: {
                    order: result.order,
                    invoice: result.invoice,
                    distributor: result.distributor || null,
                    duplicate: result.duplicate
                }
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const Storefront = new STOREFRONT();
module.exports = Storefront;
