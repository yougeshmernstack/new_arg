const UserData = require("../../MODALS/userData");
const UserWallet = require("../../MODALS/userWallets");
const Ranks = require("../../MODALS/Ranks");
const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const PlansInfo = require("../../MODALS/Plan");
const advance_info = require("../../MODALS/advanceInfo");

class TEAM {

    constructor() {
        this.getGenealogyTree = this.getGenealogyTree.bind(this);
        this.genealogyData = this.genealogyData.bind(this);
        this.genealogySet = this.genealogySet.bind(this);
        this.getLevelTeam = this.getLevelTeam.bind(this);
        this.getOverallTeam = this.getOverallTeam.bind(this);
    }

    async getLevelTeam(req, res) {
        try {
            const { uid: userId } = req.user;
            const {
                levels: levelsParam,
                page = 1,
                limit = 10,
                search,
                startDateJoining,
                endDateJoining,
                startDateActive,
                endDateActive,
                ...filters
            } = req.query;

            // console.log(filters,'==================filter=============',req.query)

            // Set default levels to [1] if not provided
            const userLevels = levelsParam ? levelsParam.split(',').map(level => parseInt(level.trim())) : [1];

            if (!userId || userLevels.some(isNaN)) {
                return res.status(400).json({ message: "Invalid request parameters." });
            }

            const user = await UserData.findOne({ uid: userId });
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            // Function to construct the query object with filters
            const constructQuery = (sponsorIds) => {
                const query = { sponsor_Id: { $in: sponsorIds } };

                // Apply additional filters
                for (const key in filters) {
                    if (!isNaN(filters[key])) {
                        query[key] = parseInt(filters[key]);
                    } else if (filters[key]) {
                        query[key] = new RegExp(filters[key], 'i'); // Handle other filters
                    }
                }

                // Date range filtering
                if (startDateJoining || endDateJoining) {
                    query.joining_date = {};
                    if (startDateJoining) {
                        query.joining_date.$gte = new Date(new Date(startDateJoining).setHours(0, 0, 0, 0));
                    }
                    if (endDateJoining) {
                        query.joining_date.$lt = new Date(new Date(endDateJoining).setHours(23, 59, 59, 999));
                    }
                }
                if (startDateActive || endDateActive) {
                    query.activation_date = {};
                    if (startDateActive) {
                        query.activation_date.$gte = new Date(new Date(startDateActive).setHours(0, 0, 0, 0));
                    }
                    if (endDateActive) {
                        query.activation_date.$lt = new Date(new Date(endDateActive).setHours(23, 59, 59, 999));
                    }
                }

                // If search term is provided, find matching users
                if (search) {
                    const userSearchRegex = new RegExp(search, 'i');
                    query.$or = [
                        { username: userSearchRegex },
                        { name: userSearchRegex }
                    ];
                }

                return query;
            };

            // Function to fetch generation team for specified levels
            const getGenerationTeam = async (initialUser, targetLevels) => {
                let currentLevel = 1;
                let currentLevelUsers = [initialUser];
                let generationTeams = [];

                while (currentLevel <= Math.max(...targetLevels)) {
                    const sponsorIds = currentLevelUsers.map(user => user.uid);
                    const query = constructQuery(sponsorIds);

                    // Fetch next level users
                    const nextLevelUsers = await UserData.find(query);

                    if (targetLevels.includes(currentLevel)) {
                        // Fetch sponsor usernames in bulk
                        const sponsors = await UserData.find({ uid: { $in: nextLevelUsers.map(user => user.sponsor_Id) } });

                        const nextLevelUsersWithSponsorNames = await Promise.all(nextLevelUsers.map(async user => {
                            const sponsor = sponsors.find(s => s.uid === user.sponsor_Id);
                            return {
                                ...user._doc,  // Include all user fields
                                sponsor_username: sponsor ? sponsor.username : null // Add sponsor_username field
                            };
                        }));
                        generationTeams.push({ level: currentLevel, team: nextLevelUsersWithSponsorNames });
                    }

                    currentLevelUsers = nextLevelUsers;
                    currentLevel++;
                }

                return generationTeams;
            };

            const generationTeam = await getGenerationTeam(user, userLevels);

            // Flatten the team array for further processing
            const allUsers = generationTeam.flatMap(team => team.team);

            // Calculate the sum of the 'business' field
            const totalBusiness = allUsers.reduce((sum, user) => sum + (user.business || 0), 0);

            // Pagination logic
            const paginatedTeam = allUsers.slice((page - 1) * limit, page * limit);
            
            res.json({
                success: true,
                data: paginatedTeam,
                totalRecords: allUsers.length,
                currentPage: parseInt(page),
                totalPages: Math.ceil(allUsers.length / limit),
                totalBusiness, // Include the total business sum in the response
                ...filters
            });
        } catch (err) {
            errorLogger(err);
            res.status(500).json({ message: "Internal server error." });
        }
    }


