const Wallets = require('../MODALS/wallets');
const DistributorWallet = require('../MODALS/DistributorWallet');
const AdminWallet = require('../MODALS/AdminWallet');
const FranchiseWallet = require('../MODALS/FranchiseWallet');
const ThemeUserWallet = require('../MODALS/ThemeUserWallet');

const PANEL_WALLET_MODELS = {
    distributor: DistributorWallet,
    admin: AdminWallet,
    franchise: FranchiseWallet,
    theme: ThemeUserWallet,
};

/**
 * Build default wallet rows from the active wallet catalog.
 * Used by panel-specific wallet collections (not MLM UserWallet).
 */
async function buildDefaultWallets() {
    const catalog = await Wallets.find({ status: 1 });
    if (!catalog.length) {
        return [{
            id: 0,
            name: 'Main Wallet',
            wallet_type: 'wallet',
            wallet_status: 1,
            value: 0,
            updated_on: null,
            slug: 'main_wallet',
            count_in: null
        }];
    }
    return catalog.map((item, index) => ({
        id: index,
        name: item.name,
        wallet_type: item.wallet_type,
        wallet_status: 1,
        value: 0,
        updated_on: null,
        slug: item.slug,
        count_in: item.count_in
    }));
}

/**
 * Ensure a wallet document exists for the given model + uid.
 */
async function ensurePanelWallet(WalletModel, uid) {
    let doc = await WalletModel.findOne({ uid });
    if (doc) return { wallet: doc, created: false };

    const wallets = await buildDefaultWallets();
    doc = await new WalletModel({ uid, wallets }).save();
    return { wallet: doc, created: true };
}

function resolveWalletModel(panel) {
    return PANEL_WALLET_MODELS[panel] || null;
}

/**
 * Ensure a specific slug exists on an existing panel wallet document.
 * Pulls definition from the wallet catalog when available.
 */
async function ensureWalletSlug(WalletModel, uid, slug) {
    await ensurePanelWallet(WalletModel, uid);
    const doc = await WalletModel.findOne({ uid });
    if (!doc) return null;

    const existing = (doc.wallets || []).find((w) => w.slug === slug);
    if (existing) return doc;

    const catalogItem = await Wallets.findOne({ slug });
    const nextId = (doc.wallets || []).reduce((max, w) => Math.max(max, Number(w.id) || 0), -1) + 1;
    doc.wallets.push({
        id: nextId,
        name: catalogItem?.name || slug,
        wallet_type: catalogItem?.wallet_type || 'wallet',
        wallet_status: 1,
        value: 0,
        updated_on: null,
        slug,
        count_in: catalogItem?.count_in || null
    });
    await doc.save();
    return doc;
}

/**
 * Return wallet entry rows for the given panel/uid filtered by slugs.
 */
async function getPanelWallets(panel, uid, slugs = []) {
    const WalletModel = resolveWalletModel(panel);
    if (!WalletModel) return [];

    for (const slug of slugs) {
        await ensureWalletSlug(WalletModel, uid, slug);
    }

    const rows = await WalletModel.aggregate([
        { $match: { uid: Number(uid) } },
        { $unwind: '$wallets' },
        ...(slugs.length ? [{ $match: { 'wallets.slug': { $in: slugs } } }] : []),
        { $group: { _id: '$_id', wallets: { $push: '$wallets' } } }
    ]);

    return rows.length ? rows[0].wallets : [];
}

/**
 * Set a wallet slug value on a panel wallet document.
 */
async function updatePanelWalletValue(panel, uid, slug, newValue) {
    const WalletModel = resolveWalletModel(panel);
    if (!WalletModel) return null;

    await ensureWalletSlug(WalletModel, uid, slug);

    return WalletModel.findOneAndUpdate(
        { uid: Number(uid), 'wallets.slug': slug },
        { $set: { 'wallets.$.value': Number(newValue), 'wallets.$.updated_on': new Date() } },
        { new: true }
    );
}

async function getWalletBalance(panel, uid, slug) {
    const wallets = await getPanelWallets(panel, uid, [slug]);
    const entry = wallets.find((w) => w.slug === slug);
    return entry ? Number(entry.value) || 0 : 0;
}

module.exports = {
    buildDefaultWallets,
    ensurePanelWallet,
    resolveWalletModel,
    ensureWalletSlug,
    getPanelWallets,
    updatePanelWalletValue,
    getWalletBalance,
    PANEL_WALLET_MODELS
};
