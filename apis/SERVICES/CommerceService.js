const Cart = require('../MODALS/Cart');
const Product = require('../MODALS/Product');
const Package = require('../MODALS/Package');
const CommerceOrder = require('../MODALS/CommerceOrder');
const Invoice = require('../MODALS/Invoice');
const StockHistory = require('../MODALS/StockHistory');
const Inventory = require('../MODALS/Inventory');
const ThemeUser = require('../MODALS/ThemeUser');
const CompanyInfo = require('../MODALS/CompanyInfo');
const Distributor = require('../MODALS/Distributor');
const Franchise = require('../MODALS/Franchise');
const PlansInfo = require('../MODALS/Plan');
const { ensurePlanData } = PlansInfo;
const Transaction = require('../MODALS/transactions');
const Action = require('./Activity');
const { getWalletBalance } = require('../utils/panelWallet');
const { errorLogger } = require('../utils/logger');

const FULFILLMENT_STATUSES = [
    'confirmed',
    'packed',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered'
];

const ORDER_TYPE_MAP = {
    distributor: 'distributor_purchase',
    franchise: 'franchise_purchase',
    theme: 'theme_purchase'
};

function priceForRole(product, role) {
    if (role === 'distributor') return product.distributor_price;
    if (role === 'franchise') return product.franchise_price;
    return product.mrp;
}

function calcItemTax(price, qty, gst) {
    const base = price * qty;
    const tax = (base * (Number(gst) || 0)) / 100;
    return { base, tax, total: base + tax };
}

class CommerceService {
    /**
     * Credit direct sponsor with BV% income when a distributor buys a package.
     * Percentage comes from plan_data.direct_income (default 15%).
     */
    async distributePackageDirectIncome({ buyer, packageBv, order, pkg }) {
        try {
            const bv = Math.max(0, Number(packageBv) || 0);
            if (bv <= 0 || !order?.orderId) return null;

            const sponsorUid = Number(buyer.sponsor_Id || buyer.sponsor_uid) || 0;
            if (!sponsorUid || sponsorUid === Number(buyer.uid)) return null;

            // Only distributor sponsors receive direct income into distributor wallets
            if (buyer.sponsor_type && buyer.sponsor_type !== 'distributor') return null;

            const sponsor = await Distributor.findOne({ uid: sponsorUid });
            if (!sponsor || sponsor.status === 'disabled' || Number(sponsor.blockStatus) === 1) {
                return null;
            }

            // Idempotent: skip if already credited for this order
            const alreadyPaid = await Transaction.findOne({
                uid: sponsorUid,
                order_Id: order.orderId,
                source: 'direct_income',
                status: { $ne: 2 }
            });
            if (alreadyPaid) return null;

            const plan = (await ensurePlanData()) || (await PlansInfo.findOne({ planId: 1 })) || (await PlansInfo.findOne());
            const setting = plan?.direct_income;
            if (!setting || Number(setting.status) === 0) return null;

            const percentOrFixed = Number(setting.amount) || 0;
            if (percentOrFixed <= 0) return null;

            let incomeAmount;
            if (setting.income_type === 'fixed') {
                incomeAmount = percentOrFixed;
            } else {
                incomeAmount = Math.round(((bv * percentOrFixed) / 100) * 100) / 100;
            }
            if (incomeAmount <= 0) return null;

            const incomePercent = setting.income_type === 'fixed' ? 0 : percentOrFixed;

            return Action.actInternally(sponsorUid, {
                amount: incomeAmount,
                activity_name: 'direct_income',
                Status: 1,
                to_from: buyer.uid,
                panel: 'distributor',
                order_Id: order.orderId,
                order_amount: order.grand_total,
                business: bv,
                income_percent: incomePercent,
                release: 1,
                note: `Direct income from ${buyer.username || buyer.uid} — ${pkg?.name || 'package'}`,
                metadata: {
                    buyer_uid: buyer.uid,
                    buyer_username: buyer.username || '',
                    packageId: pkg?.packageId,
                    package_name: pkg?.name,
                    package_bv: bv,
                    direct_income_percent: incomePercent,
                    order_number: order.order_number
                }
            });
        } catch (err) {
            errorLogger(err);
            return null;
        }
    }

