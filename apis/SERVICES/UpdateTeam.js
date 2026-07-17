const moment = require('moment');
const advance_info = require("../MODALS/advanceInfo");
const Orders = require("../MODALS/Orders");
const PlansInfo = require("../MODALS/Plan");
const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const { errorLogger } = require("../utils/logger");


class TEAM {
    constructor() {
        this.getAllTeamUIDsByLevel = this.getAllTeamUIDsByLevel.bind(this);
    
    }

    async updateTeam(uid) {
        try {
            let user = await UserData.findOne({ uid });
            if (!user) {
                return
            }

            let sponsor_Id = user.sponsor_Id;
            const { level_income } = await PlansInfo.findOne();
            for (let index = 0; index < 15 && sponsor_Id; index++) {
                const sponsor = await UserData.findOne({ uid: sponsor_Id });
                if (!sponsor) {
                    break;
                }

                const userWallet = await UserWallet.findOne({ uid: sponsor.uid });
                if (userWallet) {
                    const { teamSection } = userWallet;

                    if (teamSection.length < index + 1) {
                        for (let i = teamSection.length; i <= index; i++) {
                            userWallet.teamSection.push({
                                level: i + 1,
                                total_team: 0,
                                active_team: 0,
                                business: 0
                            });
                        }
                    }

                    await userWallet.addOrUpdateTeamLevel(
                        index + 1,
                        teamSection[index].total_team + 1,
                        teamSection[index].active_team,
                        teamSection[index].business
                    );
                }

                sponsor_Id = sponsor.sponsor_Id;
            }
        } catch (error) {
            errorLogger(error)
            console.error('Error updating team:', error);
        }
    }
    async updateBusiness(uid, amount, type) {
        try {
            let user = await UserData.findOne({ uid });
            if (!user) {
                throw new Error('User not found');
            }
            const sourceWallets = await UserWallet.findOne({ uid, 'wallets.slug': 'self_investment' }, { 'wallets.$': 1 });
            let newValueSrc = (Number(sourceWallets?.wallets[0].value) + Number(amount))
            const updatedSrcWallet = await UserWallet.findOneAndUpdate(
                { uid, 'wallets.slug': 'self_investment' }, // Find the document with matching uid and 'main_wallet' slug
                { $set: { 'wallets.$.value': newValueSrc } }, // Update the value of the main_wallet
                { new: true } // Return the updated document
            );
            let sponsor_Id = user.sponsor_Id;
            const { level_income } = await PlansInfo.findOne();
            for (let index = 0; index < level_income.level.length && sponsor_Id; index++) {
                const sponsor = await UserData.findOne({ uid: sponsor_Id });
                if (!sponsor) {
                    break;
                }

                const userWallet = await UserWallet.findOne({ uid: sponsor.uid });
                if (userWallet) {
                    const { teamSection } = userWallet;

                    if (teamSection.length < index + 1) {
                        for (let i = teamSection.length; i <= index; i++) {
                            userWallet.teamSection.push({
                                level: i + 1,
                                total_team: 0,
                                active_team: 0,
                                business: 0
                            });
                        }
                    }

                    await userWallet.addOrUpdateTeamLevel(
                        index + 1,
                        teamSection[index].total_team,
                        user.status == 0 ? teamSection[index].active_team + 1 : teamSection[index].active_team,
                        teamSection[index].business + Number(amount)
                    );
                }

                sponsor_Id = sponsor.sponsor_Id;
            }
            if (type == 'Purchase') {
                const updateStatus = await UserData.findOneAndUpdate(
                    { uid },
                    { $set: { status: 1, Activation_date: new Date() } },
                    { new: true }
                );
            }
        } catch (error) {
            errorLogger(error)
        }
    }
    async subtractBusiness(uid, amount, type) {
        try {
            // Find user
            const user = await UserData.findOne({ uid });
            if (!user) {
                throw new Error('User not found');
            }
    
            // Find source wallet
            const sourceWallets = await UserWallet.findOne({ uid, 'wallets.slug': 'self_investment' }, { 'wallets.$': 1 });
            if (!sourceWallets) {
                throw new Error('Source wallet not found');
            }
    
            // Calculate new value for source wallet
            let newValueSrc = Number(sourceWallets.wallets[0].value) - Number(amount);
    
            // Find total sum of all order_bv for the user
            const allOrders = await Orders.find({ uid, status: 1 });
            const totalOrderBv = allOrders.reduce((sum, order) => sum + (order.order_bv || 0), 0);
    
            // Check if totalOrderBv matches the source wallet value
            if (totalOrderBv == sourceWallets.wallets[0].value) {
                console.log('Total order BV matches wallet value; no subtraction performed.');
                return;
            }
    
            // Check if new wallet value is non-negative
            if (newValueSrc < 0) {
                throw new Error('Insufficient funds in self_investment wallet');
            }
    
            // Update the source wallet with the new value
            await UserWallet.findOneAndUpdate(
                { uid, 'wallets.slug': 'self_investment' },
                { $set: { 'wallets.$.value': newValueSrc } },
                { new: true }
            );
    
            // Update team sections for the sponsor chain
            let sponsor_Id = user.sponsor_Id;
            const { level_income } = await PlansInfo.findOne();
            for (let index = 0; index < level_income.level.length && sponsor_Id; index++) {
                const sponsor = await UserData.findOne({ uid: sponsor_Id });
                if (!sponsor) {
                    break;
                }
    
                const userWallet = await UserWallet.findOne({ uid: sponsor.uid });
                if (userWallet) {
                    const { teamSection } = userWallet;
    
                    // Add missing team levels if necessary
                    if (teamSection.length < index + 1) {
                        for (let i = teamSection.length; i <= index; i++) {
                            userWallet.teamSection.push({
                                level: i + 1,
                                total_team: 0,
                                active_team: 0,
                                business: 0
                            });
                        }
                    }
    
                    // Update the team section business value
                    await userWallet.addOrUpdateTeamLevel(
                        index + 1,
                        teamSection[index].total_team,
                        teamSection[index].active_team,
                        teamSection[index].business - Number(amount) // Subtract business amount
                    );
                }
    
                sponsor_Id = sponsor.sponsor_Id;
            }
    
            // Optionally update user status if necessary
            if (type === 'Purchase') {
                // Uncomment if you want to update the user's status based on type
                // await UserData.findOneAndUpdate(
                //     { uid },
                //     { $set: { status: 0 } }, // or any other logic for status change
                //     { new: true }
                // );
            }
        } catch (error) {
            errorLogger(error);
        }
    }
    
    
    async getAllTeamUIDs(uid, maxLevels = 10) {
        try {
            if (!uid) {
                throw new Error("Invalid user ID.");
            }
    
            const user = await UserData.findOne({uid});
            if (!user) {
                throw new Error("User not found.");
            }
    
            const fetchTeamUIDs = async (sponsorIds, currentLevel = 0) => {
                if (currentLevel >= maxLevels || sponsorIds.length === 0) return [];
    
                const nextLevelUsers = await UserData.find({ sponsor_Id: { $in: sponsorIds } }, { uid: 1 });
    
                const nextLevelUIDs = nextLevelUsers.map(user => user.uid);
                const allUIDs = nextLevelUIDs.concat(await fetchTeamUIDs(nextLevelUIDs, currentLevel + 1));
    
                return allUIDs;
            };
    
            const allTeamUIDs = await fetchTeamUIDs([user.uid]);
    
            return allTeamUIDs;
        } catch (err) {
            errorLogger(err);
        }
    }
    
