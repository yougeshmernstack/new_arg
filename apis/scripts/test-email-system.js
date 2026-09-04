/**
 * Self-test for email mailer + templates + OTP helpers.
 * Usage: node scripts/test-email-system.js [--send]
 *   --send  also fires one real welcome test mail to yash947222@gmail.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const assert = require('assert');

const mailerService = require('../SERVICES/mailerService');
const Email = require('../SERVICES/SendEmail');
const OTPService = require('../SERVICES/OTPService');

const TEMPLETE_DIR = path.join(__dirname, '../templete');
const shouldSend = process.argv.includes('--send');

const results = [];
function pass(name, detail = '') {
    results.push({ name, ok: true, detail });
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, err) {
    results.push({ name, ok: false, detail: String(err && err.message ? err.message : err) });
    console.error(`FAIL  ${name} — ${err && err.message ? err.message : err}`);
}

async function testTemplatesRender() {
    const samples = {
        'welcome-email': {
            name: 'Test User',
            username: 'testuser',
            password: 'Secret@123',
            email: 'test@example.com',
            role: 'distributor',
        },
        'forgot-password-otp': {
            name: 'Test User',
            otp: '482910',
            action: 'forgot_password',
        },
        'order-placed': {
            name: 'Test User',
            order_number: 'ORD-TEST-001',
            orderId: 999,
            items: [{ product_name: 'Herbal Pack', quantity: 2, total: 1500 }],
            total: 1500,
            payment_status: 'pending',
            shipping: {
                name: 'Test User',
                line1: '12 Green Road',
                city: 'Indore',
                state: 'MP',
                pincode: '452001',
            },
        },
        'invoice-email': {
            name: 'Test User',
            invoice_number: 'INV-TEST-001',
            orderId: 999,
            order_number: 'ORD-TEST-001',
            total: 1500,
            paid_at: '30 Aug 2026, 5:00 pm',
        },
    };

    for (const [name, data] of Object.entries(samples)) {
        const file = path.join(TEMPLETE_DIR, `${name}.ejs`);
        assert.ok(fs.existsSync(file), `missing ${name}.ejs`);
        const html = await ejs.renderFile(file, data);
        assert.ok(html.includes('Arogya Green Life'), `${name} missing brand`);
        assert.ok(html.length > 200, `${name} too short`);
        pass(`template:${name}`, `${html.length} chars`);
    }
}

async function testOtpHelpers() {
    const { otp, hash } = OTPService.generateOTP();
    assert.strictEqual(otp.length, 6);
    assert.ok(hash && hash.length > 20);
    const bcrypt = require('bcryptjs');
    assert.ok(await bcrypt.compare(otp, hash));
    assert.ok(!(await bcrypt.compare('000000', hash)) || otp === '000000');
    assert.strictEqual(OTPService.isOTPExpired(Date.now()), false);
    assert.strictEqual(OTPService.isOTPExpired(Date.now() - 11 * 60 * 1000), true);
    pass('otp:generate-hash-expiry');
}

async function testRoleResolve() {
    assert.strictEqual(OTPService.resolveRole({ panelRole: 'franchise' }), 'franchise');
    assert.strictEqual(OTPService.resolveRole({ body: { role: 'theme' } }), 'theme');
    assert.strictEqual(OTPService.getModel('distributor').modelName, 'Distributor');
    assert.strictEqual(OTPService.getModel('franchise').modelName, 'Franchise');
    assert.strictEqual(OTPService.getModel('theme').modelName, 'ThemeUser');
    pass('otp:role-models');
}

async function testSendEmailHelpersDryRun() {
    const original = mailerService.sendMail.bind(mailerService);
    const calls = [];
    mailerService.sendMail = async (to, subject, template, data, attachments) => {
        // still render to catch template errors
        await ejs.renderFile(path.join(TEMPLETE_DIR, `${template}.ejs`), data || {});
        calls.push({ to, subject, template, data, attachments });
        return { success: true, dryRun: true };
    };

    try {
        await Email.sendWelcome({
            email: 'dry@example.com',
            name: 'Dry',
            username: 'dryuser',
            password: 'Pass@123',
            role: 'distributor',
        });
        await Email.sendOrderPlaced({
            email: 'dry@example.com',
            name: 'Dry',
            order: {
                order_number: 'ORD-1',
                orderId: 1,
                grand_total: 100,
                payment_status: 'pending',
                items: [{ product_name: 'A', quantity: 1, total: 100 }],
                shipping_address: { name: 'Dry', city: 'Indore' },
            },
            invoice: { customer_details: { name: 'Dry', email: 'dry@example.com' }, items: [] },
        });

        const tmpInvoice = path.join(__dirname, '../uploads/invoices/_test-invoice.html');
        fs.mkdirSync(path.dirname(tmpInvoice), { recursive: true });
        fs.writeFileSync(tmpInvoice, '<html><body>test invoice</body></html>');
        await Email.sendInvoiceEmail({
            email: 'dry@example.com',
            name: 'Dry',
            order: { orderId: 1, order_number: 'ORD-1', grand_total: 100 },
            invoice: {
                invoice_number: 'INV-1',
                orderId: 1,
                grand_total: 100,
                pdf_path: 'uploads/invoices/_test-invoice.html',
                customer_details: { name: 'Dry' },
            },
        });
        fs.unlinkSync(tmpInvoice);

        assert.strictEqual(calls.length, 3);
        assert.strictEqual(calls[0].template, 'welcome-email');
        assert.strictEqual(calls[1].template, 'order-placed');
        assert.strictEqual(calls[2].template, 'invoice-email');
        assert.ok(calls[2].attachments && calls[2].attachments.length === 1);
        pass('helpers:welcome-order-invoice', `${calls.length} calls`);
    } finally {
        mailerService.sendMail = original;
    }
}

async function testSmtpVerify() {
    await mailerService.verifySmtp();
    pass('smtp:verify', `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
}

async function testLiveSend() {
    const to = 'yash947222@gmail.com';
    await Email.sendWelcome({
        email: to,
        name: 'Mailer Test',
        username: 'mailertest',
        password: 'Test@12345',
        role: 'distributor',
    });
    pass('smtp:live-send', `to ${to}`);
}

(async () => {
    console.log('=== Email system self-test ===\n');
    try {
        await testTemplatesRender();
    } catch (e) {
        fail('templates', e);
    }
    try {
        await testOtpHelpers();
    } catch (e) {
        fail('otp helpers', e);
    }
    try {
        await testRoleResolve();
    } catch (e) {
        fail('role resolve', e);
    }
    try {
        await testSendEmailHelpersDryRun();
    } catch (e) {
        fail('send helpers', e);
    }
    try {
        await testSmtpVerify();
    } catch (e) {
        fail('smtp verify', e);
    }
    if (shouldSend) {
        try {
            await testLiveSend();
        } catch (e) {
            fail('live send', e);
        }
    } else {
        console.log('SKIP  smtp:live-send — pass --send to deliver a real welcome mail');
    }

    const failed = results.filter((r) => !r.ok);
    console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
    if (failed.length) {
        process.exitCode = 1;
    }
})();
