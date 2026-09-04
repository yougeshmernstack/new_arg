const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const Invoice = require('../MODALS/Invoice');
const CommerceOrder = require('../MODALS/CommerceOrder');
const CompanyInfo = require('../MODALS/CompanyInfo');
const Product = require('../MODALS/Product');

const TEMPLETE_DIR = path.join(__dirname, '../templete');
const INVOICE_DIR = path.join(__dirname, '../uploads/invoices');

const TEMPLATE_BY_ROLE = {
    distributor: 'distributor-invoice.ejs',
    franchise: 'franchise-invoice.ejs',
    theme: 'theme-invoice.ejs',
    guest: 'theme-invoice.ejs'
};

const ROLE_LABEL = {
    distributor: 'Distributor',
    franchise: 'Franchise',
    theme: 'Customer',
    guest: 'Customer'
};

function ensureInvoiceDir() {
    if (!fs.existsSync(INVOICE_DIR)) {
        fs.mkdirSync(INVOICE_DIR, { recursive: true });
    }
}

function templatePathForRole(role) {
    const file = TEMPLATE_BY_ROLE[role] || TEMPLATE_BY_ROLE.distributor;
    return path.join(TEMPLETE_DIR, file);
}

function formatDate(value, withTime = true) {
    if (!value) return '—';
    try {
        const opts = withTime
            ? { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(value).toLocaleString('en-IN', opts);
    } catch (_) {
        return String(value);
    }
}

function formatMoney(value) {
    const n = Number(value || 0);
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toPlain(doc) {
    if (!doc) return {};
    return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

function onesWords(n) {
    const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
}

function twoDigitWords(n) {
    return onesWords(n);
}

function amountInWords(amount) {
    let num = Math.round(Number(amount || 0) * 100) / 100;
    if (!Number.isFinite(num)) return 'Zero Rupees Only';
    const negative = num < 0;
    num = Math.abs(num);
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    function section(n, label) {
        if (!n) return '';
        return `${twoDigitWords(n)} ${label}`.trim();
    }

    let n = rupees;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    n %= 100;

    const parts = [
        section(crore, 'Crore'),
        section(lakh, 'Lakh'),
        section(thousand, 'Thousand'),
        section(hundred, 'Hundred'),
        n ? twoDigitWords(n) : ''
    ].filter(Boolean);

    let words = parts.join(' ').replace(/\s+/g, ' ').trim() || 'Zero';
    words = `${words} Rupees`;
    if (paise) words += ` and ${twoDigitWords(paise)} Paise`;
    words += ' Only';
    return negative ? `Minus ${words}` : words;
}

function formatAddress(parts) {
    return (Array.isArray(parts) ? parts : [parts])
        .flatMap((p) => String(p || '').split(','))
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .join(', ');
}

function absoluteMediaUrl(pathValue) {
    if (!pathValue) return null;
    const raw = String(pathValue).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
        // Ignore known-bad legacy hosts left in env/API_URL concatenations
        if (/slotegrator|bharatbatteries\.info/i.test(raw) && !raw.startsWith('data:')) {
            // fall through to local resolve below using pathname
            try {
                const u = new URL(raw);
                return resolveLocalUploadAsDataUri(u.pathname) || raw;
            } catch (_) {
                return raw;
            }
        }
        return raw;
    }

    const asData = resolveLocalUploadAsDataUri(raw);
    if (asData) return asData;

    const base = String(process.env.API_URL || process.env.BASE_URL || '')
        .trim()
        .replace(/\/$/, '');
    const pathPart = raw.startsWith('/') ? raw : `/${raw}`;
    if (base && !/slotegrator|bharatbatteries\.info/i.test(base)) {
        return `${base}${pathPart}`;
    }
    return pathPart;
}

function resolveLocalUploadAsDataUri(uploadPath) {
    try {
        const clean = String(uploadPath || '').split('?')[0].trim();
        if (!clean || clean.includes('..')) return null;
        const rel = clean.replace(/^\/+/, '');
        if (!rel.startsWith('uploads/')) return null;
        const abs = path.join(__dirname, '..', rel);
        if (!fs.existsSync(abs)) return null;
        const buf = fs.readFileSync(abs);
        const ext = path.extname(abs).toLowerCase();
        const mime =
            ext === '.png' ? 'image/png'
                : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                    : ext === '.webp' ? 'image/webp'
                        : ext === '.gif' ? 'image/gif'
                            : ext === '.svg' ? 'image/svg+xml'
                                : 'application/octet-stream';
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (_) {
        return null;
    }
}

async function resolveCompanyDetails(snapshot = {}) {
    let live = null;
    try {
        live = await CompanyInfo.findOne({}).lean();
    } catch (_) {
        live = null;
    }

    let site = null;
    try {
        const WebsiteContent = require('../MODALS/WebsiteContent');
        site = await WebsiteContent.findOne({}).lean();
    } catch (_) {
        site = null;
    }

    const liveName = live?.companyName || '';
    const siteName = site?.name || '';
    const snapshotName = snapshot?.name || '';
    const isLegacy =
        /bharat\s*batter/i.test(snapshotName) ||
        /bharat\s*batter/i.test(liveName);

    const name =
        (!isLegacy && siteName) ||
        (!isLegacy && liveName) ||
        (!isLegacy && snapshotName) ||
        siteName ||
        'Arogya Green Life';

    const structuredAddress = formatAddress([
        live?.address?.street,
        live?.address?.city,
        live?.address?.state,
        live?.address?.postalCode,
        live?.address?.country
    ]);

    const address =
        structuredAddress ||
        formatAddress([site?.contact?.address]) ||
        formatAddress([snapshot?.address]) ||
        '';

    const websiteRaw =
        live?.contactInfo?.website ||
        site?.contact?.website ||
        snapshot?.website ||
        '';
    const website = /bharatbatteries/i.test(websiteRaw)
        ? (site?.contact?.website || 'https://arogyagreenlife.com')
        : websiteRaw;

    const logoRaw = snapshot?.logo || site?.logo || null;

    return {
        name,
        email: live?.contactInfo?.email || site?.contact?.email || snapshot?.email || '',
        mobile: live?.contactInfo?.phone || site?.contact?.phone || snapshot?.mobile || '',
        website,
        address,
        gst_number: live?.taxInfo?.gst || live?.taxInfo?.gstin || snapshot?.gst_number || '',
        pan: live?.taxInfo?.pan || snapshot?.pan || '',
        gst_percent: Number(live?.taxInfo?.gst_percent || snapshot?.gst_percent || 0) || 0,
        logo: absoluteMediaUrl(logoRaw)
    };
}

async function buildViewModel(invoiceDoc, orderDoc) {
    const invoice = toPlain(invoiceDoc);
    const order = toPlain(orderDoc);
    const role = invoice.customer_role || order.buyer_role || 'distributor';
    const company = await resolveCompanyDetails(invoice.company_details || {});
    const customerRaw = invoice.customer_details || {};
    const shipping = order.shipping_address || {};

    const customer = {
        name: customerRaw.name || shipping.name || '—',
        email: customerRaw.email || '',
        mobile: customerRaw.mobile || shipping.mobile || '',
        address: formatAddress([
            customerRaw.billing_address,
            customerRaw.address,
            shipping.line1,
            shipping.line2,
            shipping.city,
            shipping.state,
            shipping.pincode,
            shipping.country
        ]),
        gst_number: customerRaw.gst_number || ''
    };

    const rawItems = Array.isArray(invoice.items) && invoice.items.length
        ? invoice.items
        : (order.items || []);

    const missingMetaIds = [...new Set(
        rawItems
            .filter((item) => item.productId)
            .map((item) => Number(item.productId))
            .filter((id) => Number.isFinite(id) && id > 0)
    )];

    let productMetaById = {};
    if (missingMetaIds.length) {
        try {
            const products = await Product.find({ productId: { $in: missingMetaIds } })
                .select('productId hsn_code gst')
                .lean();
            productMetaById = Object.fromEntries(
                products.map((p) => [p.productId, { hsn_code: p.hsn_code || '', gst: Number(p.gst) || 0 }])
            );
        } catch (_) {
            productMetaById = {};
        }
    }

    const items = rawItems.map((item, idx) => {
        const meta = productMetaById[item.productId] || {};
        const hsn = String(item.hsn_code || meta.hsn_code || '').trim();
        const qty = Number(item.quantity || 0);
        const unit = Number(item.price || 0);
        const taxAmt = Number(item.tax || 0);
        const lineTotal = Number(item.total || 0);
        // Prefer taxable amount for the Amount column (Rate × Qty)
        const taxable = Math.round((unit * qty) * 100) / 100 || Math.max(0, lineTotal - taxAmt);
        return {
            sno: idx + 1,
            product_name: item.product_name || item.name || 'Item',
            sku: item.sku || '—',
            hsn_code: hsn || '—',
            quantity: qty,
            price: unit,
            discount: Number(item.discount || 0),
            tax: taxAmt,
            gst: Number(item.gst || meta.gst || company.gst_percent || 0),
            total: taxable > 0 ? taxable : lineTotal
        };
    });

    const itemGstRates = items
        .map((i) => Number(i.gst) || 0)
        .filter((r) => r > 0);
    const gst_percent = company.gst_percent > 0
        ? company.gst_percent
        : (itemGstRates.length
            ? (itemGstRates.every((r) => r === itemGstRates[0]) ? itemGstRates[0] : 0)
            : 0);

    const grandTotal = Number(invoice.grand_total || order.grand_total || 0);
    const payment = order.payment || {};

    return {
        invoice,
        order,
        customer,
        company,
        items,
        gst_percent,
        role,
        role_label: ROLE_LABEL[role] || 'Customer',
        issued_at: formatDate(invoice.created_date || order.created_date || new Date(), false),
        issued_at_full: formatDate(invoice.created_date || order.created_date || new Date(), true),
        generated_at: formatDate(new Date(), true),
        money: formatMoney,
        amount_in_words: amountInWords(grandTotal),
        payment_mode: payment.mode === 'manual' ? 'Bank / UPI Transfer' : (payment.mode || 'Manual'),
        payment_utr: payment.utr || '',
        payment_status: invoice.payment_status === 'received' || order.payment_status === 'received'
            ? 'Paid'
            : 'Unpaid',
        package_name: order.package_name || '',
        order_bv: Number(order.bv || 0)
    };
}

async function renderInvoiceHtml(invoiceDoc, orderDoc) {
    const invoice = toPlain(invoiceDoc);
    const role = invoice.customer_role || orderDoc?.buyer_role || 'distributor';
    const tpl = templatePathForRole(role);
    if (!fs.existsSync(tpl)) {
        const err = new Error(`Invoice template missing for role: ${role}`);
        err.status = 500;
        throw err;
    }
    const html = await ejs.renderFile(tpl, await buildViewModel(invoiceDoc, orderDoc), { async: true });
    return { html, role, template: path.basename(tpl) };
}

function relativeInvoicePath(invoiceNumber, ext = 'html') {
    const safe = String(invoiceNumber || 'invoice').replace(/[^\w.-]+/g, '_');
    const suffix = String(ext || 'html').replace(/^\./, '');
    return path.join('uploads', 'invoices', `${safe}.${suffix}`);
}

function absoluteFromRelative(relPath) {
    if (!relPath) return null;
    if (path.isAbsolute(relPath)) return relPath;
    return path.join(__dirname, '..', relPath);
}

function resolvePuppeteerChromePath() {
    const cacheDir = path.join(__dirname, '..', '.cache', 'puppeteer');
    // Always prefer project-local Chromium (ignore broken sandbox/tmp cache env).
    process.env.PUPPETEER_CACHE_DIR = cacheDir;

    const chromeDir = path.join(cacheDir, 'chrome');
    if (!fs.existsSync(chromeDir)) return null;

    const versions = fs.readdirSync(chromeDir).filter((d) => d.startsWith('linux-'));
    versions.sort();
    for (let i = versions.length - 1; i >= 0; i -= 1) {
        const candidate = path.join(
            chromeDir,
            versions[i],
            'chrome-linux64',
            'chrome'
        );
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

async function htmlToPdfBuffer(html) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (err) {
        const e = new Error('PDF generator is not installed on the server.');
        e.status = 500;
        throw e;
    }

    const executablePath = resolvePuppeteerChromePath();
    if (!executablePath) {
        const e = new Error(
            'Chrome for PDF generation is missing. Run: npx puppeteer browsers install chrome'
        );
        e.status = 500;
        throw e;
    }

    const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none'
        ]
    });

    try {
        const page = await browser.newPage();
        // Strip interactive toolbar for PDF output
        const pdfHtml = String(html || '').replace(
            /<div class="toolbar">[\s\S]*?<\/div>/i,
            ''
        );
        await page.setContent(pdfHtml, { waitUntil: 'networkidle0', timeout: 60000 });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: false,
            margin: {
                top: '10mm',
                right: '8mm',
                bottom: '10mm',
                left: '8mm'
            }
        });
        return Buffer.from(pdf);
    } finally {
        await browser.close().catch(() => {});
    }
}

