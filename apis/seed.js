/**
 * Clean wellness_db and seed a basic ready setup.
 *
 * Usage:
 *   node seed.js --confirm
 *   npm run seed -- --confirm
 *
 * Keeps catalog/CMS: products, packages, brands, categories,
 * website content, legal documents.
 * Wipes accounts, orders, wallets, transactions, stock history, etc.
 * Recreates admin + root franchise + company distributor (pehli ID) + config.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const AdminData = require('./MODALS/AdminData');
const AdminWallet = require('./MODALS/AdminWallet');
const Franchise = require('./MODALS/Franchise');
const FranchiseWallet = require('./MODALS/FranchiseWallet');
const Distributor = require('./MODALS/Distributor');
const DistributorWallet = require('./MODALS/DistributorWallet');
const Company = require('./MODALS/CompanyInfo');
const WebsiteContent = require('./MODALS/WebsiteContent');
const PaymentOption = require('./MODALS/PaymentOption');
const advance_info = require('./MODALS/advanceInfo');
const PlansInfo = require('./MODALS/Plan');
const Wallets = require('./MODALS/wallets');
const Product = require('./MODALS/Product');
const { ensurePanelWallet } = require('./utils/panelWallet');
const wellnessPermissionSeed = require('./SERVICES/WellnessPermissionSeed');

const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'Admin@123',
    name: 'System Admin',
    email: 'admin@arogyagreenlife.com',
    mobile: '9999999999'
};

const DEFAULT_FRANCHISE = {
    username: 'franchise',
    password: 'Franchise@123',
    business_name: 'Arogya Green Life HQ',
    owner_name: 'Franchise Owner',
    email: 'franchise@arogyagreenlife.com',
    mobile: '8888888888'
};

/** Company / root distributor — first ID for referrals & binary tree */
const DEFAULT_DISTRIBUTOR = {
    username: 'ARG100001',
    password: 'Dist@123',
    name: 'Company ID',
    email: 'company@arogyagreenlife.com',
    mobile: '7777777777'
};

/** Operational / user data — wiped on clean */
const CLEAR_COLLECTIONS = [
    'activities',
    'admin_data',
    'admin_wallets',
    'auditlogs',
    'carts',
    'commerceorders',
    'counters',
    'dashboardbanners',
    'distributor_data',
    'distributor_wallets',
    'dummy_business',
    'franchise_data',
    'franchise_wallets',
    'fund_deposit_requests',
    'inventories',
    'invoices',
    'kycdetails',
    'matching_history',
    'orders',
    'otps',
    'permissions',
    'powers',
    'rank_achievements',
    'repurchase_matching_history',
    'stockhistories',
    'theme_user_wallets',
    'theme_users_data',
    'transactions',
    'wishlists',
    // config recreated below
    'wallets',
    'paymentoptions',
    'advance_infos'
];

function mongoUri() {
    const dbName = process.env.DB_NAME;
    const username = process.env.DB_USER;
    const ip = process.env.ip;
    const dbport = process.env.dbport;
    const password = encodeURIComponent(process.env.DB_PASSWORD || '');
    if (!dbName || !username || !ip || !dbport) {
        throw new Error('Missing DB env (DB_NAME, DB_USER, ip, dbport, DB_PASSWORD)');
    }
    return `mongodb://${username}:${password}@${ip}:${dbport}/${dbName}?authSource=admin`;
}

async function clearCollections(db) {
    const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
    const cleared = [];
    for (const name of CLEAR_COLLECTIONS) {
        if (!existing.has(name)) continue;
        await db.collection(name).deleteMany({});
        cleared.push(name);
    }
    return cleared;
}

