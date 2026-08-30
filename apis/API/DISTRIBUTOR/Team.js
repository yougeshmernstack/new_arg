const Distributor = require('../../MODALS/Distributor');
const Franchise = require('../../MODALS/Franchise');
const AdminData = require('../../MODALS/AdminData');
const Package = require('../../MODALS/Package');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { getChild } = require('../../SERVICES/BinaryPlacement');
const {
    calculate2to1Match,
    getConsumedBv
} = require('../../SERVICES/BinaryMatching');
const {
    getAvailableRepurchaseVolumes,
    calculateRepurchaseMatch
} = require('../../SERVICES/RepurchaseMatching');

const TREE_NODE_SELECT =
    'uid username name parent_Id position joining_date activated_package_id status package_bv';

function sanitizeMember(doc, extras = {}) {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    delete obj.password;
    return { ...obj, ...extras };
}

function toTreeNode(doc) {
    if (!doc) return null;
    return {
        uid: doc.uid,
        username: doc.username,
        name: doc.name,
        parent_Id: doc.parent_Id ?? null,
        position: doc.position ?? null,
        joining_date: doc.joining_date || null,
        activated_package_id: doc.activated_package_id ?? null,
        status: doc.status || null,
        package_name: null,
        left_team: 0,
        right_team: 0,
        left_business: 0,
        right_business: 0,
        left: null,
        right: null
    };
}

async function getTreeChild(parentUid, position) {
    return Distributor.findOne({
        parent_Id: Number(parentUid),
        position
    }).select(TREE_NODE_SELECT);
}

/**
 * Team count + package BV for an entire binary leg (inclusive of root child).
 */
