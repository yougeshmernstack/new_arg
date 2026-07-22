const Distributor = require('../MODALS/Distributor');
const PlansInfo = require('../MODALS/Plan');
const MatchingHistory = require('../MODALS/MatchingHistory');
const RepurchaseMatchingHistory = require('../MODALS/RepurchaseMatchingHistory');
const Transaction = require('../MODALS/transactions');
const Action = require('./Activity');
const {
    round2,
    hasDirectOnBothSides,
    calculate2to1Match,
    getAvailableBinaryVolumes
} = require('./BinaryMatching');
const {
    getAvailableRepurchaseVolumes,
    calculateRepurchaseMatch
} = require('./RepurchaseMatching');
const RankRewardService = require('./RankReward');
const { errorLogger, logConditionFailure } = require('../utils/logger');

class ROI {
    /**
     * Binary matching income closing (1:1 in multiples of 1250).
     * - Requires ≥1 direct on left and ≥1 direct on right
     * - Match only multiples of 1250; one side must be ≥1250 ahead
     * - If equal → cut 1250 from left first, then match
     * - Leftover carries forward (no income)
     * - Matched BV earns plan.matching_income (default 10%)
     */
    async matchingIncomeClosing() {
        console.log('Matching income closing started at:', new Date());
        logConditionFailure(`MATCHING INCOME CLOSING STARTED AT ${new Date().toISOString()}`);

        try {
            const plan = (await PlansInfo.ensurePlanData?.()) || (await PlansInfo.findOne({ planId: 1 })) || (await PlansInfo.findOne());
            const setting = plan?.matching_income;

            if (!setting || Number(setting.status) === 0) {
                console.log('Matching income is disabled in plan.');
                return { processed: 0, matched: 0, message: 'Matching income disabled' };
            }

            const incomeType = setting.income_type === 'fixed' ? 'fixed' : 'percentage';
            const incomeRate = Number(setting.amount) || 0;
            if (incomeRate <= 0) {
                console.log('Matching income amount is 0.');
                return { processed: 0, matched: 0, message: 'Matching income amount is 0' };
            }

            const distributors = await Distributor.find({
                status: 'active',
                blockStatus: { $ne: 1 }
            }).select('uid username name status blockStatus left_dummy_bv right_dummy_bv');

            let processed = 0;
            let matchedCount = 0;
            let totalIncome = 0;

            for (const dist of distributors) {
                try {
                    const uid = Number(dist.uid);

                    const eligible = await hasDirectOnBothSides(uid);
                    if (!eligible) continue;

                    const volumes = await getAvailableBinaryVolumes(uid);
                    const match = calculate2to1Match(volumes.leftAvail, volumes.rightAvail);

                    if (match.matched_bv <= 0) continue;

                    let incomeAmount;
                    if (incomeType === 'fixed') {
                        incomeAmount = incomeRate;
                    } else {
                        incomeAmount = round2((match.matched_bv * incomeRate) / 100);
                    }

                    if (incomeAmount <= 0) continue;

                    const ratioLabel = match.ratio || '1:1';

                    const savedTx = await Action.actInternally(uid, {
                        amount: incomeAmount,
                        activity_name: 'matching_income',
                        Status: 1,
                        to_from: uid,
                        panel: 'distributor',
                        business: match.matched_bv,
                        income_percent: incomeType === 'fixed' ? 0 : incomeRate,
                        release: 1,
                        currentDate: new Date(),
                        metadata: {
                            ratio: ratioLabel,
                            cut: match.cut,
                            matched_bv: match.matched_bv,
                            left_deducted: match.left_deducted,
                            right_deducted: match.right_deducted,
                            left_equal_cut: match.left_equal_cut,
                            stronger_side: match.stronger_side,
                            left_leftover: match.left_leftover,
                            right_leftover: match.right_leftover,
                            left_avail_before: volumes.leftAvail,
                            right_avail_before: volumes.rightAvail
                        }
                    });

                    if (!savedTx) {
                        logConditionFailure(`matching_income credit failed for uid ${uid}`);
                        continue;
                    }

                    const txIds = (Array.isArray(savedTx) ? savedTx : [savedTx])
                        .map((t) => t?.tx_Id)
                        .filter((id) => id != null);

                    const equalNote = match.left_equal_cut
                        ? ` equal-cut L−${match.left_equal_cut};`
                        : '';

                    await MatchingHistory.create({
                        uid,
                        username: dist.username || '',
                        name: dist.name || '',
                        left_bv_before: volumes.leftAvail,
                        right_bv_before: volumes.rightAvail,
                        left_dummy_bv: volumes.leftDummy,
                        right_dummy_bv: volumes.rightDummy,
                        left_team_bv: volumes.leftTeamBv,
                        right_team_bv: volumes.rightTeamBv,
                        matched_bv: match.matched_bv,
                        left_deducted: match.left_deducted,
                        right_deducted: match.right_deducted,
                        stronger_side: match.stronger_side,
                        ratio: ratioLabel,
                        left_bv_after: match.left_after,
                        right_bv_after: match.right_after,
                        income_amount: incomeAmount,
                        income_percent: incomeType === 'fixed' ? 0 : incomeRate,
                        income_type: incomeType,
                        tx_Ids: txIds,
                        remark: `${ratioLabel}×${match.cut} match BV ${match.matched_bv};${equalNote} leftover L=${match.left_leftover} R=${match.right_leftover}`,
                        closing_date: new Date()
                    });

                    await Distributor.updateOne(
                        { uid },
                        {
                            $set: {
                                left_bv: match.left_after,
                                right_bv: match.right_after,
                                match_bv: round2(
                                    calculate2to1Match(match.left_after, match.right_after).matched_bv
                                )
                            }
                        }
                    );

                    // Check reward / royality / traveling_bonus ranks on lifetime matched BV
                    try {
                        const rankResult = await RankRewardService.checkAndAchieveForUid(uid, {
                            plan,
                            distributor: dist
                        });
                        if (rankResult.achieved?.length) {
                            console.log(
                                `Rank achieved uid=${uid}: ${rankResult.achieved.map((a) => `${a.type}#${a.rank_id}`).join(', ')}`
                            );
                        }
                    } catch (rankErr) {
                        errorLogger(rankErr);
                    }

                    processed += 1;
                    matchedCount += 1;
                    totalIncome = round2(totalIncome + incomeAmount);

                    console.log(
                        `Matched uid=${uid} cut=${match.cut} BV=${match.matched_bv} income=${incomeAmount} leftover L=${match.left_leftover} R=${match.right_leftover}`
                    );
                } catch (userErr) {
                    console.error(`Matching closing error for uid ${dist.uid}:`, userErr);
                    errorLogger(userErr);
                }
            }

            console.log(
                `Matching income closing done. matched=${matchedCount} income_total=${totalIncome}`
            );
            logConditionFailure(
                `MATCHING INCOME CLOSING DONE matched=${matchedCount} income_total=${totalIncome}`
            );

            return { processed, matched: matchedCount, totalIncome };
        } catch (error) {
            console.log(error);
            errorLogger(error);
            return { processed: 0, matched: 0, error: error.message };
        }
    }

