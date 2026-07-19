const Distributor = require('../MODALS/Distributor');

const VALID_PLACEMENTS = ['left', 'right'];

class PlacementError extends Error {
    constructor(message, code = 400) {
        super(message);
        this.code = code;
        this.isPlacementError = true;
    }
}

async function getChild(parentUid, position) {
    return Distributor.findOne({
        parent_Id: Number(parentUid),
        position
    }).select('uid username name parent_Id position');
}

/**
 * Walk one side until an open slot is found (extreme / spillover rule).
 * If sponsor's side is empty → place directly under sponsor.
 * If filled → keep walking that side until an empty seat.
 */
async function findOpenSlot(rootUid, position) {
    let cursor = Number(rootUid);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const child = await getChild(cursor, position);
        if (!child) {
            return { parent_Id: cursor, position };
        }
        cursor = Number(child.uid);
    }
}

/**
 * Resolve binary parent_Id + position under a distributor sponsor.
 * User chooses only left | right; extreme spillover is applied as the rule.
 * @param {number} sponsorUid - distributor uid (placement root)
 * @param {string} placement - left | right
 * @returns {Promise<{ parent_Id: number, position: 'left'|'right' }>}
 */
async function resolvePlacement(sponsorUid, placement) {
    const rootUid = Number(sponsorUid);
    const choice = String(placement || '').trim().toLowerCase();

    // Backward-compatible aliases from older clients
    const normalized =
        choice === 'extreme_left' ? 'left'
            : choice === 'extreme_right' ? 'right'
                : choice;

    if (!VALID_PLACEMENTS.includes(normalized)) {
        throw new PlacementError('Placement must be left or right.');
    }

    const sponsorExists = await Distributor.findOne({ uid: rootUid }).select('uid');
    if (!sponsorExists) {
        throw new PlacementError('Binary placement sponsor must be a distributor.');
    }

    return findOpenSlot(rootUid, normalized);
}

function isDuplicateKeyError(error) {
    return Boolean(error && (error.code === 11000 || error.code === 11001));
}

module.exports = {
    VALID_PLACEMENTS,
    PlacementError,
    getChild,
    resolvePlacement,
    isDuplicateKeyError
};