    async resolveBuyer(role, uid) {
        if (role === 'franchise') {
            return Franchise.findOne({ uid }).select('-password');
        }
        if (role === 'distributor') {
            return Distributor.findOne({ uid }).select('-password');
        }
        if (role === 'theme') {
            return ThemeUser.findOne({ uid }).select('-password');
        }
        return null;
    }

    async getOrCreateCart(uid) {
        let cart = await Cart.findOne({ uid });
        if (!cart) {
            cart = await new Cart({ uid, items: [] }).save();
        }
        return cart;
    }

    async getCart(uid) {
        const cart = await this.getOrCreateCart(uid);
        return cart;
    }

    async addToCart(uid, role, { productId, quantity = 1 }) {
        const qty = Math.max(1, Number(quantity) || 1);
        const product = await Product.findOne({
            productId: Number(productId),
            status: 'enabled',
            is_hidden: false
        });
        if (!product) {
            const err = new Error('Product not found or not available.');
            err.status = 404;
            throw err;
        }
        if ((product.stock || 0) <= 0) {
            const err = new Error('Product is out of stock.');
            err.status = 400;
            throw err;
        }

        const cart = await this.getOrCreateCart(uid);
        const existing = cart.items.find((i) => i.productId === product.productId);
        const nextQty = existing ? existing.quantity + qty : qty;
        if (nextQty > product.stock) {
            const err = new Error(`Only ${product.stock} units available in stock.`);
            err.status = 400;
            throw err;
        }

        const price = priceForRole(product, role);
        if (existing) {
            existing.quantity = nextQty;
            existing.price = price;
            existing.product_name = product.product_name;
            existing.sku = product.sku;
            existing.image = product.images?.[0] || null;
        } else {
            cart.items.push({
                productId: product.productId,
                sku: product.sku,
                product_name: product.product_name,
                quantity: qty,
                price,
                image: product.images?.[0] || null
            });
        }
        cart.updated_at = new Date();
        await cart.save();
        return cart;
    }

    async updateCartItem(uid, role, { productId, quantity }) {
        const qty = Number(quantity);
        const cart = await this.getOrCreateCart(uid);
        const idx = cart.items.findIndex((i) => i.productId === Number(productId));
        if (idx === -1) {
            const err = new Error('Item not found in cart.');
            err.status = 404;
            throw err;
        }

        if (qty <= 0) {
            cart.items.splice(idx, 1);
            cart.updated_at = new Date();
            await cart.save();
            return cart;
        }

        const product = await Product.findOne({
            productId: Number(productId),
            status: 'enabled',
            is_hidden: false
        });
        if (!product) {
            const err = new Error('Product not found or not available.');
            err.status = 404;
            throw err;
        }
        if (qty > product.stock) {
            const err = new Error(`Only ${product.stock} units available in stock.`);
            err.status = 400;
            throw err;
        }

        cart.items[idx].quantity = qty;
        cart.items[idx].price = priceForRole(product, role);
        cart.items[idx].product_name = product.product_name;
        cart.items[idx].sku = product.sku;
        cart.updated_at = new Date();
        await cart.save();
        return cart;
    }

    async removeCartItem(uid, productId) {
        const cart = await this.getOrCreateCart(uid);
        cart.items = cart.items.filter((i) => i.productId !== Number(productId));
        cart.updated_at = new Date();
        await cart.save();
        return cart;
    }

    async clearCart(uid) {
        const cart = await this.getOrCreateCart(uid);
        cart.items = [];
        cart.updated_at = new Date();
        await cart.save();
        return cart;
    }

    async rollbackStock(decrements) {
        for (const d of decrements) {
            await Product.updateOne(
                { productId: d.productId },
                { $inc: { stock: d.quantity }, $set: { updated_at: new Date() } }
            );
        }
    }

