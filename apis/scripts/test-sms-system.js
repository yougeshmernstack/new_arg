/**
 * Test all MSG91 SMS flows via SmsService.
 *
 * Usage:
 *   node scripts/test-sms-system.js <mobile>
 *   node scripts/test-sms-system.js <mobile> invoice
 *   node scripts/test-sms-system.js <mobile> payment
 *   node scripts/test-sms-system.js <mobile> username
 *   node scripts/test-sms-system.js <mobile> all
 *
 * Example:
 *   node scripts/test-sms-system.js 9317170031
 *   node scripts/test-sms-system.js 919317170031 payment
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sms = require('../SERVICES/SmsService');

const mobile = process.argv[2];
const only = (process.argv[3] || 'all').toLowerCase();

const results = [];

function pass(name, detail = '') {
    results.push({ name, ok: true, detail });
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, err) {
    const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : (err && err.message ? err.message : String(err));
    results.push({ name, ok: false, detail });
    console.error(`FAIL  ${name} — ${detail}`);
}

async function runOne(name, fn) {
    try {
        const data = await fn();
        pass(name, typeof data === 'object' ? JSON.stringify(data) : String(data ?? 'sent'));
    } catch (err) {
        fail(name, err);
    }
}

async function main() {
    if (!mobile) {
        console.error('Mobile number required.\n');
        console.error('Usage: node scripts/test-sms-system.js <mobile> [invoice|payment|username|all]');
        process.exit(1);
    }

    if (!process.env.MSG91_AUTHKEY) {
        console.error('MSG91_AUTHKEY missing in .env');
        process.exit(1);
    }

    console.log(`\nSMS test → mobile: ${mobile} | mode: ${only}\n`);

    const today = new Date();
    const dateStr = [
        String(today.getDate()).padStart(2, '0'),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getFullYear()).slice(-2)
    ].join('-');

    if (only === 'all' || only === 'invoice') {
        await runOne('invoiceSms', () =>
            sms.invoiceSms(mobile, 'ABC5656', dateStr)
        );
    }

    if (only === 'all' || only === 'payment') {
        await runOne('paymentSms', () =>
            sms.paymentSms(mobile, 'Abhishek Anand', '100', 'ABC5656')
        );
    }

    if (only === 'all' || only === 'username') {
        await runOne('usernameSms', () =>
            sms.usernameSms(mobile, 'abhi1234', 'xyz5858')
        );
    }

    if (only === 'order') {
        console.log('SKIP  orderSms — template not configured yet');
    }

    const ok = results.filter((r) => r.ok).length;
    const bad = results.filter((r) => !r.ok).length;
    console.log(`\nDone: ${ok} passed, ${bad} failed\n`);
    process.exit(bad ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