    /**
     * Repurchase matching income closing (1:1 in multiples of 500).
     * Product BV only — no dummy business.
     * Uses plan.repurchase_matching_income (default 12%).
     */
    async repurchaseMatchingIncomeClosing() {
        console.log('Repurchase matching income closing started at:', new Date());
        logConditionFailure(`REPURCHASE MATCHING CLOSING STARTED AT ${new Date().toISOString()}`);

        try {
            const plan = (await PlansInfo.ensurePlanData?.()) || (await PlansInfo.findOne({ planId: 1 })) || (await PlansInfo.findOne());
            const setting = plan?.repurchase_matching_income;

            if (!setting || Number(setting.status) === 0) {
                console.log('Repurchase matching income is disabled in plan.');
                return { processed: 0, matched: 0, message: 'Repurchase matching income disabled' };
            }

            const incomeType = setting.income_type === 'fixed' ? 'fixed' : 'percentage';
            const incomeRate = Number(setting.amount) || 0;
            if (incomeRate <= 0) {
                console.log('Repurchase matching income amount is 0.');
                return { processed: 0, matched: 0, message: 'Repurchase matching income amount is 0' };
            }

            const distributors = await Distributor.find({
                status: 'active',
                blockStatus: { $ne: 1 }
            }).select('uid username name status blockStatus');

            let processed = 0;
            let matchedCount = 0;
            let totalIncome = 0;

            for (const dist of distributors) {
                try {
                    const uid = Number(dist.uid);

                    const eligible = await hasDirectOnBothSides(uid);
                    if (!eligible) continue;

                    const volumes = await getAvailableRepurchaseVolumes(uid);
                    const match = calculateRepurchaseMatch(volumes.leftAvail, volumes.rightAvail);

                    if (match.matched_bv <= 0) continue;

                    let incomeAmount;
                    if (incomeType === 'fixed') {
                        incomeAmount = incomeRate;
                    } else {
                        incomeAmount = round2((match.matched_bv * incomeRate) / 100);
                    }

                    if (incomeAmount <= 0) continue;

                    const ratioLabel = match.ratio || '1:1';

                    const savedTx = await Action.actInternally(uid, {
                        amount: incomeAmount,
                        activity_name: 'repurchase_matching_income',
                        Status: 1,
                        to_from: uid,
                        panel: 'distributor',
                        business: match.matched_bv,
                        income_percent: incomeType === 'fixed' ? 0 : incomeRate,
                        release: 1,
                        currentDate: new Date(),
                        metadata: {
                            type: 'repurchase',
                            ratio: ratioLabel,
                            cut: match.cut,
                            matched_bv: match.matched_bv,
                            left_deducted: match.left_deducted,
                            right_deducted: match.right_deducted,
                            left_equal_cut: match.left_equal_cut,
                            stronger_side: match.stronger_side,
                            left_leftover: match.left_leftover,
                            right_leftover: match.right_leftover,
                            left_avail_before: volumes.leftAvail,
                            right_avail_before: volumes.rightAvail
                        }
                    });

                    if (!savedTx) {
                        logConditionFailure(`repurchase_matching_income credit failed for uid ${uid}`);
                        continue;
                    }

                    const txIds = (Array.isArray(savedTx) ? savedTx : [savedTx])
                        .map((t) => t?.tx_Id)
                        .filter((id) => id != null);

                    const equalNote = match.left_equal_cut
                        ? ` equal-cut L−${match.left_equal_cut};`
                        : '';

                    await RepurchaseMatchingHistory.create({
                        uid,
                        username: dist.username || '',
                        name: dist.name || '',
                        left_bv_before: volumes.leftAvail,
                        right_bv_before: volumes.rightAvail,
                        left_team_bv: volumes.leftTeamBv,
                        right_team_bv: volumes.rightTeamBv,
                        matched_bv: match.matched_bv,
                        left_deducted: match.left_deducted,
                        right_deducted: match.right_deducted,
                        stronger_side: match.stronger_side,
                        ratio: ratioLabel,
                        left_bv_after: match.left_after,
                        right_bv_after: match.right_after,
                        income_amount: incomeAmount,
                        income_percent: incomeType === 'fixed' ? 0 : incomeRate,
                        income_type: incomeType,
                        tx_Ids: txIds,
                        remark: `repurchase ${ratioLabel}×${match.cut} match BV ${match.matched_bv};${equalNote} leftover L=${match.left_leftover} R=${match.right_leftover}`,
                        closing_date: new Date()
                    });

                    await Distributor.updateOne(
                        { uid },
                        {
                            $set: {
                                left_repurchase_bv: match.left_after,
                                right_repurchase_bv: match.right_after,
                                match_repurchase_bv: round2(
                                    calculateRepurchaseMatch(match.left_after, match.right_after).matched_bv
                                )
                            }
                        }
                    );

                    processed += 1;
                    matchedCount += 1;
                    totalIncome = round2(totalIncome + incomeAmount);

                    console.log(
                        `Repurchase matched uid=${uid} cut=${match.cut} BV=${match.matched_bv} income=${incomeAmount} leftover L=${match.left_leftover} R=${match.right_leftover}`
                    );
                } catch (userErr) {
                    console.error(`Repurchase matching closing error for uid ${dist.uid}:`, userErr);
                    errorLogger(userErr);
                }
            }

            console.log(
                `Repurchase matching closing done. matched=${matchedCount} income_total=${totalIncome}`
            );
            logConditionFailure(
                `REPURCHASE MATCHING CLOSING DONE matched=${matchedCount} income_total=${totalIncome}`
            );

            return { processed, matched: matchedCount, totalIncome };
        } catch (error) {
            console.log(error);
            errorLogger(error);
            return { processed: 0, matched: 0, error: error.message };
        }
    }