    async checkout({ user, shipping_address = {}, idempotency_key, remark }) {
        const uid = user.uid;
        const role = user.role;
        if (!ORDER_TYPE_MAP[role]) {
            const err = new Error('Invalid buyer role for checkout.');
            err.status = 403;
            throw err;
        }

        if (idempotency_key) {
            const existing = await CommerceOrder.findOne({ idempotency_key: String(idempotency_key) });
            if (existing) {
                const invoice = await Invoice.findOne({ orderId: existing.orderId });
                return { order: existing, invoice, duplicate: true };
            }
        }

        const cart = await this.getOrCreateCart(uid);
        if (!cart.items || cart.items.length === 0) {
            const err = new Error('Cart is empty.');
            err.status = 400;
            throw err;
        }

        const decrements = [];
        const orderItems = [];
        let subtotal = 0;
        let taxTotal = 0;

        try {
            for (const item of cart.items) {
                const qty = Number(item.quantity) || 0;
                if (qty <= 0) {
                    const err = new Error('Invalid cart quantity.');
                    err.status = 400;
                    throw err;
                }

                const updated = await Product.findOneAndUpdate(
                    {
                        productId: item.productId,
                        status: 'enabled',
                        is_hidden: false,
                        stock: { $gte: qty }
                    },
                    { $inc: { stock: -qty }, $set: { updated_at: new Date() } },
                    { new: true }
                );

                if (!updated) {
                    const current = await Product.findOne({ productId: item.productId });
                    const available = current ? current.stock : 0;
                    const name = current?.product_name || item.product_name;
                    const err = new Error(
                        current && current.is_hidden
                            ? `${name} is no longer available.`
                            : `Insufficient stock for ${name}. Available: ${available}.`
                    );
                    err.status = 409;
                    throw err;
                }

                decrements.push({ productId: updated.productId, quantity: qty, sku: updated.sku, previous: updated.stock + qty, next: updated.stock });

                const price = priceForRole(updated, role);
                const { base, tax, total } = calcItemTax(price, qty, updated.gst);
                subtotal += base;
                taxTotal += tax;
                orderItems.push({
                    productId: updated.productId,
                    sku: updated.sku,
                    product_name: updated.product_name,
                    quantity: qty,
                    price,
                    gst: updated.gst || 0,
                    discount: 0,
                    tax,
                    total
                });
            }

            const buyer = await this.resolveBuyer(role, uid);
            let franchiseId = user.franchiseId || null;
            let distributorId = user.distributorId || null;
            if (role === 'franchise' && !franchiseId) {
                const fr = await Franchise.findOne({ uid });
                franchiseId = fr?.franchiseId || null;
            }
            if (role === 'distributor' && !distributorId) {
                const dist = await Distributor.findOne({ uid });
                distributorId = dist?.distributorId || null;
            }

            const buyerName = buyer?.owner_name || buyer?.name || '';
            const buyerMobile = buyer?.mobile || '';

            const grand_total = subtotal + taxTotal;
            const order = new CommerceOrder({
                order_type: ORDER_TYPE_MAP[role],
                buyer_uid: uid,
                buyer_role: role,
                franchiseId,
                distributorId,
                items: orderItems,
                subtotal,
                discount: 0,
                tax: taxTotal,
                grand_total,
                payment_status: 'pending',
                order_status: 'pending',
                dispatch_status: 'pending',
                shipping_address: {
                    name: shipping_address.name || buyerName,
                    mobile: shipping_address.mobile || buyerMobile,
                    line1: shipping_address.line1 || '',
                    line2: shipping_address.line2 || '',
                    city: shipping_address.city || '',
                    state: shipping_address.state || '',
                    pincode: shipping_address.pincode || '',
                    country: shipping_address.country || 'India'
                },
                idempotency_key: idempotency_key ? String(idempotency_key) : undefined,
                timeline: [{
                    status: 'pending',
                    remark: remark || 'Order placed',
                    updated_by: uid,
                    updated_by_role: role,
                    updated_by_name: buyer?.name || buyer?.username || '',
                    updated_at: new Date()
                }]
            });

            await order.save();

            const company = await CompanyInfo.findOne({}) || {};
            const invoice = new Invoice({
                orderId: order.orderId,
                order_number: order.order_number,
                customer_uid: uid,
                customer_role: role,
                customer_details: {
                    name: buyer?.name || '',
                    email: buyer?.email || '',
                    mobile: buyer?.mobile || '',
                    address: [
                        order.shipping_address.line1,
                        order.shipping_address.line2,
                        order.shipping_address.city,
                        order.shipping_address.state,
                        order.shipping_address.pincode
                    ].filter(Boolean).join(', '),
                    gst_number: ''
                },
                company_details: {
                    name: company.companyName || '',
                    email: company.contactInfo?.email || '',
                    mobile: company.contactInfo?.phone || '',
                    address: [
                        company.address?.street,
                        company.address?.city,
                        company.address?.state,
                        company.address?.postalCode
                    ].filter(Boolean).join(', '),
                    gst_number: company.taxInfo?.gst || company.taxInfo?.gstin || '',
                    logo: null
                },
                items: orderItems,
                subtotal,
                discount: 0,
                tax: taxTotal,
                gst: taxTotal,
                grand_total,
                payment_status: 'pending',
                dispatch_status: 'pending'
            });
            await invoice.save();

            order.invoice_number = invoice.invoice_number;
            await order.save();

            for (const d of decrements) {
                await new StockHistory({
                    scope: 'admin',
                    productId: d.productId,
                    sku: d.sku,
                    action: 'order',
                    quantity: d.quantity,
                    previous_available: d.previous,
                    new_available: d.next,
                    reference_type: 'order',
                    reference_id: order.order_number,
                    remark: `Order ${order.order_number}`,
                    created_by: uid
                }).save();
            }

            cart.items = [];
            cart.updated_at = new Date();
            await cart.save();

            return { order, invoice, duplicate: false };
        } catch (error) {
            if (decrements.length) {
                try {
                    await this.rollbackStock(decrements);
                } catch (rbErr) {
                    errorLogger(rbErr);
                }
            }
            // Idempotency race: another request created the order
            if (error?.code === 11000 && idempotency_key) {
                const existing = await CommerceOrder.findOne({ idempotency_key: String(idempotency_key) });
                if (existing) {
                    const invoice = await Invoice.findOne({ orderId: existing.orderId });
                    return { order: existing, invoice, duplicate: true };
                }
            }
            throw error;
        }
    }