    async getOverallTeam(req, res) {
        try {
            const { uid: userId } = req.user;
            const {
                levels,
                page = 1,
                limit = 10,
                search,
                startDateJoining,
                rank,
                endDateJoining,
                startDateActive,
                endDateActive,
                from_level,
                to_level,
                self_investment, // New filter added
                ...filters
            } = req.query;

            // Default levels: 1 to 200
            let userLevels = Array.from({ length: 200 }, (_, i) => i + 1);

            // Apply 'from_level' and 'to_level' filters if provided
            const fromLevel = parseInt(from_level) || 1;
            const toLevel = parseInt(to_level) || 200;

            if (fromLevel > toLevel || fromLevel < 1 || toLevel > 200) {
                return res.status(400).json({ message: "Invalid level range." });
            }

            // Filter levels within the specified range
            userLevels = userLevels.filter(level => level >= fromLevel && level <= toLevel);

            if (!userId) {
                return res.status(400).json({ message: "Invalid request parameters." });
            }

            const user = await UserData.findOne({ uid: userId });
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            // Function to construct the query object with filters
            const constructQuery = (sponsorIds) => {
                const query = { sponsor_Id: { $in: sponsorIds } };

                // Apply additional filters
                for (const key in filters) {
                    if (!isNaN(filters[key])) {
                        query[key] = parseInt(filters[key]);
                    } else if (filters[key]) {
                        query[key] = new RegExp(filters[key], 'i');
                    }
                }

                // Date range filtering
                if (startDateJoining || endDateJoining) {
                    query.joining_date = {};
                    if (startDateJoining) {
                        query.joining_date.$gte = new Date(new Date(startDateJoining).setHours(0, 0, 0, 0));
                    }
                    if (endDateJoining) {
                        query.joining_date.$lt = new Date(new Date(endDateJoining).setHours(23, 59, 59, 999));
                    }
                }
                if (startDateActive || endDateActive) {
                    query.activation_date = {};
                    if (startDateActive) {
                        query.activation_date.$gte = new Date(new Date(startDateActive).setHours(0, 0, 0, 0));
                    }
                    if (endDateActive) {
                        query.activation_date.$lt = new Date(new Date(endDateActive).setHours(23, 59, 59, 999));
                    }
                }

                // If search term is provided, find matching users
                if (search) {
                    const userSearchRegex = new RegExp(search, 'i');
                    query.$or = [{ username: userSearchRegex }, { name: userSearchRegex }];
                }

                return query;
            };

            // Function to fetch generation team for specified levels
            const getGenerationTeam = async (initialUser, targetLevels) => {
                let currentLevel = 1;
                let currentLevelUsers = [initialUser];
                let allUsers = [];

                while (currentLevel <= Math.max(...targetLevels)) {
                    const sponsorIds = currentLevelUsers.map(user => user.uid);
                    const currentSponsorIds = currentLevelUsers.map(user => user.uid);
                    const query = constructQuery(sponsorIds);

                    // Fetch next level users
                    const nextLevelUsers = await UserData.find(query);
                    const nextLevelUsersWithoutQuery = await UserData.find({ sponsor_Id: { $in: currentSponsorIds } });

                    // Fetch sponsor usernames in bulk
                    const sponsors = await UserData.find({ uid: { $in: nextLevelUsers.map(user => user.sponsor_Id) } });

                    if (targetLevels.includes(currentLevel)) {
                        for (let user of nextLevelUsers) {
                            const sponsor = sponsors.find(s => s.uid === user.sponsor_Id);

                            // Fetch self investment wallet data
                            const walletData = await UserWallet.findOne({ uid: user.uid, 'wallets.slug': 'self_investment' });
                            const selfInvestmentWallet = walletData?.wallets.find(wallet => wallet.slug === 'self_investment');
                            const selfInvestmentValue = selfInvestmentWallet ? selfInvestmentWallet.value : 0;

                            // **Apply self_investment filter (if provided)**
                            if (self_investment && selfInvestmentValue !== parseFloat(self_investment)) {
                                continue;
                            }


                            // Initialize sum with default values
                            const sum = { total_team: 0, active_team: 0, business: 0, levelbusiness: 0 };

                            // Calculate the sum of all fields if teamSection is not empty
                            const { teamSection } = walletData || {};
                            if (teamSection && teamSection.length > 0) {
                                teamSection.forEach(level => {
                                    sum.total_team += level.total_team || 0;
                                    sum.active_team += level.active_team || 0;
                                    sum.business += level.business || 0;
                                    sum.levelbusiness += level.business || 0;
                                });
                            }

                            // Calculate direct business
                            const directReferrals = await UserData.find({ sponsor_Id: user.uid });
                            const directBusiness = await Promise.all(directReferrals.map(async (ref) => {
                                const refWallet = await UserWallet.findOne({ uid: ref.uid, 'wallets.slug': 'self_investment' });
                                const refInvestmentWallet = refWallet?.wallets.find(wallet => wallet.slug === 'self_investment');
                                return refInvestmentWallet ? refInvestmentWallet.value : 0;
                            }));
                            const totalDirectBusiness = directBusiness.reduce((sum, val) => sum + val, 0);

                            // Get latest rank
                            const latestRank = await Ranks.findOne({ uid: user.uid }).sort({ createdAt: -1 });
                            if (rank && (!latestRank || latestRank.rankName !== rank)) {
                                continue;
                            }

                            // Add user details
                            const userWithDetails = {
                                ...user._doc,
                                level: currentLevel,
                                sponsor_username: sponsor ? sponsor.username : null,
                                self_investment: selfInvestmentValue,
                                total_team: sum.total_team,
                                active_team: sum.active_team,
                                business: sum.business,
                                levelbusiness: sum.levelbusiness,
                                direct_business: totalDirectBusiness,
                                direct_team: directReferrals.length,
                                rank: latestRank ? latestRank.rankName : "No Rank"
                            };

                            allUsers.push(userWithDetails);
                        }
                    }

                    currentLevelUsers = nextLevelUsersWithoutQuery;
                    currentLevel++;
                }

                return allUsers;
            };

            const generationTeam = await getGenerationTeam(user, userLevels);
            const paginatedTeam = generationTeam.slice((page - 1) * limit, page * limit);

            // Calculate total sums
            const totalSum = generationTeam.reduce((sum, user) => {
                sum.total_team += user.total_team || 0;
                sum.active_team += user.active_team || 0;
                sum.business += user.self_investment || 0;
                sum.levelbusiness += user.levelbusiness+ user.self_investment|| 0;
                return sum;
            }, { total_team: 0, active_team: 0, business: 0, levelbusiness: 0 });

            res.json({
                success: true,
                data: paginatedTeam,
                totalRecords: generationTeam.length,
                currentPage: parseInt(page),
                totalPages: Math.ceil(generationTeam.length / limit),
                totalSum,
                ...filters
            });

        } catch (err) {
            errorLogger(err);
            res.status(500).json({ message: "Internal server error." });
        }
    }