async function generateInvoiceDocument({ invoice, order } = {}) {
    if (!invoice) {
        const err = new Error('Invoice not found for document generation.');
        err.status = 404;
        throw err;
    }
    if (invoice.payment_status !== 'received') {
        const err = new Error('Invoice can be generated only after payment is verified.');
        err.status = 400;
        throw err;
    }

    ensureInvoiceDir();
    const { html, role, template } = await renderInvoiceHtml(invoice, order);

    const htmlRel = relativeInvoicePath(invoice.invoice_number, 'html').replace(/\\/g, '/');
    const pdfRel = relativeInvoicePath(invoice.invoice_number, 'pdf').replace(/\\/g, '/');
    const htmlAbs = absoluteFromRelative(htmlRel);
    const pdfAbs = absoluteFromRelative(pdfRel);

    fs.writeFileSync(htmlAbs, html, 'utf8');

    const pdfBuffer = await htmlToPdfBuffer(html);
    fs.writeFileSync(pdfAbs, pdfBuffer);

    invoice.pdf_path = pdfRel;
    await invoice.save();

    return {
        invoice,
        html,
        pdf: pdfBuffer,
        pdf_path: pdfRel,
        html_path: htmlRel,
        role,
        template,
        path: pdfRel
    };
}

async function ensurePaidInvoiceDocument(orderId) {
    const oid = Number(orderId);
    const order = await CommerceOrder.findOne({ orderId: oid });
    if (!order) {
        const err = new Error('Order not found.');
        err.status = 404;
        throw err;
    }

    const invoice = await Invoice.findOne({ orderId: oid });
    if (!invoice) {
        const err = new Error('Invoice not found for this order.');
        err.status = 404;
        throw err;
    }

    const paid =
        invoice.payment_status === 'received' ||
        order.payment_status === 'received' ||
        order.payment?.status === 'verified';

    if (!paid) {
        const err = new Error('Invoice is available after payment verification.');
        err.status = 400;
        throw err;
    }

    if (invoice.payment_status !== 'received') {
        invoice.payment_status = 'received';
        await invoice.save();
    }

    return generateInvoiceDocument({ invoice, order });
}

module.exports = {
    TEMPLETE_DIR,
    TEMPLATE_BY_ROLE,
    renderInvoiceHtml,
    generateInvoiceDocument,
    ensurePaidInvoiceDocument,
    htmlToPdfBuffer,
    templatePathForRole,
    amountInWords,
    formatMoney
};