    /**
     * Upline matching income closing.
     * Process each unprocessed matching_income transaction:
     * - Take plan.upline_matching_income % (default 10%) of that tx amount
     * - Split equally among earner's active directs
     * - Mark tx upline_distribution_status = 1 so it never runs again
     */
    async uplineMatchingIncomeClosing() {
        console.log('Upline matching income closing started at:', new Date());
        logConditionFailure(`UPLINE MATCHING INCOME CLOSING STARTED AT ${new Date().toISOString()}`);

        try {
            const plan = (await PlansInfo.ensurePlanData?.()) || (await PlansInfo.findOne({ planId: 1 })) || (await PlansInfo.findOne());
            const setting = plan?.upline_matching_income;

            if (!setting || Number(setting.status) === 0) {
                console.log('Upline matching income is disabled in plan.');
                return { processed: 0, credited: 0, message: 'Upline matching income disabled' };
            }

            const incomeType = setting.income_type === 'fixed' ? 'fixed' : 'percentage';
            const incomeRate = Number(setting.amount) || 0;
            if (incomeRate <= 0) {
                console.log('Upline matching income amount is 0.');
                return { processed: 0, credited: 0, message: 'Upline matching income amount is 0' };
            }

            const pendingTxs = await Transaction.find({
                source: 'matching_income',
                status: 1,
                debit_credit: 'credit',
                amount: { $gt: 0 },
                upline_distribution_status: { $ne: 1 }
            }).sort({ tx_Id: 1 });

            let processed = 0;
            let credited = 0;
            let totalIncome = 0;

            for (const matchingTx of pendingTxs) {
                try {
                    const earnerUid = Number(matchingTx.uid);
                    const matchingIncome = round2(matchingTx.amount);
                    if (matchingIncome <= 0) {
                        await Transaction.updateOne(
                            { tx_Id: matchingTx.tx_Id },
                            { $set: { upline_distribution_status: 1 } }
                        );
                        processed += 1;
                        continue;
                    }

                    let poolAmount;
                    if (incomeType === 'fixed') {
                        poolAmount = incomeRate;
                    } else {
                        poolAmount = round2((matchingIncome * incomeRate) / 100);
                    }

                    const activeDirects = await Distributor.find({
                        sponsor_Id: earnerUid,
                        uid: { $ne: earnerUid },
                        status: 'active',
                        blockStatus: { $ne: 1 }
                    }).select('uid username name');

                    if (poolAmount <= 0 || !activeDirects.length) {
                        await Transaction.updateOne(
                            { tx_Id: matchingTx.tx_Id },
                            { $set: { upline_distribution_status: 1 } }
                        );
                        processed += 1;
                        console.log(
                            `Upline matching skip tx=${matchingTx.tx_Id} uid=${earnerUid} pool=${poolAmount} directs=${activeDirects.length}`
                        );
                        continue;
                    }

                    const share = round2(poolAmount / activeDirects.length);
                    if (share <= 0) {
                        await Transaction.updateOne(
                            { tx_Id: matchingTx.tx_Id },
                            { $set: { upline_distribution_status: 1 } }
                        );
                        processed += 1;
                        continue;
                    }

                    let creditedForTx = 0;

                    for (const direct of activeDirects) {
                        const directUid = Number(direct.uid);
                        const savedTx = await Action.actInternally(directUid, {
                            amount: share,
                            activity_name: 'upline_matching_income',
                            Status: 1,
                            to_from: earnerUid,
                            panel: 'distributor',
                            business: matchingIncome,
                            income_percent: incomeType === 'fixed' ? 0 : incomeRate,
                            release: 1,
                            currentDate: new Date(),
                            metadata: {
                                matching_tx_Id: matchingTx.tx_Id,
                                earner_uid: earnerUid,
                                matching_income: matchingIncome,
                                pool_amount: poolAmount,
                                active_directs: activeDirects.length,
                                share,
                                income_type: incomeType
                            }
                        });

                        if (!savedTx) {
                            logConditionFailure(
                                `upline_matching_income credit failed for direct uid ${directUid} from matching_tx ${matchingTx.tx_Id}`
                            );
                            continue;
                        }

                        creditedForTx += 1;
                        credited += 1;
                        totalIncome = round2(totalIncome + share);
                    }

                    // Mark source matching_income tx processed so it never runs again
                    await Transaction.updateOne(
                        { tx_Id: matchingTx.tx_Id },
                        { $set: { upline_distribution_status: 1 } }
                    );

                    processed += 1;
                    console.log(
                        `Upline matching tx=${matchingTx.tx_Id} earner=${earnerUid} matching=${matchingIncome} pool=${poolAmount} directs=${activeDirects.length} share=${share} credited=${creditedForTx}`
                    );
                } catch (userErr) {
                    console.error(`Upline matching closing error for tx ${matchingTx.tx_Id}:`, userErr);
                    errorLogger(userErr);
                }
            }

            console.log(
                `Upline matching income closing done. processed=${processed} credits=${credited} income_total=${totalIncome}`
            );
            logConditionFailure(
                `UPLINE MATCHING INCOME CLOSING DONE processed=${processed} credits=${credited} income_total=${totalIncome}`
            );

            return { processed, credited, totalIncome };
        } catch (error) {
            console.log(error);
            errorLogger(error);
            return { processed: 0, credited: 0, error: error.message };
        }
    }
}

const roiClosing = new ROI();
// roiClosing.matchingIncomeClosing();
// roiClosing.repurchaseMatchingIncomeClosing();
// roiClosing.uplineMatchingIncomeClosing();
module.exports = roiClosing;