    async genealogyData(userId) {
        // Fetch user data based on userId
        const userProfile = await UserData.findOne({ uid: userId });

        if (!userProfile) {
            throw new Error(`User with id ${userId} not found`);
        }

        const result = {
            id: userId,
            attributes: {
                "Username": userProfile.username,
                "Name": userProfile.name,
                "status": userProfile.status
            },
            children: await this.genealogySet(userId)
        };

        return result;
    }

    async genealogySet(userId) {
        // Fetch direct children of the given userId
        const directChildren = await UserData.find({ sponsor_Id: userId }).lean();

        const children = await Promise.all(
            directChildren.map(async (child) => {
                const childProfile = {
                    id: child.uid,
                    attributes: {
                        "Username": child.username,
                        "Name": child.name,
                        "status": child.status
                    },
                    children: await this.genealogySet(child.uid)
                };
                return childProfile;
            })
        );

        return children;
    }

    // async getGenealogyTree(req, res) {
    //     try {
    //         let { uid } = req.body;

    //         if (!uid || (typeof uid !== 'string' && typeof uid !== 'number')) {
    //             return res.status(400).json({ message: "Valid User ID or Username is required" });
    //         }

    //         const query = isNaN(uid) ? { username: uid.trim() } : { uid: parseInt(uid) };

    //         const user = await UserData.findOne(query);

    //         if (!user) {
    //             return res.status(404).json({ message: "User not found" });
    //         }

    //         const genealogyTree = await this.genealogyData(user.uid);

    //         return res.json(genealogyTree);
    //     } catch (error) {
    //         console.error("Error fetching genealogy tree:", error);
    //         return res.status(500).json({ message: "Internal Server Error" });
    //     }
    // }

