const Product = require('../../MODALS/Product');
const StockHistory = require('../../MODALS/StockHistory');
const CommerceOrder = require('../../MODALS/CommerceOrder');
const AuditService = require('../../SERVICES/AuditService');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { REQUEST_SUCCESS: OK } = require('../../utils/successMessages');

const LOW_STOCK_THRESHOLD = 10;

class PRODUCT_ADMIN {
    async createProduct(req, res) {
        try {
            const {
                product_name, sku, categoryId, brandId, packageId,
                images, videos, description_images, description, ingredients, benefits,
                nutrition_facts, directions, storage, manufacturing_details,
                batch_number, expiry_date, weight, hsn_code, gst, mrp,
                distributor_price, franchise_price, bv, stock, status, is_hidden
            } = req.body;

            if (!product_name || !sku || !categoryId || !brandId || !packageId) {
                return res.status(400).json({ code: 400, message: 'product_name, sku, categoryId, brandId and packageId are required.' });
            }

            const exists = await Product.findOne({ sku: String(sku).trim() });
            if (exists) {
                return res.status(400).json({ code: 400, message: 'SKU already exists.' });
            }

            const initialStock = Math.max(0, Number(stock) || 0);
            const product = new Product({
                product_name,
                sku: String(sku).trim(),
                categoryId: Number(categoryId),
                brandId: Number(brandId),
                packageId: Number(packageId),
                images: Array.isArray(images) ? images : [],
                videos: Array.isArray(videos) ? videos : [],
                description_images: Array.isArray(description_images) ? description_images : [],
                description: description || '',
                ingredients: ingredients || '',
                benefits: Array.isArray(benefits) ? benefits : [],
                nutrition_facts: nutrition_facts || '',
                directions: directions || '',
                storage: storage || '',
                manufacturing_details: manufacturing_details || '',
                batch_number: batch_number || '',
                expiry_date: expiry_date ? new Date(expiry_date) : null,
                weight: weight || '',
                hsn_code: String(hsn_code || '').trim(),
                gst: Number(gst) || 0,
                mrp: Number(mrp) || 0,
                distributor_price: Number(distributor_price) || 0,
                franchise_price: Number(franchise_price) || 0,
                bv: Math.max(0, Number(bv) || 0),
                stock: initialStock,
                is_hidden: Boolean(is_hidden),
                status: status === 'disabled' ? 'disabled' : 'enabled',
                created_by: req.user?.uid || null
            });
            await product.save();

            if (initialStock > 0) {
                await new StockHistory({
                    scope: 'admin',
                    productId: product.productId,
                    sku: product.sku,
                    action: 'set',
                    quantity: initialStock,
                    previous_available: 0,
                    new_available: initialStock,
                    reference_type: 'manual',
                    reference_id: String(product.productId),
                    remark: 'Initial stock on product create',
                    created_by: req.user?.uid || null
                }).save();
            }

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'CREATE_PRODUCT',
                target_type: 'product',
                target_id: product.productId,
                ip: req.ip,
                meta: { sku: product.sku, product_name: product.product_name }
            });

            return res.status(201).json({ ...OK, message: 'Product created.', data: product });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateProduct(req, res) {
        try {
            const productId = Number(req.body.productId || req.params.productId);
            if (!productId) {
                return res.status(400).json({ code: 400, message: 'productId is required.' });
            }

            const product = await Product.findOne({ productId });
            if (!product) {
                return res.status(404).json({ code: 404, message: 'Product not found.' });
            }

            const fields = [
                'product_name', 'description', 'ingredients', 'nutrition_facts',
                'directions', 'storage', 'manufacturing_details', 'batch_number',
                'weight', 'hsn_code', 'gst', 'mrp', 'distributor_price', 'franchise_price', 'bv', 'status'
            ];
            for (const key of fields) {
                if (req.body[key] !== undefined) {
                    if (['gst', 'mrp', 'distributor_price', 'franchise_price', 'bv'].includes(key)) {
                        product[key] = Math.max(0, Number(req.body[key]) || 0);
                    } else if (key === 'status') {
                        product.status = req.body.status === 'disabled' ? 'disabled' : 'enabled';
                    } else if (key === 'hsn_code') {
                        product.hsn_code = String(req.body.hsn_code || '').trim();
                    } else {
                        product[key] = req.body[key];
                    }
                }
            }
            if (req.body.categoryId !== undefined) product.categoryId = Number(req.body.categoryId);
            if (req.body.brandId !== undefined) product.brandId = Number(req.body.brandId);
            if (req.body.packageId !== undefined) product.packageId = Number(req.body.packageId);
            if (req.body.images !== undefined) product.images = Array.isArray(req.body.images) ? req.body.images : product.images;
            if (req.body.videos !== undefined) product.videos = Array.isArray(req.body.videos) ? req.body.videos : product.videos;
            if (req.body.description_images !== undefined) {
                product.description_images = Array.isArray(req.body.description_images)
                    ? req.body.description_images
                    : product.description_images;
            }
            if (req.body.benefits !== undefined) product.benefits = Array.isArray(req.body.benefits) ? req.body.benefits : product.benefits;
            if (req.body.expiry_date !== undefined) {
                product.expiry_date = req.body.expiry_date ? new Date(req.body.expiry_date) : null;
            }
            if (req.body.is_hidden !== undefined) product.is_hidden = Boolean(req.body.is_hidden);

            product.updated_at = new Date();
            await product.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'UPDATE_PRODUCT',
                target_type: 'product',
                target_id: product.productId,
                ip: req.ip,
                meta: { sku: product.sku }
            });