async function seedWalletsCatalog() {
    const wallets = [
        { id: 1, name: 'Main Wallet', wallet_type: 'wallet', status: 1, slug: 'main_wallet', count_in: null },
        { id: 3, name: 'Fund Wallet', wallet_type: 'wallet', status: 1, slug: 'fund_wallet', count_in: null },
        { id: 5, name: 'Self Investment', wallet_type: 'investment', status: 1, slug: 'self_investment', count_in: null },
        { id: 6, name: 'Total Withdrawal', wallet_type: 'withdrawal', status: 1, withdraw_limit: 0, slug: 'total_withdrawal', count_in: null },
        { id: 7, name: 'Total Payout', wallet_type: 'payout', status: 1, payout_limit: 0, slug: 'total_payout', count_in: null },
        { id: 8, name: 'Direct Income', wallet_type: 'income', status: 1, slug: 'direct_income', count_in: 'main_wallet' },
        { id: 9, name: 'Matching Income', wallet_type: 'income', status: 1, slug: 'matching_income', count_in: 'main_wallet' },
        { id: 10, name: 'Repurchase Matching Income', wallet_type: 'income', status: 1, slug: 'repurchase_matching_income', count_in: 'main_wallet' },
        { id: 11, name: 'Upline Matching Income', wallet_type: 'income', status: 1, slug: 'upline_matching_income', count_in: 'main_wallet' }
    ];
    await Wallets.deleteMany({});
    await Wallets.insertMany(wallets);
    return wallets.length;
}

async function ensureCompany() {
    let company = await Company.findOne({});
    if (!company) {
        company = await new Company({
            companyName: 'Arogya Green Life',
            contactInfo: { website: 'https://arogyagreenlife.com' },
            taxInfo: { gst_percent: 5 },
            currency: 'INR',
            token: 'INR',
            currency_sign: '₹',
            token_sign: '₹'
        }).save();
        return { created: true, company };
    }
    const patch = {};
    if (!company.companyName) patch.companyName = 'Arogya Green Life';
    if (!company.taxInfo) patch.taxInfo = { gst_percent: 5 };
    else if (company.taxInfo.gst_percent == null) patch['taxInfo.gst_percent'] = 5;
    if (Object.keys(patch).length) {
        await Company.updateOne({ _id: company._id }, { $set: patch });
        company = await Company.findById(company._id);
    }
    return { created: false, company };
}

async function ensureWebsite() {
    let site = await WebsiteContent.findOne({ key: 'default' });
    if (!site) {
        site = await new WebsiteContent({
            key: 'default',
            name: 'Arogya Greenlife',
            shortName: 'AG',
            tagline: 'Cold-pressed juices and clean wellness essentials'
        }).save();
        return { created: true, site };
    }
    return { created: false, site };
}

async function ensureAdvanceInfo() {
    let doc = await advance_info.findOne({});
    if (!doc) {
        doc = await new advance_info().save();
        return { created: true };
    }
    return { created: false };
}

async function seedPaymentOptions() {
    await PaymentOption.deleteMany({});
    await new PaymentOption().save();
    return true;
}

async function seedAdmin() {
    const hashed = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    const admin = await new AdminData({
        uid: 1,
        adminId: 1,
        username: DEFAULT_ADMIN.username,
        password: hashed,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        mobile: DEFAULT_ADMIN.mobile,
        roles: ['admin'],
        status: 1,
        joining_date: new Date(),
        lastActivity: new Date()
    }).save();
    await ensurePanelWallet(AdminWallet, admin.uid);
    return admin;
}

async function seedFranchise() {
    const hashed = await bcrypt.hash(DEFAULT_FRANCHISE.password, 10);
    const franchise = await new Franchise({
        uid: 1,
        franchiseId: 1001,
        username: DEFAULT_FRANCHISE.username,
        password: hashed,
        business_name: DEFAULT_FRANCHISE.business_name,
        owner_name: DEFAULT_FRANCHISE.owner_name,
        email: DEFAULT_FRANCHISE.email,
        mobile: DEFAULT_FRANCHISE.mobile,
        status: 'active',
        joining_date: new Date(),
        lastActivity: new Date()
    }).save();
    await ensurePanelWallet(FranchiseWallet, franchise.uid);
    return franchise;
}