    async calculateTeamBusiness(startDate, endDate, uid,maxLevels = 10) {
        try {
            const allTeam = await this.getAllTeamUIDs(uid,maxLevels);
            const allOrderSum = await Orders.aggregate([
                {
                    $match: {
                        uid: { $in: allTeam },
                        status:1,
                        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBusiness: { $sum: "$amount" }
                    }
                }
            ]);
            
            return allOrderSum.length > 0 ? allOrderSum[0].totalBusiness : 0;
        } catch (error) {
            errorLogger(error);
            return 0;
        }
    }

    async getAllTeamUIDsByLevel(uid, maxLevels = 4000) {
        try {
            if (!uid) {
                throw new Error("Invalid user ID.");
            }

            const user = await UserData.findOne({ uid });
            if (!user) {
                throw new Error("User not found.");
            }
            // console.log("user",user)

            const fetchTeamUIDs = async (sponsorIds, currentLevel = 0, levelResults = {}) => {
                if (currentLevel >= maxLevels || sponsorIds.length === 0) return levelResults;

                // const nextLevelUsers = await UserData.find({ sponsor_Id: { $in: sponsorIds } }, { uid: 1, status: 1 });
                const nextLevelUsers = await UserData.find(
                    { sponsor_Id: { $in: sponsorIds } },
                    { uid: 1 }  // Removed { status: 1 }
                );
                const nextLevelUIDs = nextLevelUsers.map((user) => user.uid);

                if (nextLevelUIDs.length > 0) {
                    levelResults[currentLevel + 1] = nextLevelUIDs;
                }

                return await fetchTeamUIDs(nextLevelUIDs, currentLevel + 1, levelResults);
            };

            const allTeamUIDs = await fetchTeamUIDs([user.uid]);
            return allTeamUIDs;
        } catch (err) {
            errorLogger(err);
            return {};
        }
    }

