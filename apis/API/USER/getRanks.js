const PlansInfo = require("../../MODALS/Plan");
const Ranks = require("../../MODALS/Ranks");
const UserData = require("../../MODALS/userData");
const UserWallet = require("../../MODALS/userWallets");
const Rewards = require("../../SERVICES/Rank&Rewards");
const Team = require("../../SERVICES/UpdateTeam");
const { INVALID_REQUEST, INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");

class RANK {
    constructor() {
        this.getRanks = this.getRanks.bind(this);
        this.calculateBusiness = this.calculateBusiness.bind(this);
    }
    async getRanks(req, res) {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ ...INVALID_REQUEST, message: "User not authenticated" });
            }

            const { uid } = req.user;
            
            // Get reward type from query parameter (default: "reward")
            const { rewardType = "reward" } = req.query;
            
            // Validate rewardType parameter
            if (rewardType !== "reward" && rewardType !== "reward_2") {
                return res.status(400).json({ 
                    ...INVALID_REQUEST, 
                    message: "Invalid rewardType. Must be 'reward' or 'reward_2'" 
                });
            }

            // Call the appropriate service function based on rewardType
            let rewardGoals;
            if (rewardType === "reward_2") {
                rewardGoals = await Rewards.achieveRewardsInRatio_2(uid);
            } else {
                rewardGoals = await Rewards.achieveRewardsInRatio(uid);
            }
            
            return res.status(200).json(rewardGoals);
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
   
    async get_team_royality_TeamBusiness(req, res) {
        try {
            // Validate user authentication
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ ...INVALID_REQUEST, message: "User not authenticated" });
            }
    
            const { uid } = req.user;
            let { page = 1, limit = 10, username = "", teamType, userId, level, name, rank, status, startDate, endDate } = req.query;
    
            // console.log("Level: ", level);
    
            // Validate teamType
            teamType = String(teamType).trim();
            if (!["topLeg", "secondTopLeg", "otherLeg"].includes(teamType)) {
                return res.status(400).json({ ...INVALID_REQUEST, message: "Invalid team type" });
            }
    
            // Validate pagination parameters
            page = Math.max(1, parseInt(page));
            limit = Math.max(1, parseInt(limit));
            const skip = (page - 1) * limit;
    
            // Fetch business metrics and team UIDs
            const {
                topLegBusiness,
                secondLegBusiness,
                totalOtherBusiness,
                topUid,
                secondTopUid,
                otherUids
            } = await Rewards.calculateTotalTeamBusiness(uid);
    
            // Helper function to fetch team UIDs with levels (Skipping Level 1 & Level 2)
            const fetchTeamUids = async (uids) => {
                if (!uids || uids.length === 0) return [];
    
                const teamData = await Promise.all(
                    uids.map(uid => Team.getAllTeamUIDsByLevel_withlevel(uid))
                );
    
                return teamData
                    .flatMap(data => data ? data.flatMap(entry => entry.uids.map(id => ({ uid: id, level: entry.level }))) : [])
                    .filter(entry => entry.level > 2) // ✅ Skip Level 1 & 2
                    .filter(entry => !isNaN(entry.uid));
            };
    
            // Determine selected team UIDs and business amount based on teamType
            let selectedTeamData = [];
            let businessAmount = 0;
    
            switch (teamType) {
                case "topLeg":
                    selectedTeamData = await fetchTeamUids([topUid]);
                    businessAmount = topLegBusiness;
                    break;
                case "secondTopLeg":
                    selectedTeamData = await fetchTeamUids([secondTopUid]);
                    businessAmount = secondLegBusiness;
                    break;
                case "otherLeg":
                    selectedTeamData = await fetchTeamUids(otherUids);
                    businessAmount = totalOtherBusiness;
                    break;
            }
    
            // Extract only UIDs
            const selectedTeamUids = selectedTeamData.map(entry => entry.uid);
    
            // Build the filter object for user data
            const userFilter = {};
            if (userId) userFilter.uid = Number(userId);
            if (username || name) {
                userFilter.$or = [
                    { username: { $regex: username || name, $options: "i" } },
                    { name: { $regex: username || name, $options: "i" } }
                ];
            }
            if (status !== undefined) userFilter.status = Number(status);
            if (startDate || endDate) {
                userFilter.joining_date = {};
                if (fromDate) userFilter.joining_date.$gte = new Date(startDate);
                if (toDate) userFilter.joining_date.$lte = new Date(endDate);
            }
    
            // Fetch user details for the selected team UIDs
            const fetchUserData = async (uids) => {
                if (!uids || uids.length === 0) return [];
    
                const users = await UserData.find({ uid: { $in: uids }, ...userFilter });
    
                return await Promise.all(users.map(async (user) => {
                    const uid = user.uid;
    
                    // Fetch wallet data for direct and team business
                    const walletData = await UserWallet.findOne({ uid });
                    let directBusiness = 0, teamBusiness = 0, selfPackage = 0;
    
                    if (walletData?.teamSection) {
                        directBusiness = walletData.teamSection
                            .filter(entry => entry.level == 1)
                            .reduce((sum, entry) => sum + (entry.business || 0), 0);
    
                        teamBusiness = walletData.teamSection
                            .reduce((sum, entry) => sum + (entry.business || 0), 0);
                    }
    
                    
                    selfPackage = walletData?.wallets?.find(wallet => wallet.slug === "self_investment")?.value || 0;
    
                    // Fetch last rank
                    const lastRank = await Ranks.findOne({ uid }).sort({ createdAt: -1 }).select("rankName");
    
                    // Fetch sponsor data
                    const sponsorData = await UserData.findOne({ uid: user.sponsor_Id }).select("username name") || {};
                    const directTeamCount = await UserData.countDocuments({ sponsor_Id: uid, status: 1 });
    
                    // Get the user's level from selectedTeamData
                    const userLevel = selectedTeamData.find(entry => entry.uid === uid)?.level || 0;
    
                    // Apply rank filter if provided
                    if (rank) {
                        const rankFilter = String(rank).trim().toLowerCase();
                        if (!lastRank || lastRank.rankName.trim().toLowerCase() !== rankFilter) {
                            return null;
                        }
                    }
    
                    // Apply level filter if provided
                    if (level) {
                        const levelFilter = Number(level);
                        if (userLevel !== levelFilter) {
                            return null;
                        }
                    }
    
                    return {
                        uid,
                        username: user.username,
                        name: user.name,
                        status: user.status,
                        sponsor_Id: user.sponsor_Id || null,
                        sponsorUsername: sponsorData.username || null,
                        sponsorName: sponsorData.name || null,
                        directBusiness,
                        directTeam: directTeamCount || 0,
                        teamBusiness,
                        selfPackage,
                        rank: lastRank ? lastRank.rankName : "No Rank",
                        joining_date: user.joining_date,
                        activation_date: user.Activation_date,
                        email: user.email,
                        mobile: user.mobile,
                        level: userLevel // ✅ Include level information
                    };
                })).then(results => results.filter(user => user !== null)); // Remove null values
            };
    
            // Fetch all filtered users (without pagination) to calculate totalUsers
            const allFilteredUsers = await fetchUserData(selectedTeamUids);
    
            // Apply pagination to the filtered users
            const paginatedUsers = allFilteredUsers.slice(skip, skip + limit);
    
            return res.status(200).json({
                businessAmount,
                selectedTeamUsers: paginatedUsers,
                totalPages: Math.ceil(allFilteredUsers.length / limit),
                limit,
                totalUsers: allFilteredUsers.length
            });
    
        } catch (error) {
            console.error("Error in getcommunityTeamBusiness:", error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR, message: "Error fetching team business data" });
        }
    }
    
    async get_upline_bonus(req, res) {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ ...INVALID_REQUEST, message: "User not authenticated" });
            }
            const { uid } = req.user;
            const rewardGoals = await Rewards.upline_bonus(uid);
            return res.status(200).json(rewardGoals);
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async get_gamingwallet_for_Activation(req, res) {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ ...INVALID_REQUEST, message: "User not authenticated" });
            }
            const { uid } = req.user;
            const rewardGoals = await Rewards.gamingwallet_for_Activation(uid);
            console.log("rewardGoals",rewardGoals);
            return res.status(200).json(rewardGoals);
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async calculateBusiness(uid, required_rank) {
        let status=0;
        // Fetch all sponsor data based on sponsor ID
        const sponsor_data = await UserData.find({ sponsor_Id: uid });
    const sponsor_ids=sponsor_data.length ;
        // Loop through each sponsor
        const rank_data = [];
        let rank_ids_count=0;
        if(sponsor_ids>=5){
        for (const sponsor of sponsor_data) {
            const sponsor_id = sponsor.uid;
    
            // Get all team UIDs
            const team_data = await Team.getAllTeamUIDs(sponsor_id, 50);
            // Loop through the team UIDs
            for (const team_member of team_data) {
                // Fetch rewards for the team member
                const ranks = await Ranks.find({ uid: team_member });
    
                // Find if the user has the required rank
                const userRank = ranks.find(rank => rank.rankId === required_rank);
                if (userRank) {
                    rank_data.push({ team_member, rank: userRank });
                    break; // Break if we find the required rank for this team member
                }
            }
        }

         rank_ids_count=rank_data.length ;
        if(rank_ids_count>=5){
            status=1;
        }else{
            status=0;
        }
    
    }else{
        status=0
    }
    return { rank_data,status,sponsor_ids,rank_ids_count };
}
    

    async achieve_rank(req, res, next) {
        try {
            // Ensure user is authenticated
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ ...INVALID_REQUEST, message: "User not authenticated" });
            }
            const { uid } = req.user;
            
            // Retrieve the plan and rewards
            const plan = await PlansInfo.findOne();
            if (!plan || !plan.achieve_rank ) {
                return res.status(404).json({ message: 'Plan not found or rewards not found in the plan' });
            }
            let name = "";
                if (plan.achieve_rank.length > 0) {
                    for (const level of plan.achieve_rank) {
                        const userRanks = await Ranks.find({ uid: uid, rankId: level.level_required });
                        if (userRanks.length > 0) {
                            console.log("user_data",userRanks);
                            name = level.rank_name;
                            
                        }
                    }
                }

            console.log("achieve_data",name);
            // Retrieve the user's ranks
            const ranks = await Ranks.find({ uid });
            const userWallet = await UserWallet.findOne({ uid });
    
            if (!userWallet) {
                return res.status(404).json({ message: 'User wallet not found' });
            }
    
    
            // Calculate the sum of all fields if teamSection is not empty
          
    
            return res.status(200).json(plan.achieve_rank);
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

   
    
}

const rank = new RANK();
module.exports = rank;
