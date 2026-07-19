const AdminData = require('../MODALS/AdminData');
const Franchise = require('../MODALS/Franchise');
const Distributor = require('../MODALS/Distributor');
const ThemeUser = require('../MODALS/ThemeUser');
const { getNextSequence } = require('./sequence');

const PANEL_CONFIG = {
    admin: {
        model: AdminData,
        role: 'admin',
        rolesField: true,
        uidKey: 'admin_uid'
    },
    franchise: {
        model: Franchise,
        role: 'franchise',
        rolesField: false,
        uidKey: 'franchise_uid'
    },
    distributor: {
        model: Distributor,
        role: 'distributor',
        rolesField: false,
        uidKey: 'distributor_uid'
    },
    theme: {
        model: ThemeUser,
        role: 'theme',
        rolesField: false,
        uidKey: 'theme_uid'
    }
};

function getPanelConfig(routeFor) {
    return PANEL_CONFIG[routeFor] || null;
}

async function findPanelByUid(routeFor, uid) {
    const config = getPanelConfig(routeFor);
    if (!config) return null;
    return config.model.findOne({ uid: Number(uid) });
}

async function findPanelByUsername(routeFor, username) {
    const config = getPanelConfig(routeFor);
    if (!config) return null;
    return config.model.findOne({ username });
}

/**
 * Next uid for a wellness panel (independent sequences per panel).
 */
async function nextPanelUid(routeFor) {
    const config = getPanelConfig(routeFor);
    if (!config || !config.uidKey) {
        throw new Error(`No uid sequence for panel: ${routeFor}`);
    }
    return getNextSequence(config.uidKey);
}

/**
 * Roles array used by permission checks for a panel identity doc.
 */
function getPanelRoles(routeFor, doc) {
    if (!doc) return [];
    if (routeFor === 'admin') {
        return Array.isArray(doc.roles) && doc.roles.length ? doc.roles : ['admin'];
    }
    return [routeFor];
}

/**
 * Touch lastActivity on the correct panel table.
 */
async function touchLastActivity(routeFor, uid) {
    const config = getPanelConfig(routeFor);
    if (!config) return;
    await config.model.updateOne({ uid: Number(uid) }, { $set: { lastActivity: new Date() } });
}

module.exports = {
    PANEL_CONFIG,
    getPanelConfig,
    findPanelByUid,
    findPanelByUsername,
    nextPanelUid,
    getPanelRoles,
    touchLastActivity
};