    async listPackagesForDistributor({ page = 1, limit = 20, packageId = null } = {}) {
        const filter = { status: 'active' };
        if (packageId) filter.packageId = Number(packageId);

        if (packageId) {
            const pkg = await Package.findOne(filter);
            if (!pkg) {
                const err = new Error('Package not found.');
                err.status = 404;
                throw err;
            }
            return { data: await this.enrichPackage(pkg), pagination: null };
        }

        const skip = (page - 1) * limit;
        const [list, total] = await Promise.all([
            Package.find(filter).sort({ packageId: 1 }).skip(skip).limit(limit),
            Package.countDocuments(filter)
        ]);
        const data = await Promise.all(list.map((pkg) => this.enrichPackage(pkg)));
        return {
            data,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
        };
    }

    async enrichPackage(pkg) {
        const obj = pkg.toObject ? pkg.toObject() : { ...pkg };
        const productIds = (obj.items || []).map((i) => i.productId);
        const products = productIds.length
            ? await Product.find({
                productId: { $in: productIds },
                status: 'enabled',
                is_hidden: false
            }).select('productId product_name sku stock images distributor_price mrp')
            : [];
        const productMap = Object.fromEntries(products.map((p) => [p.productId, p.toObject({ virtuals: true })]));
        const items = (obj.items || []).map((item) => {
            const product = productMap[item.productId] || null;
            const available = product ? Number(product.stock) || 0 : 0;
            return {
                productId: item.productId,
                quantity: item.quantity,
                product,
                in_stock: Boolean(product) && available >= item.quantity
            };
        });
        const allInStock = items.length > 0 && items.every((i) => i.in_stock);
        return {
            ...obj,
            items,
            in_stock: allInStock,
            amount: Number(obj.amount) || 0,
            discounted_amount: Number(obj.discounted_amount != null ? obj.discounted_amount : obj.price) || 0,
            bv: Number(obj.bv) || 0,
            pv: Number(obj.pv) || 0
        };
    }

