const Distributor = require('../MODALS/Distributor');
const RepurchaseMatchingHistory = require('../MODALS/RepurchaseMatchingHistory');
const { getChild } = require('./BinaryPlacement');
const {
    round2,
    collectSubtreeUids,
    hasDirectOnBothSides,
    calculate2to1Match
} = require('./BinaryMatching');

/** Repurchase matching cut — 1:1 in multiples of 500 (no dummy). */
const REPURCHASE_MATCH_CUT = 500;

/**
 * Sum repurchase_bv across an entire binary leg (root child + descendants).
 */
async function sumRepurchaseLegBv(rootChildUid) {
    if (rootChildUid == null) return 0;

    let total = 0;
    const visited = new Set();
    let frontier = [Number(rootChildUid)];

    while (frontier.length) {
        const batch = frontier.filter((id) => !visited.has(id));
        if (!batch.length) break;
        batch.forEach((id) => visited.add(id));

        const members = await Distributor.find({ uid: { $in: batch } }).select('uid repurchase_bv');
        for (const member of members) {
            total += Number(member.repurchase_bv) || 0;
        }

        const children = await Distributor.find({ parent_Id: { $in: batch } }).select('uid');
        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return round2(total);
}

/**
 * Total repurchase BV already consumed by prior closings.
 */
async function getConsumedRepurchaseBv(uid) {
    const rows = await RepurchaseMatchingHistory.aggregate([
        { $match: { uid: Number(uid) } },
        {
            $group: {
                _id: null,
                left: { $sum: '$left_deducted' },
                right: { $sum: '$right_deducted' },
                matched: { $sum: '$matched_bv' }
            }
        }
    ]);
    const row = rows[0] || {};
    return {
        left: round2(row.left),
        right: round2(row.right),
        matched: round2(row.matched)
    };
}

/**
 * Live team repurchase BV − consumed = available for matching (no dummy).
 */
async function getAvailableRepurchaseVolumes(uid) {
    const myUid = Number(uid);
    const [me, leftChild, rightChild, consumed] = await Promise.all([
        Distributor.findOne({ uid: myUid }).select('username name match_repurchase_bv'),
        getChild(myUid, 'left'),
        getChild(myUid, 'right'),
        getConsumedRepurchaseBv(myUid)
    ]);

    const [leftTeamBv, rightTeamBv] = await Promise.all([
        sumRepurchaseLegBv(leftChild?.uid),
        sumRepurchaseLegBv(rightChild?.uid)
    ]);

    const leftAvail = round2(Math.max(0, leftTeamBv - consumed.left));
    const rightAvail = round2(Math.max(0, rightTeamBv - consumed.right));

    return {
        me,
        leftTeamBv,
        rightTeamBv,
        leftAvail,
        rightAvail,
        consumed
    };
}

function calculateRepurchaseMatch(leftAvail, rightAvail) {
    return calculate2to1Match(leftAvail, rightAvail, REPURCHASE_MATCH_CUT);
}

module.exports = {
    REPURCHASE_MATCH_CUT,
    round2,
    collectSubtreeUids,
    hasDirectOnBothSides,
    sumRepurchaseLegBv,
    getConsumedRepurchaseBv,
    getAvailableRepurchaseVolumes,
    calculateRepurchaseMatch
};
