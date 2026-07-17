const Activity = require("../../MODALS/Activity");
const PlansInfo = require("../../MODALS/Plan");
const Ranks = require("../../MODALS/Ranks");
const Upline = require("../../MODALS/upline_bonus");
const UserData = require("../../MODALS/userData");
const Action = require("../../SERVICES/Activity");
const transaction = require("../../SERVICES/Transaction");
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
class REWARDS {

    async get_upline_bonus(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, startDate, endDate, username, ...filters } = req.query;
    
            const query = {};
    
            // Apply additional filters
            for (const key in filters) {
                if (!isNaN(filters[key])) {
                    query[key] = parseInt(filters[key]);
                } else if (filters[key]) {
                    query[key] = new RegExp(filters[key], 'i'); // Handle other filters (like item or rankName)
                }
            }
    
            // If the role is not admin, restrict results to the user's own ranks
            if (role !== 'admin') {
                query.uid = uid;
            }
    
            // Date range filtering
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    query.createdAt.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
                }
                if (endDate) {
                    query.createdAt.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                }
            }
    
            // Handle search for specific items or ranks
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { item: searchRegex },
                    { rankName: searchRegex }
                ];
            }
    
            if (username) {
                const userSearchRegex = new RegExp(username, 'i');
                const matchingUsers = await UserData.find({
                    username: userSearchRegex
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);
    
                query.uid = { $in: matchingUserIds };
            }
    
            const ranks = await Upline.find(query)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
    
            const totalCount = await Upline.countDocuments(query);
    
            const allUsers = await UserData.find({ uid: { $in: ranks.map(item => item.uid) } });
            const data = ranks.map(rank => {
                const username = allUsers.find(item => item.uid == rank.uid)?.username;
                return {
                    ...rank._doc,
                    username
                };
            });
    
            res.status(200).json({
                success: true,
                data,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                ...filters
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async allRewardRequest(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, startDate, endDate, name, username, ...filters } = req.query;
    
            const query = {};
    
            // Apply additional filters
            for (const key in filters) {
                if (!isNaN(filters[key])) {
                    query[key] = parseInt(filters[key]);
                } else if (filters[key]) {
                    query[key] = new RegExp(filters[key], 'i'); // Handle other filters (like item or rankName)
                }
            }
    
            // If the role is not admin, restrict results to the user's own ranks
            if (role !== 'admin') {
                query.uid = uid;
            }
    
            // Date range filtering
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    query.createdAt.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
                }
                if (endDate) {
                    query.createdAt.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                }
            }
    
            // Handle search for specific items or ranks
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { item: searchRegex },
                    { rankName: searchRegex }
                ];
            }
    
            if (username) {
                const userSearchRegex = new RegExp(username, 'i');
                const matchingUsers = await UserData.find({
                    username: userSearchRegex
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);
    
                query.uid = { $in: matchingUserIds };
            }

            if (name) {
                const userSearchRegex = new RegExp(name, 'i');
                const matchingUsers = await UserData.find({
                    name: userSearchRegex
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);
    
                query.uid = { $in: matchingUserIds };
            }
    
            const ranks = await Ranks.find(query)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
    
            const totalCount = await Ranks.countDocuments(query);
    
            const allUsers = await UserData.find({ uid: { $in: ranks.map(item => item.uid) } });
            const { reward: { rewards } } = await PlansInfo.findOne();
            const data = ranks.map(rank => {
                const reward = rewards.find(item => item.rankId == rank.rankId);
                const username = allUsers.find(item => item.uid == rank.uid)?.username;
                const name = allUsers.find(item => item.uid == rank.uid)?.name;
                return {
                    ...rank._doc,
                    username,
                    name
                };
            });
    
            res.status(200).json({
                success: true,
                data,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                ...filters
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    
    

    async approveRewardRequests(req, res) {
        try {
            
            const { requestIds } = req.body;

            console.log(req.body)
            // Validate request
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json( "failed" );
            }

            const rewards = await Ranks.find({ Id: { $in: requestIds } });

            // Process each reward 
            for (let reward of rewards) {
                const { item } = reward;
                console.log("rewardsss",rewards)

                // Check if the item matches the reward_item (assuming reward_item is a predefined value)
                if (item !== 'reward_item') {
                    // Update user's wallet here (pseudo-code)
                    // await updateUserWallet(reward.uid, reward.amount);
                    res.status(200).json({ message: 'Rewards approved successfully.' });
                }
                else{

                    res.status(200).json({ message: 'Rewards approved successfully.' });
                }

               
                // reward.paid = 1;
                // await reward.save();
           

            // Send success response
            
            res.status(200).json({ message: 'Rewards approved successfully.' });
        } 
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async rejectPaymentRequests(req, res) {
        try {
            const { requestIds } = req.body;

            // Validate request
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Request IDs must be provided in an array.' });
            }

            // Update the status of the specified payment requests to 'rejected'
            await Transaction.updateMany(
                { _id: { $in: requestIds }, status: 0 },
                { $set: { status: 2 } }
            );

            // Send success response
            res.status(200).json({ message: 'Payment requests rejected successfully.' });
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
   
}
const Rewards = new REWARDS()
module.exports = Rewards;