    async purchasePackage({ user, packageId, shipping_address = {}, idempotency_key, remark }) {
        if (user?.role !== 'distributor') {
            const err = new Error('Only distributors can purchase packages.');
            err.status = 403;
            throw err;
        }

        const uid = user.uid;
        const pkgId = Number(packageId);
        if (!pkgId) {
            const err = new Error('packageId is required.');
            err.status = 400;
            throw err;
        }

        if (idempotency_key) {
            const existing = await CommerceOrder.findOne({ idempotency_key: String(idempotency_key) });
            if (existing) {
                const invoice = await Invoice.findOne({ orderId: existing.orderId });
                return { order: existing, invoice, duplicate: true };
            }
        }

        const pkg = await Package.findOne({ packageId: pkgId, status: 'active' });
        if (!pkg) {
            const err = new Error('Package not found or not available.');
            err.status = 404;
            throw err;
        }
        if (!pkg.items || pkg.items.length === 0) {
            const err = new Error('Package has no products configured.');
            err.status = 400;
            throw err;
        }

        const distributor = await Distributor.findOne({ uid });
        if (!distributor) {
            const err = new Error('Distributor not found.');
            err.status = 404;
            throw err;
        }
        if (distributor.status === 'disabled' || distributor.blockStatus === 1) {
            const err = new Error('Your account is disabled and cannot purchase packages.');
            err.status = 403;
            throw err;
        }

        const discountedAmount = Math.max(0, Number(pkg.discounted_amount != null ? pkg.discounted_amount : pkg.price) || 0);
        const listAmount = Math.max(0, Number(pkg.amount) || discountedAmount);
        const packageDiscount = Math.max(0, listAmount - discountedAmount);
        const packageBv = Math.max(0, Number(pkg.bv) || 0);
        const packagePv = Math.max(0, Number(pkg.pv) || 0);

        // Package purchase requires sufficient fund wallet balance
        const fundBalance = await getWalletBalance('distributor', uid, 'fund_wallet');
        if (fundBalance < discountedAmount) {
            const err = new Error(
                `Insufficient fund wallet balance. Required: ₹${discountedAmount.toFixed(2)}, Available: ₹${fundBalance.toFixed(2)}.`
            );
            err.status = 400;
            throw err;
        }

        const decrements = [];
        const orderItems = [];

        try {
            // Load products for proportional line pricing
            const productIds = pkg.items.map((i) => i.productId);
            const products = await Product.find({ productId: { $in: productIds } });
            const productMap = Object.fromEntries(products.map((p) => [p.productId, p]));

            let catalogSubtotal = 0;
            const lineBases = [];
            for (const item of pkg.items) {
                const product = productMap[item.productId];
                if (!product || product.status !== 'enabled' || product.is_hidden) {
                    const err = new Error(
                        `Product ${item.productId} in package is not available.`
                    );
                    err.status = 400;
                    throw err;
                }
                const qty = Math.max(1, Number(item.quantity) || 1);
                const unit = Number(product.distributor_price) || 0;
                const base = unit * qty;
                catalogSubtotal += base;
                lineBases.push({ product, qty, unit, base });
            }

            for (const line of lineBases) {
                const updated = await Product.findOneAndUpdate(
                    {
                        productId: line.product.productId,
                        status: 'enabled',
                        is_hidden: false,
                        stock: { $gte: line.qty }
                    },
                    { $inc: { stock: -line.qty }, $set: { updated_at: new Date() } },
                    { new: true }
                );

                if (!updated) {
                    const current = await Product.findOne({ productId: line.product.productId });
                    const available = current ? current.stock : 0;
                    const name = current?.product_name || `Product ${line.product.productId}`;
                    const err = new Error(
                        `Insufficient stock for ${name}. Available: ${available}.`
                    );
                    err.status = 409;
                    throw err;
                }

                decrements.push({
                    productId: updated.productId,
                    quantity: line.qty,
                    sku: updated.sku,
                    previous: updated.stock + line.qty,
                    next: updated.stock
                });

                // Proportional share of package discounted total; no GST on package v1
                const share = catalogSubtotal > 0 ? line.base / catalogSubtotal : 1 / lineBases.length;
                const lineTotal = Math.round(discountedAmount * share * 100) / 100;
                const unitPrice = Math.round((lineTotal / line.qty) * 100) / 100;

                orderItems.push({
                    productId: updated.productId,
                    sku: updated.sku,
                    product_name: updated.product_name,
                    quantity: line.qty,
                    price: unitPrice,
                    gst: 0,
                    discount: 0,
                    tax: 0,
                    total: lineTotal
                });
            }

            // Fix rounding so line totals sum to discountedAmount
            const itemsSum = orderItems.reduce((s, i) => s + i.total, 0);
            const diff = Math.round((discountedAmount - itemsSum) * 100) / 100;
            if (orderItems.length && diff !== 0) {
                orderItems[orderItems.length - 1].total =
                    Math.round((orderItems[orderItems.length - 1].total + diff) * 100) / 100;
            }

            const order = new CommerceOrder({
                order_type: 'distributor_package_purchase',
                buyer_uid: uid,
                buyer_role: 'distributor',
                franchiseId: null,
                distributorId: distributor.distributorId || null,
                packageId: pkg.packageId,
                package_name: pkg.name,
                bv: packageBv,
                pv: packagePv,
                items: orderItems,
                subtotal: listAmount,
                discount: packageDiscount,
                tax: 0,
                grand_total: discountedAmount,
                payment_status: 'pending',
                order_status: 'pending',
                dispatch_status: 'pending',
                shipping_address: {
                    name: shipping_address.name || distributor.name || '',
                    mobile: shipping_address.mobile || distributor.mobile || '',
                    line1: shipping_address.line1 || distributor.address?.line1 || '',
                    line2: shipping_address.line2 || distributor.address?.line2 || '',
                    city: shipping_address.city || distributor.address?.city || '',
                    state: shipping_address.state || distributor.address?.state || '',
                    pincode: shipping_address.pincode || distributor.address?.pincode || '',
                    country: shipping_address.country || distributor.address?.country || 'India'
                },
                idempotency_key: idempotency_key ? String(idempotency_key) : undefined,
                timeline: [{
                    status: 'pending',
                    remark: remark || `Package purchased: ${pkg.name}`,
                    updated_by: uid,
                    updated_by_role: 'distributor',
                    updated_by_name: distributor.name || distributor.username || '',
                    updated_at: new Date()
                }]
            });

            await order.save();

            const company = await CompanyInfo.findOne({}) || {};
            const invoice = new Invoice({
                orderId: order.orderId,
                order_number: order.order_number,
                customer_uid: uid,
                customer_role: 'distributor',
                customer_details: {
                    name: distributor.name || '',
                    email: distributor.email || '',
                    mobile: distributor.mobile || '',
                    address: [
                        order.shipping_address.line1,
                        order.shipping_address.line2,
                        order.shipping_address.city,
                        order.shipping_address.state,
                        order.shipping_address.pincode
                    ].filter(Boolean).join(', '),
                    gst_number: ''
                },
                company_details: {
                    name: company.companyName || '',
                    email: company.contactInfo?.email || '',
                    mobile: company.contactInfo?.phone || '',
                    address: [
                        company.address?.street,
                        company.address?.city,
                        company.address?.state,
                        company.address?.postalCode
                    ].filter(Boolean).join(', '),
                    gst_number: company.taxInfo?.gst || company.taxInfo?.gstin || '',
                    logo: null
                },
                items: orderItems,
                subtotal: listAmount,
                discount: packageDiscount,
                tax: 0,
                gst: 0,
                grand_total: discountedAmount,
                payment_status: 'pending',
                dispatch_status: 'pending'
            });
            await invoice.save();

            order.invoice_number = invoice.invoice_number;
            await order.save();

            // Debit fund wallet for package amount
            if (discountedAmount > 0) {
                const savedTx = await Action.actInternally(uid, {
                    amount: discountedAmount,
                    activity_name: 'package_purchase',
                    Status: 1,
                    to_from: 'package',
                    panel: 'distributor',
                    order_Id: order.orderId,
                    order_amount: discountedAmount,
                    release: 1,
                    note: remark || `Package purchased: ${pkg.name}`,
                    metadata: {
                        packageId: pkg.packageId,
                        package_name: pkg.name,
                        order_number: order.order_number
                    }
                });

                if (!savedTx || !savedTx.length) {
                    order.payment_status = 'failed';
                    order.order_status = 'cancelled';
                    order.dispatch_status = 'cancelled';
                    order.timeline.push({
                        status: 'cancelled',
                        remark: 'Payment failed: insufficient fund wallet balance',
                        updated_by: uid,
                        updated_by_role: 'distributor',
                        updated_by_name: distributor.name || distributor.username || '',
                        updated_at: new Date()
                    });
                    await order.save();
                    invoice.payment_status = 'failed';
                    await invoice.save();

                    const err = new Error(
                        `Insufficient fund wallet balance. Required: ₹${discountedAmount.toFixed(2)}.`
                    );
                    err.status = 400;
                    throw err;
                }
            }

            order.payment_status = 'received';
            order.order_status = 'confirmed';
            order.timeline.push({
                status: 'confirmed',
                remark: `Paid ₹${discountedAmount.toFixed(2)} from fund wallet`,
                updated_by: uid,
                updated_by_role: 'distributor',
                updated_by_name: distributor.name || distributor.username || '',
                updated_at: new Date()
            });
            await order.save();

            invoice.payment_status = 'received';
            await invoice.save();

            for (const d of decrements) {
                await new StockHistory({
                    scope: 'admin',
                    productId: d.productId,
                    sku: d.sku,
                    action: 'order',
                    quantity: d.quantity,
                    previous_available: d.previous,
                    new_available: d.next,
                    reference_type: 'order',
                    reference_id: order.order_number,
                    remark: `Package order ${order.order_number} (${pkg.name})`,
                    created_by: uid
                }).save();
            }

            // Activate distributor immediately on package purchase
            const activationUpdate = {
                status: 'active',
                activated_package_id: pkg.packageId,
                package_bv: packageBv,
                package_pv: packagePv
            };
            if (!distributor.activation_date) {
                activationUpdate.activation_date = new Date();
            }
            await Distributor.updateOne(
                { uid, status: { $ne: 'disabled' } },
                { $set: activationUpdate }
            );

            // Direct income → sponsor gets plan_data.direct_income % of package BV
            await this.distributePackageDirectIncome({
                buyer: distributor,
                packageBv,
                order,
                pkg
            });

            const refreshed = await Distributor.findOne({ uid }).select('-password');

            return {
                order,
                invoice,
                duplicate: false,
                distributor: refreshed
            };
        } catch (error) {
            if (decrements.length) {
                try {
                    await this.rollbackStock(decrements);
                } catch (rbErr) {
                    errorLogger(rbErr);
                }
            }
            if (error?.code === 11000 && idempotency_key) {
                const existing = await CommerceOrder.findOne({ idempotency_key: String(idempotency_key) });
                if (existing) {
                    const invoice = await Invoice.findOne({ orderId: existing.orderId });
                    return { order: existing, invoice, duplicate: true };
                }
            }
            throw error;
        }
    }