    async getAllTeamUIDsByLevel_withlevel(uid, maxLevels = 4000) {
        try {
            if (!uid) {
                throw new Error("Invalid user ID.");
            }
    
            const user = await UserData.findOne({ uid });
            if (!user) {
                throw new Error("User not found.");
            }
    
            const fetchTeamUIDs = async (sponsorIds, currentLevel = 3, levelResults = []) => {
                if (currentLevel >= maxLevels || sponsorIds.length == 0) return levelResults;
    
                const nextLevelUsers = await UserData.find(
                    { sponsor_Id: { $in: sponsorIds } },
                    { uid: 1 }
                );
                const nextLevelUIDs = nextLevelUsers.map(user => user.uid);
    
                if (nextLevelUIDs.length > 0) {
                    levelResults.push({ level: currentLevel-1, uids: nextLevelUIDs });
                }
    
                return await fetchTeamUIDs(nextLevelUIDs, currentLevel + 1, levelResults);
            };
    
            const allTeamLevels = await fetchTeamUIDs([user.uid]);
            return allTeamLevels;
        } catch (err) {
            errorLogger(err);
            return [];
        }
    }
    

    async TeamBusinessByLevel(uid) {
        try {
            const { Team: { max_level_team_count: { value: maxLevels } } } = await advance_info.findOne();

            const levelTeam = await this.getAllTeamUIDsByLevel(uid, maxLevels);
            const result = {
                sum: {  // Summarized totals across all levels
                    active_team: 0,
                    business: 0,
                    total_team: 0
                },
                teamSection: []  // Array of objects for each level
            };
    
            for (const [level, team] of Object.entries(levelTeam)) {

                const amountSum = await Orders.aggregate([
                    { $match: { uid: { $in: team } ,status:1} },
                    { $group: { _id: null, totalBusiness: { $sum: "$amount" } } }
                ]);
    
                const activeTeamCount = await UserData.countDocuments({
                    uid: { $in: team },
                    status: 1 
                });

                const totalTeamCount = team.length;
    
                const levelBusiness = amountSum.length > 0 ? amountSum[0].totalBusiness : 0;
    
                result.teamSection.push({
                    active_team: activeTeamCount,
                    business: levelBusiness,
                    level: parseInt(level),  
                    total_team: totalTeamCount,
                });
    
                // Add to the totals
                result.sum.active_team += activeTeamCount;
                result.sum.business += levelBusiness;
                result.sum.total_team += totalTeamCount;
            }
    
            // console.log(result);
            return result;
        } catch (error) {
            errorLogger(error);
            return {
                sum: {
                    active_team: 0,
                    business: 0,
                    total_team: 0
                },
                teamSection: []
            };
        }
    }

   
    async TeamBusinessByLevel_with_activation_date(uid) {
        try {
            const { Team: { max_level_team_count: { value: maxLevels } } } = await advance_info.findOne();
            const levelTeam = await this.getAllTeamUIDsByLevel(uid, maxLevels);
    // console.log("levelTeam",levelTeam)
            const result = {
                sum: {  
                    active_team: 0,
                    business: 0,
                    total_team: 0
                },
                teamSection: []  
            };
    
            // ✅ Step 1: Check if the user is active and get their Activation_date
            const user = await UserData.findOne({ uid }).select("status Activation_date");
    
            const isUserActive = user
            const userActivationDate = isUserActive ? moment(user.Activation_date).startOf("day") : null;
    
            for (const [level, team] of Object.entries(levelTeam)) {
                const parsedLevel = parseInt(level);
                let matchCondition = { uid: { $in: team }, status: 1 };
                let amountSum = [];
    
                let levelBusiness = 0; // Default business value
  
                if (parsedLevel == 1 || parsedLevel == 2) {
                    if (isUserActive) {
                        amountSum = await Orders.aggregate([
                            {
                                $match: {
                                    uid: { $in: team },
                                    status: { $in: [1,2] },
                                }
                            },
                            {
                                $lookup: {
                                    from: "userdatas",
                                    localField: "uid",
                                    foreignField: "uid",
                                    as: "user"
                                }
                            },
                            { $unwind: "$user" },
                            {
                                $addFields: {
                                    order_date: {
                                        $dateFromParts: {
                                            year: { $year: "$added_on" },
                                            month: { $month: "$added_on" },
                                            day: { $dayOfMonth: "$added_on" }
                                        }
                                    }
                                }
                            },
                            {
                                $match: {
                                    $expr: { 
                                        $and: [
                                            { $gte: ["$order_date", { $dateFromParts: { 
                                                year: { $year: userActivationDate.toDate() },
                                                month: { $month: userActivationDate.toDate() },
                                                day: { $dayOfMonth: userActivationDate.toDate() }
                                            }}] },
                                            { $eq: ["$user.status", 1] }
                                        ]
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalBusiness: { $sum: "$amount" }
                                }
                            }
                        ]);
    
                        levelBusiness = amountSum.length > 0 ? amountSum[0].totalBusiness : 0;
                    } else {
                        console.log(`Skipping Level ${parsedLevel} business because user is inactive.`);
                    }
                } else {
                    amountSum = await Orders.aggregate([
                        { $match: matchCondition },
                        { $group: { _id: null, totalBusiness: { $sum: "$amount" } } }
                    ]);
                    levelBusiness = amountSum.length > 0 ? amountSum[0].totalBusiness : 0;
                }
    
                const activeTeamCount = await UserData.countDocuments(matchCondition);
                const totalTeamCount = team.length;
    
                result.teamSection.push({
                    active_team: activeTeamCount,
                    business: levelBusiness,
                    level: parsedLevel,
                    total_team: totalTeamCount,
                });
    
                // Add to the totals
                result.sum.active_team += activeTeamCount;
                result.sum.business += levelBusiness;
                result.sum.total_team += totalTeamCount;
            }
            //  console.log(result,'[[[[[[[[[[[[[[[[[[[[[[')
            return result;
        } catch (error) {
            errorLogger(error);
            return {
                sum: {
                    active_team: 0,
                    business: 0,
                    total_team: 0
                },
                teamSection: []
            };
        }
    }
    
    
    
    async activeUserBussiness(req, res) {
        try {
            const { uid } = req.user;
            const user = await UserData.findOne({ uid });
    
            if (!user) {
                return ({ message: 'User not found' });
            }
    
            const activeDate = user.Activation_date;
            if (!activeDate) {
                return res.status(400).json({ message: 'User not active' });
            }
    
            const levelTeam = await this.getAllTeamUIDsByLevel(uid, 2);
            console.log('LevelTeam', levelTeam);
    
            const level1Uids = levelTeam['1'];
            const level2Uids = levelTeam['2'];
          
            // Find Level 1 orders and sum order_bv where createdAt >= activeDate
            const level1Orders = await Orders.find({
                uid: { $in: level1Uids },
                createdAt: { $gte: activeDate }
            });
            const level1OrderSum = level1Orders.reduce((sum, order) => sum + order.amount, 0);
    
            // Find Level 2 orders and sum order_bv where createdAt >= activeDate
            const level2Orders = await Orders.find({
                uid: { $in: level2Uids },
                createdAt: { $gte: activeDate }
            });
            const level2OrderSum = level2Orders.reduce((sum, order) => sum + order.amount, 0);

            console.log('Level 1 UIDs:', level1Uids);
            console.log('Level 2 UIDs:', level2Uids);
            console.log('Active Date:', activeDate);
    
            return res.status(200).json({ message: 'Fetched', level1OrderSum, level2OrderSum });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    
    

}
const Team = new TEAM();
module.exports = Team;