async function seedRootDistributor(franchise) {
    const hashed = await bcrypt.hash(DEFAULT_DISTRIBUTOR.password, 10);
    const validity = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const distributor = await new Distributor({
        uid: 1,
        distributorId: 2001,
        username: DEFAULT_DISTRIBUTOR.username,
        password: hashed,
        name: DEFAULT_DISTRIBUTOR.name,
        email: DEFAULT_DISTRIBUTOR.email,
        mobile: DEFAULT_DISTRIBUTOR.mobile,
        sponsor_Id: franchise.uid,
        sponsor_uid: franchise.uid,
        sponsor_type: 'franchise',
        parent_Id: null,
        position: null,
        status: 'active',
        joining_date: new Date(),
        activation_date: new Date(),
        id_card_validity: validity,
        lastActivity: new Date()
    }).save();
    await ensurePanelWallet(DistributorWallet, distributor.uid);
    return distributor;
}

async function resetCounters(db) {
    const Counter = db.collection('counters');
    await Counter.deleteMany({});
    // Admin / franchise / root distributor already use uid 1
    await Counter.insertMany([
        { ID: 'admin_uid', seq: 1 },
        { ID: 'franchise_uid', seq: 1 },
        { ID: 'distributor_uid', seq: 1 },
        { ID: 'theme_uid', seq: 0 }
    ]);
}

async function resetProductStock() {
    // Keep catalog products; zero stock so ops start clean
    const result = await Product.updateMany({}, { $set: { stock: 0 } });
    return result.modifiedCount || 0;
}

async function summarize(db) {
    const cols = await db.listCollections().toArray();
    const counts = {};
    for (const c of cols.map((x) => x.name).sort()) {
        counts[c] = await db.collection(c).countDocuments();
    }
    return counts;
}

async function main() {
    if (!process.argv.includes('--confirm')) {
        console.error('Refusing to wipe DB without --confirm');
        console.error('Run: node seed.js --confirm');
        process.exit(1);
    }

    const uri = mongoUri();
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const dbName = process.env.DB_NAME;

    console.log(`Cleaning database: ${dbName}`);
    const cleared = await clearCollections(db);
    console.log(`Cleared ${cleared.length} collections`);

    const walletCount = await seedWalletsCatalog();
    console.log(`Seeded wallets: ${walletCount}`);

    const perm = await wellnessPermissionSeed.seed();
    console.log(`Seeded permissions: created=${perm.created} skipped=${perm.skipped}`);

    const company = await ensureCompany();
    console.log(`Company: ${company.created ? 'created' : 'kept'} (${company.company.companyName})`);

    const website = await ensureWebsite();
    console.log(`Website content: ${website.created ? 'created' : 'kept'} (${website.site.name})`);

    const advance = await ensureAdvanceInfo();
    console.log(`Advance info: ${advance.created ? 'created' : 'kept'}`);

    await seedPaymentOptions();
    console.log('Payment options: created empty shell');

    const plan = await PlansInfo.ensurePlanData();
    console.log(`Plan data: planId=${plan.planId}`);

    await resetCounters(db);
    console.log('Counters reset');

    const stockReset = await resetProductStock();
    console.log(`Product stock zeroed: ${stockReset}`);

    const admin = await seedAdmin();
    console.log(`Admin ready: ${admin.username}`);

    const franchise = await seedFranchise();
    console.log(`Franchise ready: ${franchise.username}`);

    const distributor = await seedRootDistributor(franchise);
    console.log(`Root distributor ready: ${distributor.username} (pehli ID / company sponsor)`);

    const counts = await summarize(db);
    console.log('\nCollection counts:');
    console.log(JSON.stringify(counts, null, 2));
    console.log('\nDefault logins:');
    console.log(`  Admin        ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`);
    console.log(`  Franchise    ${DEFAULT_FRANCHISE.username} / ${DEFAULT_FRANCHISE.password}`);
    console.log(`  Distributor  ${DEFAULT_DISTRIBUTOR.username} / ${DEFAULT_DISTRIBUTOR.password}`);
    console.log('\nNew distributors: use sponsor username ARG100001');

    await mongoose.disconnect();
    console.log('\nDone. Database is clean and basic setup is ready.');
}

main().catch(async (err) => {
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
    process.exit(1);
});
