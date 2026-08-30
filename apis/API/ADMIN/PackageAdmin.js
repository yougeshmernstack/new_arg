const Package = require('../../MODALS/Package');
const Product = require('../../MODALS/Product');
const AuditService = require('../../SERVICES/AuditService');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { REQUEST_SUCCESS: OK } = require('../../utils/successMessages');

function normalizeItems(raw) {
    if (!Array.isArray(raw)) return [];
    const map = new Map();
    for (const row of raw) {
        const productId = Number(row?.productId);
        const quantity = Math.max(1, Number(row?.quantity) || 1);
        if (!productId) continue;
        map.set(productId, (map.get(productId) || 0) + quantity);
    }
    return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function parseBenefits(benefits) {
    if (Array.isArray(benefits)) {
        return benefits.map((b) => String(b).trim()).filter(Boolean);
    }
    if (typeof benefits === 'string') {
        return benefits
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}

function parseImageList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((u) => String(u || '').trim()).filter(Boolean);
}

async function assertProductsExist(items) {
    if (!items.length) {
        const err = new Error('At least one product is required in the package.');
        err.status = 400;
        throw err;
    }
    const ids = items.map((i) => i.productId);
    const products = await Product.find({ productId: { $in: ids }, status: { $ne: 'disabled' } });
    const found = new Set(products.map((p) => p.productId));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
        const err = new Error(`Products not found or disabled: ${missing.join(', ')}`);
        err.status = 400;
        throw err;
    }
    return products;
}

class PACKAGE_ADMIN {
    async createPackage(req, res) {
        try {
            const {
                name,
                description,
                benefits,
                amount,
                discounted_amount,
                bv,
                pv,
                items,
                status,
                images,
                description_images
            } = req.body;

            if (!name || String(name).trim() === '') {
                return res.status(400).json({ code: 400, message: 'Package name is required.' });
            }

            const normalizedItems = normalizeItems(items);
            await assertProductsExist(normalizedItems);

            const amountNum = Math.max(0, Number(amount) || 0);
            const discountedNum = Math.max(0, Number(discounted_amount) || 0);

            const pkg = new Package({
                name: String(name).trim(),
                description: description || '',
                images: parseImageList(images),
                description_images: parseImageList(description_images),
                benefits: parseBenefits(benefits),
                amount: amountNum,
                discounted_amount: discountedNum,
                price: discountedNum,
                bv: Math.max(0, Number(bv) || 0),
                pv: Math.max(0, Number(pv) || 0),
                items: normalizedItems,
                status: ['active', 'inactive', 'disabled'].includes(status) ? status : 'active',
                created_by: req.user?.uid || null
            });
            await pkg.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'CREATE_PACKAGE',
                target_type: 'package',
                target_id: pkg.packageId,
                ip: req.ip,
                meta: { name: pkg.name, discounted_amount: pkg.discounted_amount }
            });

            return res.status(201).json({ ...OK, message: 'Package created.', data: pkg });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async updatePackage(req, res) {
        try {
            const packageId = Number(req.body.packageId || req.params.packageId);
            if (!packageId) {
                return res.status(400).json({ code: 400, message: 'packageId is required.' });
            }

            const pkg = await Package.findOne({ packageId });
            if (!pkg) {
                return res.status(404).json({ code: 404, message: 'Package not found.' });
            }

            const {
                name,
                description,
                benefits,
                amount,
                discounted_amount,
                bv,
                pv,
                items,
                status,
                images,
                description_images
            } = req.body;

            if (name !== undefined) {
                if (!String(name).trim()) {
                    return res.status(400).json({ code: 400, message: 'Package name cannot be empty.' });
                }
                pkg.name = String(name).trim();
            }
            if (description !== undefined) pkg.description = description || '';
            if (images !== undefined) pkg.images = parseImageList(images);
            if (description_images !== undefined) pkg.description_images = parseImageList(description_images);
            if (benefits !== undefined) pkg.benefits = parseBenefits(benefits);
            if (amount !== undefined) pkg.amount = Math.max(0, Number(amount) || 0);
            if (discounted_amount !== undefined) {
                pkg.discounted_amount = Math.max(0, Number(discounted_amount) || 0);
                pkg.price = pkg.discounted_amount;
            }
            if (bv !== undefined) pkg.bv = Math.max(0, Number(bv) || 0);
            if (pv !== undefined) pkg.pv = Math.max(0, Number(pv) || 0);
            if (status !== undefined && ['active', 'inactive', 'disabled'].includes(status)) {
                pkg.status = status;
            }
            if (items !== undefined) {
                const normalizedItems = normalizeItems(items);
                await assertProductsExist(normalizedItems);
                pkg.items = normalizedItems;
            }

            pkg.updated_at = new Date();
            await pkg.save();

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'UPDATE_PACKAGE',
                target_type: 'package',
                target_id: pkg.packageId,
                ip: req.ip,
                meta: { name: pkg.name }
            });