async function getBinaryLegStats(rootChildUid) {
    if (rootChildUid == null) return { team: 0, bv: 0 };

    let team = 0;
    let bv = 0;
    const visited = new Set();
    let frontier = [Number(rootChildUid)];

    while (frontier.length) {
        const batch = frontier.filter((id) => !visited.has(id));
        if (!batch.length) break;
        batch.forEach((id) => visited.add(id));

        const members = await Distributor.find({ uid: { $in: batch } })
            .select('uid package_bv');

        for (const member of members) {
            team += 1;
            bv += Number(member.package_bv) || 0;
        }

        const children = await Distributor.find({ parent_Id: { $in: batch } })
            .select('uid');
        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return { team, bv: Math.round(bv * 100) / 100 };
}

function collectTreeNodes(node, list = []) {
    if (!node) return list;
    list.push(node);
    collectTreeNodes(node.left, list);
    collectTreeNodes(node.right, list);
    return list;
}

async function enrichBinaryTreeDetails(tree) {
    if (!tree) return null;

    const nodes = collectTreeNodes(tree);
    const packageIds = [
        ...new Set(
            nodes
                .map((n) => Number(n.activated_package_id))
                .filter((id) => Number.isFinite(id) && id > 0)
        )
    ];

    const packages = packageIds.length
        ? await Package.find({ packageId: { $in: packageIds } }).select('packageId name')
        : [];
    const packageMap = new Map(packages.map((p) => [Number(p.packageId), p.name]));

    await Promise.all(
        nodes.map(async (node) => {
            const [leftStats, rightStats] = await Promise.all([
                getBinaryLegStats(node._leftUid),
                getBinaryLegStats(node._rightUid)
            ]);

            node.package_name = packageMap.get(Number(node.activated_package_id)) || null;
            node.left_team = leftStats.team;
            node.right_team = rightStats.team;
            node.left_business = leftStats.bv;
            node.right_business = rightStats.bv;
            delete node._leftUid;
            delete node._rightUid;
            delete node.activated_package_id;
        })
    );

    return tree;
}

/**
 * Collect entire subtree under a direct child (BFS via parent_Id).
 */
async function fetchSubtreeMembers(rootChildUid) {
    const results = [];
    const visited = new Set();
    let frontier = [Number(rootChildUid)];

    while (frontier.length) {
        const batch = frontier.filter((id) => !visited.has(id));
        if (!batch.length) break;
        batch.forEach((id) => visited.add(id));

        const members = await Distributor.find({ uid: { $in: batch } })
            .select('uid username name email mobile parent_Id position joining_date status')
            .sort({ joining_date: 1 });

        for (const member of members) {
            results.push(
                sanitizeMember(member, {
                    parent_Id: member.parent_Id ?? null,
                    position: member.position ?? null
                })
            );
        }

        const children = await Distributor.find({ parent_Id: { $in: batch } })
            .select('uid')
            .sort({ position: 1 });

        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return results;
}

/**
 * True when targetUid is viewerUid or sits under them via binary parent_Id.
 */
async function isInBinaryDownline(viewerUid, targetUid) {
    const viewer = Number(viewerUid);
    const target = Number(targetUid);
    if (!Number.isFinite(viewer) || !Number.isFinite(target)) return false;
    if (viewer === target) return true;

    let current = await Distributor.findOne({ uid: target }).select('uid parent_Id');
    const visited = new Set([target]);

    while (current?.parent_Id != null) {
        const parentUid = Number(current.parent_Id);
        if (parentUid === viewer) return true;
        if (visited.has(parentUid)) break;
        visited.add(parentUid);
        current = await Distributor.findOne({ uid: parentUid }).select('uid parent_Id');
    }
    return false;
}

async function buildBinaryTree(rootUid, maxDepth = 2) {
    const root = await Distributor.findOne({ uid: Number(rootUid) })
        .select(TREE_NODE_SELECT);
    if (!root) return null;

    async function attachChildren(node, depthLeft) {
        if (!node) return node;

        const [leftDoc, rightDoc] = await Promise.all([
            getTreeChild(node.uid, 'left'),
            getTreeChild(node.uid, 'right')
        ]);

        node._leftUid = leftDoc?.uid ?? null;
        node._rightUid = rightDoc?.uid ?? null;

        if (depthLeft <= 0) {
            node.expandable = !!(leftDoc || rightDoc);
            return node;
        }

        node.left = leftDoc ? toTreeNode(leftDoc) : null;
        node.right = rightDoc ? toTreeNode(rightDoc) : null;
        node.expandable = !!(node.left || node.right);

        if (node.left) await attachChildren(node.left, depthLeft - 1);
        if (node.right) await attachChildren(node.right, depthLeft - 1);
        return node;
    }

    const tree = toTreeNode(root);
    await attachChildren(tree, maxDepth);
    return enrichBinaryTreeDetails(tree);
}

async function resolveSponsorUsername(sponsorUid, sponsorType) {
    if (sponsorUid == null) return null;
    const uid = Number(sponsorUid);

    if (sponsorType === 'franchise') {
        const franchise = await Franchise.findOne({ uid }).select('username');
        return franchise?.username || null;
    }
    if (sponsorType === 'admin') {
        const admin = await AdminData.findOne({ uid }).select('username');
        return admin?.username || null;
    }
    if (sponsorType === 'distributor') {
        const distributor = await Distributor.findOne({ uid }).select('username');
        return distributor?.username || null;
    }

    // Fallback when type is missing: prefer exact panel match order by likelihood
    const distributor = await Distributor.findOne({ uid }).select('username');
    if (distributor) return distributor.username;
    const franchise = await Franchise.findOne({ uid }).select('username');
    if (franchise) return franchise.username;
    const admin = await AdminData.findOne({ uid }).select('username');
    return admin?.username || null;
}

async function resolveSponsorUsernamesForMembers(members) {
    const map = new Map();
    await Promise.all(
        members.map(async (member) => {
            const key = `${member.sponsor_type || ''}:${member.sponsor_Id}`;
            if (map.has(key)) return;
            const username = await resolveSponsorUsername(member.sponsor_Id, member.sponsor_type);
            map.set(key, username);
        })
    );
    return map;
}

/**
 * Walk distributor downline level-by-level.
 * Each uid appears at most once (visited set) — prevents duplicate rows across levels.
 */
async function fetchDownlineByLevels(rootUid, { includeLevels, maxLevel = 20 } = {}) {
    const results = [];
    const visited = new Set([Number(rootUid)]);
    let currentUids = [Number(rootUid)];
    let level = 1;

    while (level <= maxLevel && currentUids.length) {
        const members = await Distributor.find({
            sponsor_Id: { $in: currentUids },
            uid: { $nin: [...visited] }
        })
            .select('-password')
            .sort({ joining_date: -1 });

        if (!members.length) break;

        const nextUids = [];
        const levelMembers = [];

        for (const member of members) {
            const memberUid = Number(member.uid);
            if (visited.has(memberUid)) continue;
            visited.add(memberUid);
            nextUids.push(memberUid);
            levelMembers.push(member);
        }

        if (!nextUids.length) break;

        const shouldInclude = !includeLevels || includeLevels.includes(level);
        if (shouldInclude) {
            const sponsorMap = await resolveSponsorUsernamesForMembers(levelMembers);
            for (const member of levelMembers) {
                const key = `${member.sponsor_type || ''}:${member.sponsor_Id}`;
                results.push(
                    sanitizeMember(member, {
                        level,
                        sponsor_username: sponsorMap.get(key) || null
                    })
                );
            }
        }

        currentUids = nextUids;
        level += 1;
    }

    return results;
}

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

        const members = await Distributor.find({ uid: { $in: batch } })
            .select('uid package_bv');

        for (const member of members) {
            total += Number(member.package_bv) || 0;
        }

        const children = await Distributor.find({ parent_Id: { $in: batch } })
            .select('uid');
        frontier = children.map((c) => Number(c.uid)).filter((id) => !visited.has(id));
    }

    return Math.round(total * 100) / 100;
}