            return res.status(200).json({ ...OK, message: 'Product updated.', data: product });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async toggleVisibility(req, res) {
        try {
            const productId = Number(req.body.productId || req.params.productId);
            const { is_hidden } = req.body;
            if (!productId || is_hidden === undefined) {
                return res.status(400).json({ code: 400, message: 'productId and is_hidden are required.' });
            }

            const product = await Product.findOneAndUpdate(
                { productId },
                { $set: { is_hidden: Boolean(is_hidden), updated_at: new Date() } },
                { new: true }
            );
            if (!product) {
                return res.status(404).json({ code: 404, message: 'Product not found.' });
            }

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: Boolean(is_hidden) ? 'HIDE_PRODUCT' : 'SHOW_PRODUCT',
                target_type: 'product',
                target_id: product.productId,
                ip: req.ip,
                meta: { sku: product.sku, is_hidden: product.is_hidden }
            });

            return res.status(200).json({
                ...OK,
                message: product.is_hidden ? 'Product hidden.' : 'Product visible.',
                data: product
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updateStock(req, res) {
        try {
            const productId = Number(req.body.productId || req.params.productId);
            const { action, quantity, remark } = req.body;
            if (!productId || !action) {
                return res.status(400).json({ code: 400, message: 'productId and action are required.' });
            }
            if (!['increase', 'decrease', 'set'].includes(action)) {
                return res.status(400).json({ code: 400, message: 'action must be increase, decrease or set.' });
            }

            const qty = Number(quantity);
            if (!Number.isFinite(qty) || qty < 0 || (action !== 'set' && qty <= 0)) {
                return res.status(400).json({ code: 400, message: 'Invalid quantity.' });
            }

            const product = await Product.findOne({ productId });
            if (!product) {
                return res.status(404).json({ code: 404, message: 'Product not found.' });
            }

            const previous = product.stock || 0;
            let next = previous;
            if (action === 'increase') next = previous + qty;
            else if (action === 'decrease') {
                if (qty > previous) {
                    return res.status(400).json({ code: 400, message: `Cannot decrease by ${qty}. Available stock: ${previous}.` });
                }
                next = previous - qty;
            } else {
                next = qty;
            }

            product.stock = next;
            product.updated_at = new Date();
            await product.save();

            const history = await new StockHistory({
                scope: 'admin',
                productId: product.productId,
                sku: product.sku,
                action,
                quantity: action === 'set' ? next : qty,
                previous_available: previous,
                new_available: next,
                reference_type: 'manual',
                reference_id: String(product.productId),
                remark: remark || `Stock ${action} by admin`,
                created_by: req.user?.uid || null
            }).save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'UPDATE_STOCK',
                target_type: 'product',
                target_id: product.productId,
                ip: req.ip,
                meta: { action, quantity: qty, previous, next }
            });

            return res.status(200).json({
                ...OK,
                message: 'Stock updated.',
                data: { product, history }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProducts(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {};

            if (req.query.status) filter.status = req.query.status;
            if (req.query.is_hidden !== undefined) filter.is_hidden = req.query.is_hidden === 'true' || req.query.is_hidden === true;
            if (req.query.categoryId) filter.categoryId = Number(req.query.categoryId);
            if (req.query.brandId) filter.brandId = Number(req.query.brandId);
            if (req.query.packageId) filter.packageId = Number(req.query.packageId);
            if (req.query.stock === 'low') filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
            if (req.query.stock === 'out') filter.stock = { $lte: 0 };
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

            return res.status(200).json({
                status: 200,
                message: 'Products fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getProduct(req, res) {
        try {
            const productId = Number(req.query.productId || req.params.productId);
            const product = await Product.findOne({ productId });
            if (!product) {
                return res.status(404).json({ code: 404, message: 'Product not found.' });
            }
            return res.status(200).json({ status: 200, message: 'Product fetched.', data: product });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getStockHistory(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = { scope: 'admin' };
            if (req.query.productId) filter.productId = Number(req.query.productId);
            if (req.query.action) filter.action = req.query.action;

            const [list, total] = await Promise.all([
                StockHistory.find(filter).sort({ created_date: -1 }).skip(skip).limit(limit),
                StockHistory.countDocuments(filter)
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Stock history fetched.',
                data: list,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getLowStock(req, res) {
        try {
            const threshold = Number(req.query.threshold) || LOW_STOCK_THRESHOLD;
            const list = await Product.find({
                status: 'enabled',
                stock: { $gt: 0, $lte: threshold }
            }).sort({ stock: 1 }).limit(100);
            return res.status(200).json({
                status: 200,
                message: 'Low stock products fetched.',
                data: list,
                threshold
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getOutOfStock(req, res) {
        try {
            const list = await Product.find({
                status: 'enabled',
                stock: { $lte: 0 }
            }).sort({ updated_at: -1 }).limit(100);
            return res.status(200).json({
                status: 200,
                message: 'Out of stock products fetched.',
                data: list
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getInventory(req, res) {
        try {
            const threshold = Number(req.query.threshold) || LOW_STOCK_THRESHOLD;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const skip = (page - 1) * limit;
            const filter = {};

            if (req.query.status) filter.status = req.query.status;
            else filter.status = { $ne: 'disabled' };

            if (req.query.stock === 'low') filter.stock = { $gt: 0, $lte: threshold };
            if (req.query.stock === 'out') filter.stock = { $lte: 0 };

            if (req.query.search) {
                filter.$or = [
                    { product_name: { $regex: req.query.search, $options: 'i' } },
                    { sku: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const qtyByStatus = async (statuses) => CommerceOrder.aggregate([
                { $match: { order_status: { $in: statuses } } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        quantity: { $sum: '$items.quantity' }
                    }
                }
            ]);

            const baseFilter = { status: { $ne: 'disabled' } };

            const [
                products,
                total,
                deliveredAgg,
                pipelineAgg,
                stockSummaryAgg
            ] = await Promise.all([
                Product.find(filter)
                    .sort({ stock: 1, product_name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .select('productId product_name sku stock status is_hidden'),
                Product.countDocuments(filter),
                qtyByStatus(['delivered']),
                qtyByStatus(['pending', 'confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery']),
                Product.aggregate([
                    { $match: baseFilter },
                    {
                        $group: {
                            _id: null,
                            remaining_units: { $sum: '$stock' },
                            low_stock_products: {
                                $sum: {
                                    $cond: [
                                        { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', threshold] }] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            out_of_stock_products: {
                                $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] }
                            },
                            product_count: { $sum: 1 }
                        }
                    }
                ])
            ]);

            const deliveredMap = Object.fromEntries(deliveredAgg.map((r) => [r._id, r.quantity]));
            const pipelineMap = Object.fromEntries(pipelineAgg.map((r) => [r._id, r.quantity]));

            const rows = products.map((p) => {
                const remaining = Number(p.stock) || 0;
                const delivered = deliveredMap[p.productId] || 0;
                const in_pipeline = pipelineMap[p.productId] || 0;
                let stock_status = 'ok';
                if (remaining <= 0) stock_status = 'out';
                else if (remaining <= threshold) stock_status = 'low';
                return {
                    productId: p.productId,
                    product_name: p.product_name,
                    sku: p.sku,
                    status: p.status,
                    is_hidden: p.is_hidden,
                    remaining_stock: remaining,
                    delivered_qty: delivered,
                    in_pipeline_qty: in_pipeline,
                    total_moved: remaining + delivered + in_pipeline,
                    stock_status
                };
            });

            const stockSummary = stockSummaryAgg[0] || {
                remaining_units: 0,
                low_stock_products: 0,
                out_of_stock_products: 0,
                product_count: 0
            };
            const deliveredTotal = deliveredAgg.reduce((s, r) => s + (r.quantity || 0), 0);
            const pipelineTotal = pipelineAgg.reduce((s, r) => s + (r.quantity || 0), 0);

            return res.status(200).json({
                status: 200,
                message: 'Inventory fetched.',
                data: rows,
                summary: {
                    products: stockSummary.product_count || 0,
                    remaining_units: stockSummary.remaining_units || 0,
                    delivered_units: deliveredTotal,
                    in_pipeline_units: pipelineTotal,
                    low_stock_products: stockSummary.low_stock_products || 0,
                    out_of_stock_products: stockSummary.out_of_stock_products || 0,
                    low_stock_threshold: threshold
                },
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async uploadMedia(req, res) {
        try {
            const files = req.files || [];
            if (!files.length) {
                return res.status(400).json({ code: 400, message: 'No files uploaded.' });
            }

            const urls = files.map((file) => `/uploads/products/${file.filename}`);
            const images = [];
            const videos = [];
            for (const file of files) {
                const url = `/uploads/products/${file.filename}`;
                if (file.mimetype && file.mimetype.startsWith('video/')) {
                    videos.push(url);
                } else {
                    images.push(url);
                }
            }

            return res.status(200).json({
                ...OK,
                message: 'Media uploaded.',
                data: { urls, images, videos }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const ProductAdmin = new PRODUCT_ADMIN();
module.exports = ProductAdmin;
module.exports.LOW_STOCK_THRESHOLD = LOW_STOCK_THRESHOLD;