    /**
     * Credit franchise warehouse Inventory when admin confirms (or jumps past pending).
     * Idempotent via order.franchise_stock_credited.
     */
    async creditFranchiseInventory(order, actorUid = null) {
        if (!order || order.order_type !== 'franchise_purchase') {
            return { credited: false, reason: 'not_franchise_purchase' };
        }
        if (order.franchise_stock_credited) {
            return { credited: false, reason: 'already_credited' };
        }
        if (!FULFILLMENT_STATUSES.includes(order.order_status)) {
            return { credited: false, reason: 'not_fulfillment_status' };
        }

        let franchiseId = order.franchiseId;
        let franchiseUid = order.buyer_uid;
        if (!franchiseId) {
            const fr = await Franchise.findOne({ uid: order.buyer_uid });
            franchiseId = fr?.franchiseId || null;
            if (fr?.uid) franchiseUid = fr.uid;
        }
        if (!franchiseId) {
            const err = new Error('Franchise ID missing on order; cannot credit inventory.');
            err.statusCode = 400;
            throw err;
        }

        for (const item of order.items || []) {
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) continue;

            let inv = await Inventory.findOne({ franchiseId, productId: item.productId });
            const previous = inv ? Number(inv.available_stock) || 0 : 0;

            if (!inv) {
                inv = await new Inventory({
                    franchiseId,
                    franchise_uid: franchiseUid,
                    productId: item.productId,
                    sku: item.sku,
                    available_stock: qty,
                    purchased_stock: qty,
                    status: 'active'
                }).save();
            } else {
                inv = await Inventory.findOneAndUpdate(
                    { franchiseId, productId: item.productId },
                    {
                        $inc: { available_stock: qty, purchased_stock: qty },
                        $set: { sku: item.sku || inv.sku, updated_at: new Date() }
                    },
                    { new: true }
                );
            }

            await new StockHistory({
                scope: 'franchise',
                franchiseId,
                franchise_uid: franchiseUid,
                productId: item.productId,
                sku: item.sku,
                action: 'purchase',
                quantity: qty,
                previous_available: previous,
                new_available: inv.available_stock,
                reference_type: 'order',
                reference_id: order.order_number,
                remark: `Stock purchased — order ${order.order_number} confirmed`,
                created_by: actorUid
            }).save();
        }

