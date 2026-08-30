const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const Invoice = require('../MODALS/Invoice');
const CommerceOrder = require('../MODALS/CommerceOrder');
const CompanyInfo = require('../MODALS/CompanyInfo');

const TEMPLETE_DIR = path.join(__dirname, '../templete');
const INVOICE_DIR = path.join(__dirname, '../uploads/invoices');

const TEMPLATE_BY_ROLE = {
    distributor: 'distributor-invoice.ejs',
    franchise: 'franchise-invoice.ejs',
    theme: 'theme-invoice.ejs'
};

const ROLE_LABEL = {
    distributor: 'Distributor',
    franchise: 'Franchise',
    theme: 'Customer'
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
        (!isLegacy && snapshotName) ||
        (!isLegacy && liveName) ||
        siteName ||
        'Arogya Green Life';

    const address = formatAddress([
        live?.address?.street,
        live?.address?.city,
        live?.address?.state,
        live?.address?.postalCode,
        live?.address?.country,
        snapshot?.address
    ]) || snapshot?.address || '';

    const websiteRaw = live?.contactInfo?.website || site?.contact?.website || '';
    const website = /bharatbatteries/i.test(websiteRaw)
        ? (site?.contact?.website || 'https://arogyagreenlife.com')
        : websiteRaw;

    return {
        name,
        email: live?.contactInfo?.email || snapshot?.email || site?.contact?.email || '',
        mobile: live?.contactInfo?.phone || snapshot?.mobile || site?.contact?.phone || '',
        website,
        address,
        gst_number: live?.taxInfo?.gst || live?.taxInfo?.gstin || snapshot?.gst_number || '',
        pan: live?.taxInfo?.pan || '',
        logo: snapshot?.logo || site?.logo || null
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

    const items = (Array.isArray(invoice.items) && invoice.items.length
        ? invoice.items
        : (order.items || [])
    ).map((item, idx) => ({
        sno: idx + 1,
        product_name: item.product_name || item.name || 'Item',
        sku: item.sku || '—',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        discount: Number(item.discount || 0),
        tax: Number(item.tax || item.gst || 0),
        total: Number(item.total || 0)
    }));

    const grandTotal = Number(invoice.grand_total || order.grand_total || 0);
    const payment = order.payment || {};

    return {
        invoice,
        order,
        customer,
        company,
        items,
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

function relativeInvoicePath(invoiceNumber) {
    const safe = String(invoiceNumber || 'invoice').replace(/[^\w.-]+/g, '_');
    return path.join('uploads', 'invoices', `${safe}.html`);
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
    const absPath = path.join(
        __dirname,
        '..',
        relativeInvoicePath(invoice.invoice_number)
    );
    fs.writeFileSync(absPath, html, 'utf8');

    invoice.pdf_path = relativeInvoicePath(invoice.invoice_number).replace(/\\/g, '/');
    await invoice.save();

    return {
        invoice,
        html,
        role,
        template,
        path: invoice.pdf_path
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
    templatePathForRole,
    amountInWords,
    formatMoney
};
