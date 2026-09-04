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
const { errorLogger } = require('../utils/logger');
const Email = require('./SendEmail');
const sms = require('./SmsService');

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

function absoluteMediaUrl(pathValue) {
    if (!pathValue) return null;
    const raw = String(pathValue).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
    const base = String(process.env.API_URL || process.env.BASE_URL || '')
        .trim()
        .replace(/\/$/, '');
    // Snapshot stores path for reference; live render embeds via InvoiceDocument.
    const pathPart = raw.startsWith('/') ? raw : `/${raw}`;
    if (base && !/slotegrator|bharatbatteries\.info/i.test(base)) {
        return `${base}${pathPart}`;
    }
    return pathPart;
}

async function getCompanyGstPercent() {
    try {
        const company = await CompanyInfo.findOne({}).lean();
        const rate = Number(company?.taxInfo?.gst_percent);
        return Number.isFinite(rate) && rate > 0 ? rate : 0;
    } catch (_) {
        return 0;
    }
}

async function resolveCompanySnapshot() {
    const company = (await CompanyInfo.findOne({})) || {};
    let site = null;
    try {
        const WebsiteContent = require('../MODALS/WebsiteContent');
        site = await WebsiteContent.findOne({}).lean();
    } catch (_) {
        site = null;
    }
    const siteName = site?.name || '';
    const rawName = company.companyName || '';
    const name = /bharat\s*batter/i.test(rawName)
        ? (siteName || 'Arogya Green Life')
        : (rawName || siteName || 'Arogya Green Life');

    const structuredAddress = [
        company.address?.street,
        company.address?.city,
        company.address?.state,
        company.address?.postalCode,
        company.address?.country
    ].filter(Boolean).join(', ');

    const websiteRaw = company.contactInfo?.website || site?.contact?.website || '';
    const website = /bharatbatteries/i.test(websiteRaw)
        ? (site?.contact?.website || 'https://arogyagreenlife.com')
        : websiteRaw;

    return {
        name,
        email: company.contactInfo?.email || site?.contact?.email || '',
        mobile: company.contactInfo?.phone || site?.contact?.phone || '',
        website,
        address: structuredAddress || site?.contact?.address || '',
        gst_number: company.taxInfo?.gst || company.taxInfo?.gstin || '',
        pan: company.taxInfo?.pan || '',
        gst_percent: Number(company.taxInfo?.gst_percent) || 0,
        logo: absoluteMediaUrl(site?.logo || null)
    };
}

function defaultManualPayment() {
    return {
        mode: 'manual',
        utr: '',
        proofUrl: '',
        submitted_at: null,
        status: 'none',
        verified_by: null,
        verified_at: null,
        remark: ''
    };
}

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