    async getGenealogyTree(req, res) {
        try {
            // Extract uid from request body
            let { uid } = req.body;

            if (!uid || (typeof uid !== 'string' && typeof uid !== 'number')) {
                return res.status(400).json({ message: "Valid User ID or Username is required" });
            }

            // Determine query based on uid type
            const query = isNaN(uid) ? { username: uid.trim() } : { uid: parseInt(uid) };

            // Find the searched user in the database
            const user = await UserData.findOne(query);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Fetch downline team UIDs for the authenticated user
            const teamLevels = await Team.checkdownline(req.user.uid);
            // Flatten the levels array into a single array of UIDs
            const downlineUIDs = teamLevels.reduce((acc, level) => acc.concat(level.uids), []);

            // Allow search if the searched user is the authenticated user
            // or if the searched user is in the authenticated user's downline
            if (user.uid !== req.user.uid && !downlineUIDs.includes(user.uid)) {
                return res.status(400).json({ message: "You can only search your downline team" });
            }

            // Fetch and return the genealogy tree for the user.
            const genealogyTree = await this.genealogyData(user.uid);
            return res.json(genealogyTree);
        } catch (error) {
            console.error("Error fetching genealogy tree:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }

    async checkdownline(uid, maxLevels = 1000) {
        try {
            if (!uid) {
                throw new Error("Invalid user ID.");
            }

            const user = await UserData.findOne({ uid });
            if (!user) {
                throw new Error("User not found.");
            }

            // Recursively fetch team UIDs starting from level 1
            const fetchTeamUIDs = async (sponsorIds, currentLevel = 1, levelResults = []) => {
                if (currentLevel >= maxLevels || sponsorIds.length === 0) return levelResults;

                const nextLevelUsers = await UserData.find(
                    { sponsor_Id: { $in: sponsorIds } },
                    { uid: 1 }
                );
                const nextLevelUIDs = nextLevelUsers.map(user => user.uid);

                if (nextLevelUIDs.length > 0) {
                    levelResults.push({ level: currentLevel, uids: nextLevelUIDs });
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


    async getLevelIncomeDetails(req, res) {
    try {
        const { planId } = req.body;  
        const orderAmount = 10000;

        // Get dynamic TDS from advance_infos
        const advanceInfo = await advance_info.findOne({});
        const TDS_PERCENTAGE = advanceInfo?.withdrawal?.main_wallet?.TDS || 0;

        // Fetch plan details
        const planInfo = await PlansInfo.findOne({ planId });
        if (!planInfo || !planInfo.level_income?.level) {
            return res.status(400).json({ message: "Level income not configured." });
        }

        const levelData = planInfo.level_income.level;

        let responseData = [];
        let multiplier = 2;  // Binary matrix: 2, 4, 8, 16, ...

        levelData.forEach(item => {
            const level = item.level;
            const incomePercent = item.income;

            const totalBusiness = multiplier * orderAmount; 
            multiplier *= 2;

            const incomeAmount = (incomePercent / 100) * totalBusiness;
            const tdsAmount = (TDS_PERCENTAGE / 100) * incomeAmount;
            const incomeAfterTax = incomeAmount - tdsAmount;

            responseData.push({
                level,
                income_percent: incomePercent,
                total_business: totalBusiness,
                income: incomeAmount,
                TDS_percent: TDS_PERCENTAGE,
                TDS_amount: tdsAmount,
                final_income: incomeAfterTax
            });
        });

        return res.status(200).json({
            message: "Level income details fetched successfully.",
            data: responseData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error.",
            error: error.message
        });
    }
    }


    // saved that users in ranks table whose completed 10 levels 
    async saveRankUsersForLevel(req, res) {
        try {
            // 1. Fetch all unique users who received level 10 matching income
            const users = await Transactions.aggregate([
                {
                    $match: {
                        level: "10",
                        source: "matching_income",
                        debit_credit: "credit",
                        status: 1
                    }
                },
                {
                    $group: { _id: "$uid" }
                }
            ]);

            if (!users.length) {
                return res.status(200).json({
                    message: "No users found with level 10 matching income."
                });
            }

            let savedUsers = [];

            // 2. Save into ranks table
            for (const u of users) {
                const uid = u._id;

                // Check if already saved
                const exists = await Ranks.findOne({ uid, rankId: 10 });
                if (exists) continue;

                const newRank = new Ranks({
                    uid,
                    rankId: 10,
                    rankName: "Level 10 Achiever",
                    rankType: "reward"
                });

                await newRank.save();
                savedUsers.push(uid);
            }

            return res.status(200).json({
                message: "Rank entries saved successfully.",
                totalInserted: savedUsers.length,
                users: savedUsers
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal server error.",
                error: error.message
            });
        }
    }


}

const Team = new TEAM();
// Team.saveRankUsersForLevel()
module.exports = Team;
