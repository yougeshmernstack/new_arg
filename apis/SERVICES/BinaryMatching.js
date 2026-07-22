const Distributor = require('../MODALS/Distributor');
const MatchingHistory = require('../MODALS/MatchingHistory');
const { getChild } = require('./BinaryPlacement');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Sum package_bv across an entire binary leg (root child + descendants).
 */
async function sumBinaryLegBv(rootChildUid) {
    if (rootChildUid == null) return 0;

    let total = 0;
    const visited = new Set();
    let frontier = [Number(rootChildUid)];

    while (frontier.length) {
        const batch = frontier.filter((id) => !visited.has(id));
        if (!batch.length) break;
        batch.forEach((id) => visited.add(id));

        const members = await Distributor.find({ uid: { $in: batch } }).select('uid package_bv');
        for (const member of members) {
            total += Number(member.package_bv) || 0;
        }

        const children = await Distributor.find({ parent_Id: { $in: batch } }).select('uid');
        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return round2(total);
}

/**
 * Collect all uids under a binary root (inclusive).
 */
async function collectSubtreeUids(rootChildUid) {
    if (rootChildUid == null) return [];

    const results = [];
    const visited = new Set();
    let frontier = [Number(rootChildUid)];

    while (frontier.length) {
        const batch = frontier.filter((id) => !visited.has(id));
        if (!batch.length) break;
        batch.forEach((id) => visited.add(id));
        results.push(...batch);

        const children = await Distributor.find({ parent_Id: { $in: batch } }).select('uid');
        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return results;
}

/**
 * Must have ≥1 personally sponsored (direct) member on left leg and ≥1 on right leg.
 */
async function hasDirectOnBothSides(uid) {
    const myUid = Number(uid);
    const [leftChild, rightChild] = await Promise.all([
        getChild(myUid, 'left'),
        getChild(myUid, 'right')
    ]);

    if (!leftChild || !rightChild) return false;

    const [leftUids, rightUids] = await Promise.all([
        collectSubtreeUids(leftChild.uid),
        collectSubtreeUids(rightChild.uid)
    ]);

    const [leftDirect, rightDirect] = await Promise.all([
        Distributor.exists({ uid: { $in: leftUids }, sponsor_Id: myUid }),
        Distributor.exists({ uid: { $in: rightUids }, sponsor_Id: myUid })
    ]);

    return Boolean(leftDirect && rightDirect);
}

/**
 * Total BV already consumed by prior matching closings.
 */
async function getConsumedBv(uid) {
    const rows = await MatchingHistory.aggregate([
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
 * Matching cut size — business matches only in multiples of this.
 * One side must stay / become CUT (1250) ahead of the other.
 */
const MATCH_CUT = 1250;

function floorToCut(amount, cut = MATCH_CUT) {
    const n = Number(amount) || 0;
    if (n < cut) return 0;
    return Math.floor(n / cut) * cut;
}

/**
 * Binary match — 1:1 in multiples of `cut` (default MATCH_CUT = 1250).
 *
 * Rules:
 * - Match only in multiples of cut
 * - One side must have at least cut more business than the other
 * - If both sides equal → first cut from LEFT (no income on that cut),
 *   so right becomes cut ahead, then 1:1 match
 * - Leftover (< cut remainder + unmatched) carries forward — no income
 */
function calculate2to1Match(leftAvail, rightAvail, matchCut = MATCH_CUT) {
    const originalLeft = round2(leftAvail);
    const originalRight = round2(rightAvail);
    const cut = Number(matchCut) > 0 ? Number(matchCut) : MATCH_CUT;

    const empty = {
        matched_bv: 0,
        left_deducted: 0,
        right_deducted: 0,
        left_equal_cut: 0,
        stronger_side: 'equal',
        ratio: '1:1',
        cut,
        left_after: originalLeft,
        right_after: originalRight,
        left_leftover: originalLeft,
        right_leftover: originalRight
    };

    if (originalLeft <= 0 || originalRight <= 0) return empty;

    let left = originalLeft;
    let right = originalRight;
    let leftEqualCut = 0;

    // Equal sides → cut from left so one side is cut ahead
    if (left === right) {
        if (left < cut) return empty;
        leftEqualCut = cut;
        left = round2(left - cut);
    }

    // One side must have at least cut more business
    const diff = round2(Math.abs(left - right));
    if (diff < cut) return empty;

    // 1:1 match in multiples of cut
    const matched_bv = floorToCut(Math.min(left, right), cut);
    if (matched_bv <= 0) return empty;

    const left_deducted = round2(leftEqualCut + matched_bv);
    const right_deducted = matched_bv;

    const left_after = round2(originalLeft - left_deducted);
    const right_after = round2(originalRight - right_deducted);

    let stronger_side = 'equal';
    if (left_after > right_after) stronger_side = 'left';
    else if (right_after > left_after) stronger_side = 'right';

    return {
        matched_bv,
        left_deducted,
        right_deducted,
        left_equal_cut: leftEqualCut,
        stronger_side,
        ratio: '1:1',
        cut,
        left_after,
        right_after,
        left_leftover: left_after,
        right_leftover: right_after
    };
}

/**
 * Live team BV + dummy − already consumed = currently available for matching.
 */
async function getAvailableBinaryVolumes(uid) {
    const myUid = Number(uid);
    const [me, leftChild, rightChild, consumed] = await Promise.all([
        Distributor.findOne({ uid: myUid }).select('left_dummy_bv right_dummy_bv match_bv username name'),
        getChild(myUid, 'left'),
        getChild(myUid, 'right'),
        getConsumedBv(myUid)
    ]);

    const [leftTeamBv, rightTeamBv] = await Promise.all([
        sumBinaryLegBv(leftChild?.uid),
        sumBinaryLegBv(rightChild?.uid)
    ]);

    const leftDummy = round2(me?.left_dummy_bv);
    const rightDummy = round2(me?.right_dummy_bv);
    const leftTotal = round2(leftTeamBv + leftDummy);
    const rightTotal = round2(rightTeamBv + rightDummy);
    const leftAvail = round2(Math.max(0, leftTotal - consumed.left));
    const rightAvail = round2(Math.max(0, rightTotal - consumed.right));

    return {
        me,
        leftTeamBv,
        rightTeamBv,
        leftDummy,
        rightDummy,
        leftTotal,
        rightTotal,
        leftAvail,
        rightAvail,
        consumed
    };
}

module.exports = {
    round2,
    MATCH_CUT,
    floorToCut,
    sumBinaryLegBv,
    collectSubtreeUids,
    hasDirectOnBothSides,
    getConsumedBv,
    calculate2to1Match,
    getAvailableBinaryVolumes
};