/** Split a GST-inclusive amount into taxable base + tax (package prices are tax-inclusive). */
function calcInclusiveSplit(inclusiveAmount, gstPercent) {
    const inclusive = Math.round((Number(inclusiveAmount) || 0) * 100) / 100;
    const rate = Number(gstPercent) || 0;
    if (inclusive <= 0) {
        return { base: 0, tax: 0, total: 0 };
    }
    if (rate <= 0) {
        return { base: inclusive, tax: 0, total: inclusive };
    }
    const base = Math.round((inclusive / (1 + rate / 100)) * 100) / 100;
    const tax = Math.round((inclusive - base) * 100) / 100;
    return { base, tax, total: inclusive };
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
        let orderBv = 0;
        const companyGstPercent = await getCompanyGstPercent();

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
                const gstRate = companyGstPercent > 0 ? companyGstPercent : (Number(updated.gst) || 0);
                const { base, tax, total } = calcItemTax(price, qty, gstRate);
                subtotal += base;
                taxTotal += tax;
                if (role === 'distributor') {
                    orderBv += (Math.max(0, Number(updated.bv) || 0) * qty);
                }
                orderItems.push({
                    productId: updated.productId,
                    sku: updated.sku,
                    product_name: updated.product_name,
                    hsn_code: updated.hsn_code || '',
                    quantity: qty,
                    price,
                    gst: gstRate,
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
            const roundedOrderBv = Math.round((orderBv || 0) * 100) / 100;
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
                bv: role === 'distributor' ? roundedOrderBv : 0,
                payment_status: 'pending',
                payment: defaultManualPayment(),
                order_status: 'pending',
                dispatch_status: 'pending',
                repurchase_bv_credited: false,
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
                    status: 'order_placed',
                    remark: remark || 'Order placed — awaiting payment',
                    updated_by: uid,
                    updated_by_role: role,
                    updated_by_name: buyer?.name || buyer?.username || '',
                    updated_at: new Date()
                }]
            });

            await order.save();

            const companyDetails = await resolveCompanySnapshot();
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
                company_details: companyDetails,
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

            try {
                const to = invoice?.customer_details?.email;
                if (to) {
                    await Email.sendOrderPlaced({
                        email: to,
                        name: invoice.customer_details?.name,
                        order,
                        invoice
                    });
                }
            } catch (mailErr) {
                errorLogger(mailErr);
            }

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
        const packageBv = Math.max(0, Number(pkg.bv) || 0);
        const packagePv = Math.max(0, Number(pkg.pv) || 0);
        const companyGstPercent = await getCompanyGstPercent();

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

                // Package price is GST-inclusive; rate comes from admin company GST %.
                const share = catalogSubtotal > 0 ? line.base / catalogSubtotal : 1 / lineBases.length;
                const gstRate = companyGstPercent;
                const payInclusive = Math.round(discountedAmount * share * 100) / 100;
                const listInclusive = Math.round(listAmount * share * 100) / 100;
                const paySplit = calcInclusiveSplit(payInclusive, gstRate);
                const listSplit = calcInclusiveSplit(listInclusive, gstRate);
                const unitPrice = line.qty > 0
                    ? Math.round((paySplit.base / line.qty) * 100) / 100
                    : paySplit.base;

                orderItems.push({
                    productId: updated.productId,
                    sku: updated.sku,
                    product_name: updated.product_name,
                    hsn_code: updated.hsn_code || '',
                    quantity: line.qty,
                    price: unitPrice,
                    gst: gstRate,
                    discount: 0,
                    tax: paySplit.tax,
                    total: paySplit.total,
                    _listBase: listSplit.base,
                    _payBase: paySplit.base
                });
            }

            // Fix rounding so inclusive line totals sum to discountedAmount
            const itemsSum = orderItems.reduce((s, i) => s + i.total, 0);
            const diff = Math.round((discountedAmount - itemsSum) * 100) / 100;
            if (orderItems.length && diff !== 0) {
                const last = orderItems[orderItems.length - 1];
                last.total = Math.round((last.total + diff) * 100) / 100;
                const reSplit = calcInclusiveSplit(last.total, last.gst);
                last.tax = reSplit.tax;
                last._payBase = reSplit.base;
                last.price = last.quantity > 0
                    ? Math.round((reSplit.base / last.quantity) * 100) / 100
                    : reSplit.base;
            }

            const taxableSubtotal = Math.round(
                orderItems.reduce((s, i) => s + (Number(i._listBase) || 0), 0) * 100
            ) / 100;
            const taxablePay = Math.round(
                orderItems.reduce((s, i) => s + (Number(i._payBase) || 0), 0) * 100
            ) / 100;
            const taxTotal = Math.round(
                orderItems.reduce((s, i) => s + (Number(i.tax) || 0), 0) * 100
            ) / 100;
            const exclusiveDiscount = Math.max(0, Math.round((taxableSubtotal - taxablePay) * 100) / 100);

            for (const item of orderItems) {
                delete item._listBase;
                delete item._payBase;
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
                subtotal: taxableSubtotal,
                discount: exclusiveDiscount,
                tax: taxTotal,
                grand_total: discountedAmount,
                payment_status: 'pending',
                payment: defaultManualPayment(),
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
                    status: 'order_placed',
                    remark: remark || `Package order placed: ${pkg.name} — awaiting payment`,
                    updated_by: uid,
                    updated_by_role: 'distributor',
                    updated_by_name: distributor.name || distributor.username || '',
                    updated_at: new Date()
                }]
            });

            await order.save();

            const companyDetails = await resolveCompanySnapshot();
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
                company_details: companyDetails,
                items: orderItems,
                subtotal: taxableSubtotal,
                discount: exclusiveDiscount,
                tax: taxTotal,
                gst: taxTotal,
                grand_total: discountedAmount,
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
                    remark: `Package order ${order.order_number} (${pkg.name}) — awaiting payment`,
                    created_by: uid
                }).save();
            }

            try {
                const to = invoice?.customer_details?.email;
                if (to) {
                    await Email.sendOrderPlaced({
                        email: to,
                        name: invoice.customer_details?.name,
                        order,
                        invoice
                    });
                }
            } catch (mailErr) {
                errorLogger(mailErr);
            }

            return {
                order,
                invoice,
                duplicate: false,
                distributor: null
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
     * Buyer submits UTR + proof screenshot for a pending order.
     */
    async submitOrderPayment({ user, orderId, utr, proofUrl }) {
        const oid = Number(orderId);
        const cleanUtr = String(utr || '').trim();
        if (!oid) {
            const err = new Error('orderId is required.');
            err.status = 400;
            throw err;
        }
        if (!cleanUtr) {
            const err = new Error('UTR ID is required.');
            err.status = 400;
            throw err;
        }
        if (!proofUrl) {
            const err = new Error('Payment proof image is required.');
            err.status = 400;
            throw err;
        }

        const order = await CommerceOrder.findOne({
            orderId: oid,
            buyer_uid: user.uid,
            buyer_role: user.role
        });
        if (!order) {
            const err = new Error('Order not found.');
            err.status = 404;
            throw err;
        }
        if (order.order_status !== 'pending') {
            const err = new Error('Payment can only be submitted for pending orders.');
            err.status = 400;
            throw err;
        }
        if (order.payment?.status === 'verified' || order.payment_status === 'received') {
            const err = new Error('Payment already verified for this order.');
            err.status = 400;
            throw err;
        }
        if (order.payment?.status === 'submitted') {
            const err = new Error('Payment proof already submitted. Waiting for admin verification.');
            err.status = 400;
            throw err;
        }

        const utrTaken = await CommerceOrder.findOne({
            'payment.utr': cleanUtr,
            orderId: { $ne: oid }
        });
        if (utrTaken) {
            const err = new Error('This UTR has already been submitted on another order.');
            err.status = 400;
            throw err;
        }

        if (!order.payment) order.payment = defaultManualPayment();
        order.payment.mode = 'manual';
        order.payment.utr = cleanUtr;
        order.payment.proofUrl = proofUrl;
        order.payment.submitted_at = new Date();
        order.payment.status = 'submitted';
        order.payment.remark = '';
        order.payment.verified_by = null;
        order.payment.verified_at = null;
        order.payment_status = 'pending';
        order.markModified('payment');
        order.timeline.push({
            status: 'payment_submitted',
            remark: `Payment proof submitted (UTR: ${cleanUtr})`,
            updated_by: user.uid,
            updated_by_role: user.role,
            updated_by_name: user.username || user.name || '',
            updated_at: new Date()
        });
        await order.save();

        return order;
    }

    /**
     * Activate package + direct income after admin verifies payment.
     */
    async finalizePackageOrder(order, actor = {}) {
        if (!order || order.order_type !== 'distributor_package_purchase') {
            return { finalized: false, reason: 'not_package' };
        }

        const distributor = await Distributor.findOne({ uid: order.buyer_uid });
        if (!distributor) {
            const err = new Error('Distributor not found for package finalization.');
            err.status = 404;
            throw err;
        }

        const pkg = order.packageId
            ? await Package.findOne({ packageId: order.packageId })
            : null;
        const packageBv = Math.max(0, Number(order.bv) || 0);
        const packagePv = Math.max(0, Number(order.pv) || 0);

        const activationUpdate = {
            status: 'active',
            activated_package_id: order.packageId,
            package_bv: packageBv,
            package_pv: packagePv
        };
        if (!distributor.activation_date) {
            activationUpdate.activation_date = new Date();
        }
        await Distributor.updateOne(
            { uid: order.buyer_uid, status: { $ne: 'disabled' } },
            { $set: activationUpdate }
        );

        await this.distributePackageDirectIncome({
            buyer: distributor,
            packageBv,
            order,
            pkg: pkg || { packageId: order.packageId, name: order.package_name }
        });

        return { finalized: true };
    }

    /**
     * Credit distributor repurchase BV after payment verify (product orders).
     */
    async creditDistributorRepurchaseBv(order) {
        if (!order || order.order_type !== 'distributor_purchase') {
            return { credited: false, reason: 'not_distributor_purchase' };
        }
        if (order.repurchase_bv_credited) {
            return { credited: false, reason: 'already_credited' };
        }
        const bv = Math.round((Number(order.bv) || 0) * 100) / 100;
        if (bv <= 0) {
            return { credited: false, reason: 'zero_bv' };
        }
        await Distributor.updateOne(
            { uid: order.buyer_uid },
            { $inc: { repurchase_bv: bv } }
        );
        order.repurchase_bv_credited = true;
        return { credited: true, bv };
    }

    /**
     * Admin verifies manual payment → confirm order + run business side effects.
     */
    async verifyOrderPayment({ orderId, adminUser, remark }) {
        const oid = Number(orderId);
        if (!oid) {
            const err = new Error('orderId is required.');
            err.status = 400;
            throw err;
        }

        const order = await CommerceOrder.findOne({ orderId: oid });
        if (!order) {
            const err = new Error('Order not found.');
            err.status = 404;
            throw err;
        }
        if (order.payment?.status === 'verified' && order.payment_status === 'received') {
            const invoice = await Invoice.findOne({ orderId: order.orderId });
            if (invoice && !invoice.pdf_path) {
                try {
                    const InvoiceDocument = require('./InvoiceDocument');
                    await InvoiceDocument.generateInvoiceDocument({ invoice, order });
                } catch (_) {
                    /* ignore regenerate errors on already-verified path */
                }
            }
            return { order, invoice, already: true };
        }
        if (order.payment?.status !== 'submitted') {
            const err = new Error('No payment proof submitted for verification.');
            err.status = 400;
            throw err;
        }
        if (order.order_status !== 'pending') {
            const err = new Error('Only pending orders can have payment verified.');
            err.status = 400;
            throw err;
        }

        if (!order.payment) order.payment = defaultManualPayment();
        order.payment.status = 'verified';
        order.payment.verified_by = adminUser?.uid || null;
        order.payment.verified_at = new Date();
        order.payment.remark = remark || order.payment.remark || '';
        order.payment_status = 'received';
        order.order_status = 'confirmed';
        order.markModified('payment');
        order.timeline.push({
            status: 'confirmed',
            remark: remark || `Payment verified (UTR: ${order.payment.utr}). Order confirmed.`,
            updated_by: adminUser?.uid || null,
            updated_by_role: adminUser?.role || 'admin',
            updated_by_name: adminUser?.username || 'Admin',
            updated_at: new Date()
        });

        if (order.order_type === 'distributor_package_purchase') {
            await this.finalizePackageOrder(order, adminUser);
        }
        if (order.order_type === 'distributor_purchase') {
            await this.creditDistributorRepurchaseBv(order);
        }
        if (order.order_type === 'franchise_purchase') {
            await this.creditFranchiseInventory(order, adminUser?.uid);
        }

        await order.save();

        const invoice = await Invoice.findOne({ orderId: order.orderId });
        if (invoice) {
            invoice.payment_status = 'received';
            await invoice.save();
            try {
                const InvoiceDocument = require('./InvoiceDocument');
                await InvoiceDocument.generateInvoiceDocument({ invoice, order });
                try {
                    const to = invoice?.customer_details?.email;
                    if (to) {
                        await Email.sendInvoiceEmail({
                            email: to,
                            name: invoice.customer_details?.name,
                            order,
                            invoice
                        });
                    }
                } catch (mailErr) {
                    errorLogger(mailErr);
                }
                try {
                    const mobile = invoice?.customer_details?.mobile;
                    if (mobile) {
                        const name = invoice.customer_details?.name || '';
                        const amount = invoice.grand_total ?? order.grand_total;
                        const orderRef = order.order_number || order.orderId;
                        const paidAt = order?.payment?.verified_at || new Date();
                        await sms.paymentSms(mobile, name, amount, orderRef);
                        await sms.invoiceSms(mobile, invoice.invoice_number, sms.formatDate(paidAt));
                    }
                } catch (smsErr) {
                    errorLogger(smsErr);
                }
            } catch (docErr) {
                // Payment verify must not fail if document render has an issue
                console.error('Invoice document generation failed:', docErr.message || docErr);
            }
        }

        return { order, invoice, already: false };
    }

    /**
     * Admin rejects payment proof — order stays pending so buyer can re-upload.
     */
    async rejectOrderPayment({ orderId, adminUser, remark }) {
        const oid = Number(orderId);
        if (!oid) {
            const err = new Error('orderId is required.');
            err.status = 400;
            throw err;
        }

        const order = await CommerceOrder.findOne({ orderId: oid });
        if (!order) {
            const err = new Error('Order not found.');
            err.status = 404;
            throw err;
        }
        if (order.payment?.status !== 'submitted') {
            const err = new Error('No submitted payment proof to reject.');
            err.status = 400;
            throw err;
        }
        if (order.order_status !== 'pending') {
            const err = new Error('Only pending orders can have payment rejected.');
            err.status = 400;
            throw err;
        }

        if (!order.payment) order.payment = defaultManualPayment();
        order.payment.status = 'rejected';
        order.payment.remark = remark || 'Payment proof rejected';
        order.payment.verified_by = adminUser?.uid || null;
        order.payment.verified_at = new Date();
        // Keep UTR/proof for audit; allow re-submit by status rejected
        order.payment_status = 'pending';
        order.markModified('payment');
        order.timeline.push({
            status: 'payment_rejected',
            remark: remark || 'Payment proof rejected — please re-submit',
            updated_by: adminUser?.uid || null,
            updated_by_role: adminUser?.role || 'admin',
            updated_by_name: adminUser?.username || 'Admin',
            updated_at: new Date()
        });
        await order.save();

        return order;
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

    formatAddressBlock(addr = {}) {
        return [
            addr.line1,
            addr.line2,
            addr.city,
            addr.state,
            addr.pincode,
            addr.country
        ].filter(Boolean).join(', ');
    }

    normalizeAddress(input = {}, fallbackName = '', fallbackMobile = '') {
        return {
            name: String(input.name || fallbackName || '').trim(),
            mobile: String(input.mobile || fallbackMobile || '').trim(),
            line1: String(input.line1 || '').trim(),
            line2: String(input.line2 || '').trim(),
            city: String(input.city || '').trim(),
            state: String(input.state || '').trim(),
            pincode: String(input.pincode || '').trim(),
            country: String(input.country || 'India').trim() || 'India'
        };
    }

    /**
     * Admin creates a guest invoice (no username / account required).
     * Supports catalog products and/or custom line items.
     * Marks payment received and generates PDF immediately.
     */
    async createGuestInvoice({
        adminUser,
        customer = {},
        billing_address = {},
        shipping_address = {},
        items = [],
        remark = '',
        deduct_stock = true
    }) {
        const name = String(customer.name || billing_address.name || shipping_address.name || '').trim();
        if (!name) {
            const err = new Error('Customer name is required.');
            err.status = 400;
            throw err;
        }

        const rawItems = Array.isArray(items) ? items : [];
        if (!rawItems.length) {
            const err = new Error('At least one invoice item is required.');
            err.status = 400;
            throw err;
        }

        const companyGstPercent = await getCompanyGstPercent();
        const decrements = [];
        const orderItems = [];
        let subtotal = 0;
        let taxTotal = 0;
        let discountTotal = 0;

        try {
            for (const raw of rawItems) {
                const qty = Math.max(0, Math.floor(Number(raw.quantity) || 0));
                if (qty <= 0) {
                    const err = new Error('Each item needs a quantity greater than 0.');
                    err.status = 400;
                    throw err;
                }

                const productId = Number(raw.productId) || 0;
                let product = null;

                if (productId > 0) {
                    if (deduct_stock) {
                        product = await Product.findOneAndUpdate(
                            {
                                productId,
                                status: 'enabled',
                                stock: { $gte: qty }
                            },
                            { $inc: { stock: -qty }, $set: { updated_at: new Date() } },
                            { new: true }
                        );
                        if (!product) {
                            const current = await Product.findOne({ productId });
                            const available = current ? current.stock : 0;
                            const pname = current?.product_name || `Product #${productId}`;
                            const err = new Error(
                                current
                                    ? `Insufficient stock for ${pname}. Available: ${available}.`
                                    : `Product #${productId} not found.`
                            );
                            err.status = 409;
                            throw err;
                        }
                        decrements.push({
                            productId: product.productId,
                            quantity: qty,
                            sku: product.sku,
                            previous: product.stock + qty,
                            next: product.stock
                        });
                    } else {
                        product = await Product.findOne({ productId, status: 'enabled' });
                        if (!product) {
                            const err = new Error(`Product #${productId} not found.`);
                            err.status = 404;
                            throw err;
                        }
                    }
                }

                const listUnit = Number(
                    raw.price !== undefined && raw.price !== ''
                        ? raw.price
                        : (product ? product.mrp : 0)
                );
                if (!Number.isFinite(listUnit) || listUnit < 0) {
                    const err = new Error('Invalid item price.');
                    err.status = 400;
                    throw err;
                }

                const productName = String(
                    raw.product_name || product?.product_name || ''
                ).trim();
                if (!productName) {
                    const err = new Error('Item name is required for custom line items.');
                    err.status = 400;
                    throw err;
                }

                const gstRate = companyGstPercent > 0
                    ? companyGstPercent
                    : (Number(raw.gst) || Number(product?.gst) || 0);

                // Admin guest purchase: 20% off MRP; discounted amount is GST-inclusive.
                const GUEST_DISCOUNT_PERCENT = 20;
                const listInclusive = Math.round(listUnit * qty * 100) / 100;
                const payInclusive = Math.round(listInclusive * (1 - GUEST_DISCOUNT_PERCENT / 100) * 100) / 100;
                const listSplit = calcInclusiveSplit(listInclusive, gstRate);
                const paySplit = calcInclusiveSplit(payInclusive, gstRate);
                const unitPrice = qty > 0
                    ? Math.round((paySplit.base / qty) * 100) / 100
                    : paySplit.base;
                const lineDiscount = Math.max(
                    0,
                    Math.round((listSplit.base - paySplit.base) * 100) / 100
                );

                subtotal += listSplit.base;
                taxTotal += paySplit.tax;
                discountTotal += lineDiscount;

                orderItems.push({
                    productId: productId || 0,
                    sku: String(raw.sku || product?.sku || 'CUSTOM').trim() || 'CUSTOM',
                    product_name: productName,
                    hsn_code: String(raw.hsn_code || product?.hsn_code || '').trim(),
                    quantity: qty,
                    price: unitPrice,
                    gst: gstRate,
                    discount: lineDiscount,
                    tax: paySplit.tax,
                    total: paySplit.total
                });
            }

            // Fix rounding so inclusive line totals match 20% off list totals
            const expectedGrand = Math.round(
                orderItems.reduce((s, i) => s + Number(i.total || 0), 0) * 100
            ) / 100;

            const email = String(customer.email || '').trim();
            const mobile = String(
                customer.mobile || billing_address.mobile || shipping_address.mobile || ''
            ).trim();
            const gstNumber = String(customer.gst_number || '').trim();

            const billing = this.normalizeAddress(billing_address, name, mobile);
            const shipping = this.normalizeAddress(
                shipping_address,
                billing.name || name,
                billing.mobile || mobile
            );
            if (!shipping.line1 && billing.line1) {
                Object.assign(shipping, {
                    line1: billing.line1,
                    line2: billing.line2,
                    city: billing.city,
                    state: billing.state,
                    pincode: billing.pincode,
                    country: billing.country
                });
            }

            const billingText = this.formatAddressBlock(billing);
            const shippingText = this.formatAddressBlock(shipping);
            const roundedSubtotal = Math.round(subtotal * 100) / 100;
            const roundedDiscount = Math.round(discountTotal * 100) / 100;
            const roundedTax = Math.round(taxTotal * 100) / 100;
            const grand_total = expectedGrand;
            const adminUid = adminUser?.uid || null;

            const order = new CommerceOrder({
                order_type: 'guest_purchase',
                buyer_uid: 0,
                buyer_role: 'guest',
                items: orderItems,
                subtotal: roundedSubtotal,
                discount: roundedDiscount,
                tax: roundedTax,
                grand_total,
                bv: 0,
                payment_status: 'received',
                payment: {
                    mode: 'manual',
                    utr: String(customer.payment_ref || '').trim(),
                    proofUrl: '',
                    submitted_at: new Date(),
                    status: 'verified',
                    verified_by: adminUid,
                    verified_at: new Date(),
                    remark: remark || 'Guest invoice created by admin (20% off, GST inclusive)'
                },
                order_status: 'confirmed',
                dispatch_status: 'pending',
                shipping_address: shipping,
                billing_address: billing,
                timeline: [{
                    status: 'confirmed',
                    remark: remark || 'Guest invoice generated by admin — 20% discount, GST inclusive, payment marked received',
                    updated_by: adminUid,
                    updated_by_role: adminUser?.role || 'admin',
                    updated_by_name: adminUser?.username || 'Admin',
                    updated_at: new Date()
                }]
            });
            await order.save();

            const companyDetails = await resolveCompanySnapshot();
            const invoice = new Invoice({
                orderId: order.orderId,
                order_number: order.order_number,
                customer_uid: 0,
                customer_role: 'guest',
                customer_details: {
                    name,
                    email,
                    mobile,
                    address: billingText || shippingText,
                    billing_address: billingText,
                    shipping_address: shippingText,
                    gst_number: gstNumber
                },
                company_details: companyDetails,
                items: orderItems,
                subtotal: order.subtotal,
                discount: order.discount,
                tax: order.tax,
                gst: order.tax,
                grand_total: order.grand_total,
                payment_status: 'received',
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
                    remark: `Guest invoice ${invoice.invoice_number}`,
                    created_by: adminUid
                }).save();
            }

            try {
                const InvoiceDocument = require('./InvoiceDocument');
                await InvoiceDocument.generateInvoiceDocument({ invoice, order });
            } catch (docErr) {
                console.error('Guest invoice PDF generation failed:', docErr.message || docErr);
            }

            try {
                if (email) {
                    await Email.sendInvoiceEmail({
                        email,
                        name,
                        order,
                        invoice
                    });
                }
            } catch (mailErr) {
                errorLogger(mailErr);
            }

            try {
                if (mobile) {
                    const orderRef = order.order_number || order.orderId;
                    await sms.paymentSms(mobile, name, order.grand_total, orderRef);
                    await sms.invoiceSms(mobile, invoice.invoice_number, sms.formatDate(new Date()));
                }
            } catch (smsErr) {
                errorLogger(smsErr);
            }

            return { order, invoice };
        } catch (error) {
            if (decrements.length) {
                try {
                    await this.rollbackStock(decrements);
                } catch (rbErr) {
                    errorLogger(rbErr);
                }
            }
            throw error;
        }
    }

    async lookupInvoiceByNumber(invoiceNumber) {
        const number = String(invoiceNumber || '').trim().toUpperCase();
        if (!number) {
            const err = new Error('Invoice number is required.');
            err.status = 400;
            throw err;
        }

        const invoice = await Invoice.findOne({
            invoice_number: { $regex: new RegExp(`^${number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        if (!invoice) {
            const err = new Error('Invoice not found.');
            err.status = 404;
            throw err;
        }

        const order = await CommerceOrder.findOne({ orderId: invoice.orderId });
        return { invoice, order };
    }
}

module.exports = new CommerceService();
module.exports.priceForRole = priceForRole;
module.exports.ORDER_TYPE_MAP = ORDER_TYPE_MAP;
module.exports.FULFILLMENT_STATUSES = FULFILLMENT_STATUSES;