            return res.status(200).json({ ...OK, message: 'Package updated.', data: pkg });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ code: error.status, message: error.message });
            }
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async toggleStatus(req, res) {
        try {
            const packageId = Number(req.body.packageId);
            const next = req.body.status;
            if (!packageId) {
                return res.status(400).json({ code: 400, message: 'packageId is required.' });
            }
            if (!['active', 'inactive', 'disabled'].includes(next)) {
                return res.status(400).json({ code: 400, message: 'status must be active, inactive, or disabled.' });
            }

            const pkg = await Package.findOneAndUpdate(
                { packageId },
                { $set: { status: next, updated_at: new Date() } },
                { new: true }
            );
            if (!pkg) {
                return res.status(404).json({ code: 404, message: 'Package not found.' });
            }

            await AuditService.log({
                actor_uid: req.user.uid,
                actor_role: req.user.role || 'admin',
                action: 'TOGGLE_PACKAGE_STATUS',
                target_type: 'package',
                target_id: pkg.packageId,
                ip: req.ip,
                meta: { status: pkg.status }
            });

            return res.status(200).json({ ...OK, message: 'Package status updated.', data: pkg });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getPackages(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.status) filter.status = req.query.status;
            else filter.status = { $ne: 'disabled' };
            if (req.query.search) {
                filter.name = { $regex: String(req.query.search), $options: 'i' };
            }

            const [list, total] = await Promise.all([
                Package.find(filter).sort({ packageId: -1 }).skip(skip).limit(limit),
                Package.countDocuments(filter)
            ]);

            const productIds = [...new Set(list.flatMap((p) => (p.items || []).map((i) => i.productId)))];
            const products = productIds.length
                ? await Product.find({ productId: { $in: productIds } }).select('productId product_name sku stock')
                : [];
            const productMap = Object.fromEntries(products.map((p) => [p.productId, p]));

            const data = list.map((pkg) => {
                const obj = pkg.toObject();
                return {
                    ...obj,
                    items: (obj.items || []).map((item) => ({
                        ...item,
                        product: productMap[item.productId] || null
                    }))
                };
            });

            return res.status(200).json({
                status: 200,
                message: 'Packages fetched.',
                data,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getPackage(req, res) {
        try {
            const packageId = Number(req.query.packageId || req.params.packageId);
            if (!packageId) {
                return res.status(400).json({ code: 400, message: 'packageId is required.' });
            }

            const pkg = await Package.findOne({ packageId });
            if (!pkg) {
                return res.status(404).json({ code: 404, message: 'Package not found.' });
            }

            const productIds = (pkg.items || []).map((i) => i.productId);
            const products = productIds.length
                ? await Product.find({ productId: { $in: productIds } }).select(
                    'productId product_name sku stock mrp distributor_price images'
                )
                : [];
            const productMap = Object.fromEntries(products.map((p) => [p.productId, p]));

            const data = {
                ...pkg.toObject(),
                items: (pkg.items || []).map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    product: productMap[item.productId] || null
                }))
            };

            return res.status(200).json({ status: 200, message: 'Package fetched.', data });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

module.exports = new PACKAGE_ADMIN();