/**
 * Binary BV snapshot for distributor dashboard.
 * Left/Right BV = live team package_bv on each leg.
 * Dummy BV = admin/power volume stored on distributor.
 * Match BV (hero) = lifetime matched from closings; also returns closed BV total.
 * pairable_bv = current pairable volume under 1:1 × 1250 after prior consumption.
 */
async function buildBinarySummary(uid) {
    const myUid = Number(uid);
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const [me, leftChild, rightChild, consumed] = await Promise.all([
        Distributor.findOne({ uid: myUid }).select(
            'left_bv right_bv match_bv left_dummy_bv right_dummy_bv package_bv'
        ),
        getChild(myUid, 'left'),
        getChild(myUid, 'right'),
        getConsumedBv(myUid)
    ]);

    const [leftTeamBv, rightTeamBv] = await Promise.all([
        sumBinaryLegBv(leftChild?.uid),
        sumBinaryLegBv(rightChild?.uid)
    ]);

    const leftDummyBv = round2(me?.left_dummy_bv);
    const rightDummyBv = round2(me?.right_dummy_bv);

    // Live team BV from package purchases on each binary leg
    const leftBv = leftTeamBv;
    const rightBv = rightTeamBv;

    const leftTotal = round2(leftBv + leftDummyBv);
    const rightTotal = round2(rightBv + rightDummyBv);
    const leftConsumed = round2(consumed?.left || 0);
    const rightConsumed = round2(consumed?.right || 0);
    const matchedTotal = round2(consumed?.matched || 0);
    // Volume removed across all closings (includes equal-cut on left)
    const closedBv = round2(leftConsumed + rightConsumed);
    const leftAvail = round2(Math.max(0, leftTotal - leftConsumed));
    const rightAvail = round2(Math.max(0, rightTotal - rightConsumed));
    const pairableBv = round2(calculate2to1Match(leftAvail, rightAvail).matched_bv);

    return {
        left_bv: leftBv,
        right_bv: rightBv,
        // Lifetime totals — fill when matching closing runs
        match_bv: matchedTotal,
        closed_bv: closedBv,
        matched_bv: matchedTotal,
        // Still available for next close
        pairable_bv: pairableBv,
        left_dummy_bv: leftDummyBv,
        right_dummy_bv: rightDummyBv,
        left_total_bv: leftTotal,
        right_total_bv: rightTotal,
        left_available_bv: leftAvail,
        right_available_bv: rightAvail
    };
}

/**
 * Repurchase Matching BV snapshot — product purchases only, no dummy.
 * Match BV uses 1:1 × 500 cut.
 */
async function buildRepurchaseSummary(uid) {
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const volumes = await getAvailableRepurchaseVolumes(uid);
    const matchBv = round2(
        calculateRepurchaseMatch(volumes.leftAvail, volumes.rightAvail).matched_bv
    );

    return {
        left_bv: volumes.leftTeamBv,
        right_bv: volumes.rightTeamBv,
        match_bv: matchBv,
        left_available_bv: volumes.leftAvail,
        right_available_bv: volumes.rightAvail
    };
}

/**
 * Dashboard / summary counts for a distributor's team.
 * total/active use sponsor downline (generation). left/right use binary parent tree.
 */