        order.franchise_stock_credited = true;
        if (franchiseId && !order.franchiseId) {
            order.franchiseId = franchiseId;
        }

        return { credited: true };
    }

    /**
     * Reverse franchise Inventory credit when a credited order is cancelled.
     * Rejects if franchise no longer has enough available stock.
     */
    async debitFranchiseInventoryOnCancel(order, actorUid = null) {
        if (!order || order.order_type !== 'franchise_purchase') {
            return { debited: false, reason: 'not_franchise_purchase' };
        }
        if (!order.franchise_stock_credited) {
            return { debited: false, reason: 'not_credited' };
        }

        let franchiseId = order.franchiseId;
        let franchiseUid = order.buyer_uid;
        if (!franchiseId) {
            const fr = await Franchise.findOne({ uid: order.buyer_uid });
            franchiseId = fr?.franchiseId || null;
            if (fr?.uid) franchiseUid = fr.uid;
        }
        if (!franchiseId) {
            const err = new Error('Franchise ID missing on order; cannot reverse inventory.');
            err.statusCode = 400;
            throw err;
        }

        // Pre-check all items have enough available stock
        for (const item of order.items || []) {
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) continue;
            const inv = await Inventory.findOne({ franchiseId, productId: item.productId });
            const available = inv ? Number(inv.available_stock) || 0 : 0;
            if (available < qty) {
                const err = new Error(
                    `Cannot cancel: franchise inventory for ${item.product_name || item.sku} ` +
                    `has only ${available} available (need ${qty}).`
                );
                err.statusCode = 400;
                throw err;
            }
        }

        for (const item of order.items || []) {
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) continue;

            const inv = await Inventory.findOneAndUpdate(
                { franchiseId, productId: item.productId, available_stock: { $gte: qty } },
                {
                    $inc: { available_stock: -qty, purchased_stock: -qty },
                    $set: { updated_at: new Date() }
                },
                { new: true }
            );

            if (!inv) {
                const err = new Error(
                    `Cannot cancel: insufficient franchise inventory for ${item.product_name || item.sku}.`
                );
                err.statusCode = 400;
                throw err;
            }

            await new StockHistory({
                scope: 'franchise',
                franchiseId,
                franchise_uid: franchiseUid,
                productId: item.productId,
                sku: item.sku,
                action: 'cancel',
                quantity: qty,
                previous_available: inv.available_stock + qty,
                new_available: inv.available_stock,
                reference_type: 'order',
                reference_id: order.order_number,
                remark: `Stock reversed — order ${order.order_number} cancelled`,
                created_by: actorUid
            }).save();
        }

        order.franchise_stock_credited = false;
        return { debited: true };
    }
}

module.exports = new CommerceService();
module.exports.priceForRole = priceForRole;
module.exports.ORDER_TYPE_MAP = ORDER_TYPE_MAP;
module.exports.FULFILLMENT_STATUSES = FULFILLMENT_STATUSES;