async function buildTeamSummary(uid) {
    const myUid = Number(uid);
    const isActive = (m) => String(m.status || '').toLowerCase() === 'active';

    const countSide = (members) => {
        const total = members.length;
        const active = members.filter(isActive).length;
        return {
            total,
            active,
            inactive: Math.max(total - active, 0)
        };
    };

    const [directTotal, directActive, leftChild, rightChild, downline] = await Promise.all([
        Distributor.countDocuments({ sponsor_Id: myUid, uid: { $ne: myUid } }),
        Distributor.countDocuments({ sponsor_Id: myUid, uid: { $ne: myUid }, status: 'active' }),
        getChild(myUid, 'left'),
        getChild(myUid, 'right'),
        fetchDownlineByLevels(myUid, { maxLevel: 50 })
    ]);

    const [leftMembers, rightMembers] = await Promise.all([
        leftChild ? fetchSubtreeMembers(leftChild.uid) : Promise.resolve([]),
        rightChild ? fetchSubtreeMembers(rightChild.uid) : Promise.resolve([])
    ]);

    const totalTeam = downline.length;
    const activeTeam = downline.filter(isActive).length;
    const inactiveTeam = Math.max(totalTeam - activeTeam, 0);
    const left = countSide(leftMembers);
    const right = countSide(rightMembers);

    return {
        totalTeam,
        activeTeam,
        inactiveTeam,
        directTeam: directTotal,
        directActive,
        directInactive: Math.max(directTotal - directActive, 0),
        leftTeam: left.total,
        leftActive: left.active,
        leftInactive: left.inactive,
        rightTeam: right.total,
        rightActive: right.active,
        rightInactive: right.inactive
    };
}

class DISTRIBUTOR_TEAM {
    async getDirectTeam(req, res) {
        try {
            const { uid } = req.user;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
            const search = String(req.query.search || '').trim();
            const myUid = Number(uid);

            const query = {
                sponsor_Id: myUid,
                uid: { $ne: myUid }
            };
            if (search) {
                const regex = new RegExp(search, 'i');
                query.$or = [{ username: regex }, { name: regex }, { email: regex }, { mobile: regex }];
            }

            const [rows, total] = await Promise.all([
                Distributor.find(query)
                    .select('-password')
                    .sort({ joining_date: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit),
                Distributor.countDocuments(query)
            ]);

            const sponsorMap = await resolveSponsorUsernamesForMembers(rows);
            const data = rows.map((row) => {
                const key = `${row.sponsor_type || ''}:${row.sponsor_Id}`;
                return sanitizeMember(row, {
                    level: 1,
                    sponsor_username: sponsorMap.get(key) || null
                });
            });

            return res.status(200).json({
                status: 200,
                message: 'Direct team fetched.',
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getGenerationTeam(req, res) {
        try {
            const { uid } = req.user;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
            const search = String(req.query.search || '').trim();
            const maxLevel = Math.min(Math.max(parseInt(req.query.maxLevel, 10) || 20, 1), 50);

            let all = await fetchDownlineByLevels(Number(uid), { maxLevel });

            if (search) {
                const regex = new RegExp(search, 'i');
                all = all.filter(
                    (row) =>
                        regex.test(row.username || '') ||
                        regex.test(row.name || '') ||
                        regex.test(row.email || '') ||
                        regex.test(row.mobile || '')
                );
            }

            const total = all.length;
            const data = all.slice((page - 1) * limit, page * limit);

            return res.status(200).json({
                status: 200,
                message: 'Generation team fetched.',
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getBinaryLegs(req, res) {
        try {
            const myUid = Number(req.user.uid);
            const [leftChild, rightChild] = await Promise.all([
                getChild(myUid, 'left'),
                getChild(myUid, 'right')
            ]);

            const [left, right] = await Promise.all([
                leftChild ? fetchSubtreeMembers(leftChild.uid) : Promise.resolve([]),
                rightChild ? fetchSubtreeMembers(rightChild.uid) : Promise.resolve([])
            ]);

            return res.status(200).json({
                status: 200,
                message: 'Binary legs fetched.',
                data: {
                    left,
                    right,
                    counts: { left: left.length, right: right.length }
                }
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getBinaryTree(req, res) {
        try {
            const myUid = Number(req.user.uid);
            // depth=2 → root + 2 child levels (3 visual levels)
            const depth = Math.min(Math.max(parseInt(req.query.depth, 10) || 2, 1), 10);
            const requestedRoot = req.query.root != null && req.query.root !== ''
                ? Number(req.query.root)
                : myUid;

            if (!Number.isFinite(requestedRoot)) {
                return res.status(400).json({ status: 400, message: 'Invalid root uid.' });
            }

            const allowed = await isInBinaryDownline(myUid, requestedRoot);
            if (!allowed) {
                return res.status(403).json({
                    status: 403,
                    message: 'You can only open trees within your binary downline.'
                });
            }

            const tree = await buildBinaryTree(requestedRoot, depth);

            return res.status(200).json({
                status: 200,
                message: 'Binary tree fetched.',
                data: tree
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
}

const DistributorTeam = new DISTRIBUTOR_TEAM();
module.exports = DistributorTeam;
module.exports.buildTeamSummary = buildTeamSummary;
module.exports.buildBinarySummary = buildBinarySummary;
module.exports.buildRepurchaseSummary = buildRepurchaseSummary;
