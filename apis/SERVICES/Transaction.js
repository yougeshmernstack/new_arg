const advance_info = require("../MODALS/advanceInfo");
const getNextTxId = require("../MODALS/Counter");
const Transaction = require("../MODALS/transactions");
const Wallets = require("../MODALS/wallets");
const { getPanelWallets, updatePanelWalletValue, resolveWalletModel } = require("../utils/panelWallet");

const { errorLogger } = require("../utils/logger");

function safeRequire(modulePath) {
    try {
        return require(modulePath);
    } catch (err) {
        return null;
    }
}

const UserData = safeRequire("../MODALS/userData");
const UserWallet = safeRequire("../MODALS/userWallets");
const UserPaymentOption = safeRequire("../MODALS/UserPaymentOption");
const Ranks = safeRequire("../MODALS/Ranks");
const Rewards = safeRequire("../SERVICES/Rank&Rewards");
const Team = safeRequire("../SERVICES/UpdateTeam");

class TRANSACTION {
    async insert(transactionData) {
        try {
            // Array to store all saved transactions
            const savedTransactions = [];
            const tx_count = await getNextTxId('transactionId')
            // Iterate over each transaction in transactionData
            for (let index = 0; index < transactionData.length; index++) {
                let element = transactionData[index];
                // console.log("transactionData",transactionData)
                // console.log("element",element)
                const { uid, order_Id, source, amount, debit_credit, Status, wallet_type, release } = element;
                // Save transaction to the database
                if (element.amount > 0) {
                    const orderTransaction = order_Id
                        ? await Transaction.findOne({ uid, status: 1, order_Id, source }).sort({ tx_Id: -1 }).limit(1)
                        : null;

                    const sourceTransaction = await Transaction.findOne({ uid, status: 1, source }).sort({ tx_Id: -1 }).limit(1);
                    const overallTransaction = await Transaction.findOne({ uid, status: 1, wallet_type }).sort({ tx_Id: -1 }).limit(1);

                    const close_ord = orderTransaction?.close_ord || 0;
                    const close_src = sourceTransaction?.close_src || 0;
                    const overall_close = overallTransaction?.overall_close || 0;
                    const transaction = new Transaction({
                        // tx_Id: tx_count + index + 1,
                        open_ord: close_ord.toFixed(4),
                        close_ord: (close_ord + (order_Id ? amount : 0)).toFixed(4),
                        open_src: close_src.toFixed(4),
                        close_src: (close_src + amount).toFixed(4),
                        overall_open: overall_close.toFixed(4),
                        overall_close: (overall_close + ((debit_credit === 'credit') ? amount : -amount)).toFixed(4),
                        ...element
                    })
                    const savedTransaction = await transaction.save();
                    savedTransactions.push(savedTransaction);
                    // console.log("savedTransaction",savedTransaction)
                    // Update wallets for the saved transaction
                    await this.updateWallet(savedTransaction.tx_Id, Status, release);

                    if (UserData && savedTransaction.source === "roi_income") {
                        const userData = await UserData.findOne({ uid });
                        if (userData) userData.booster_income;
                    }
                }
            }

            // Return all saved transactions
            return savedTransactions;
        } catch (error) {
            errorLogger(error)
            // Handle error
            console.error('Error saving transactions:', error);
            throw error;
        }
    }

    // async insert(transactionData) {
    //     try {
    //         // Array to store all saved transactions
    //         const savedTransactions = [];
    //         const lastTrans = await Transaction.findOne().sort({ tx_Id: -1 });
    //         const tx_count = lastTrans ? lastTrans.tx_Id : 0;
    //         // Iterate over each transaction in transactionData
    //         for (let index = 0; index < transactionData.length; index++) {
    //             const element = transactionData[index];
    //             const { uid, order_Id, source, amount, debit_credit, Status, wallet_type, release } = element;
    //             // Save transaction to the database
    //             if (element.amount > 0) {
    //                 const orderTransaction = order_Id
    //                     ? await Transaction.findOne({ uid, status: 1, order_Id, source }).sort({ tx_Id: -1 }).limit(1)
    //                     : null;

    //                 const sourceTransaction = await Transaction.findOne({ uid, status: 1, source }).sort({ tx_Id: -1 }).limit(1);
    //                 const overallTransaction = await Transaction.findOne({ uid, status: 1, wallet_type }).sort({ tx_Id: -1 }).limit(1);

    //                 const close_ord = orderTransaction?.close_ord || 0;
    //                 const close_src = sourceTransaction?.close_src || 0;
    //                 const overall_close = overallTransaction?.overall_close || 0;
    //                 const transaction = new Transaction({
    //                     tx_Id: tx_count + index + 1,
    //                     open_ord: close_ord.toFixed(4),
    //                     close_ord: (close_ord + (order_Id ? amount : 0)).toFixed(4),
    //                     open_src: close_src.toFixed(4),
    //                     close_src: (close_src + amount).toFixed(4),
    //                     overall_open: overall_close.toFixed(4),
    //                     overall_close: (overall_close + ((debit_credit === 'credit') ? amount : -amount)).toFixed(4),
    //                     ...element
    //                 })
    //                 const savedTransaction = await transaction.save();
    //                 savedTransactions.push(savedTransaction);

    //                 // Update wallets for the saved transaction
    //                 await this.updateWallet(savedTransaction.tx_Id, Status, release);
    //             }
    //         }

    //         // Return all saved transactions
    //         return savedTransactions;
    //     } catch (error) {
    //         errorLogger(error)
    //         // Handle error
    //         console.error('Error saving transactions:', error);
    //         throw error;
    //     }
    // }

    async update(query, data) {
        try {
            const updated = await Transaction.updateMany(query, data, { new: true });
            const updatedDocuments = await Transaction.find(query);
            for (let index = 0; index < updatedDocuments.length; index++) {
                const { tx_Id } = updatedDocuments[index];
                const close_wallet = await this.updateWallet(tx_Id, 2)
            }
            // console.log('==================',updatedDocuments)
            return updatedDocuments;
        } catch (error) {
            errorLogger(error)
            console.log(error)
        }
    }

    async updateWallet(tx_Id, status, release) {
        const txDoc = await Transaction.findOne({ tx_Id, status: 0 });
        if (!txDoc) return;

        const { uid, wallet_type: slug, amount, source, debit_credit, panel } = txDoc;
        if (!uid || !slug || !amount || !debit_credit) {
            return;
        }
        try {
            // Panel wallets (distributor / franchise / theme / admin)
            if (panel && resolveWalletModel(panel)) {
                const wallets = await getPanelWallets(panel, uid, [slug]);
                const entry = wallets.find((w) => w.slug === slug);
                if (!entry) return;

                let newValue;
                if (debit_credit === 'credit') {
                    newValue = Number(entry.value) + Number(amount);
                } else {
                    newValue = Number(entry.value) - Number(amount);
                }

                if (release == 1) {
                    await updatePanelWalletValue(panel, uid, slug, newValue);
                }

                await Transaction.findOneAndUpdate(
                    { tx_Id },
                    { status, release }
                );
                return;
            }

            // Legacy UserWallet path (optional — model may be absent)
            if (!UserWallet) {
                await Transaction.findOneAndUpdate({ tx_Id }, { status, release });
                return;
            }

            const walletDoc = await UserWallet.findOne({ uid, 'wallets.slug': slug }, { 'wallets.$': 1 });
            const wallets = walletDoc?.wallets;
            const sourceWallets = await UserWallet.findOne({ uid, 'wallets.slug': source }, { 'wallets.$': 1 });
            if (!wallets) {
                return;
            }
            let newValue;
            let newValueSrc;
            if (debit_credit == 'credit') {
                newValue = (Number(wallets[0].value) + Number(amount))
                newValueSrc = (Number(sourceWallets?.wallets[0].value) + Number(amount))
            } else {
                newValue = (Number(wallets[0].value) - Number(amount))
                newValueSrc = (Number(sourceWallets?.wallets[0].value) - Number(amount))
            }
            if (release == 1) {
                await UserWallet.findOneAndUpdate(
                    { uid, 'wallets.slug': slug },
                    { $set: { 'wallets.$.value': newValue } },
                    { new: true }
                );
            }
            if (sourceWallets) {
                await UserWallet.findOneAndUpdate(
                    { uid, 'wallets.slug': source },
                    { $set: { 'wallets.$.value': newValueSrc } },
                    { new: true }
                );
            }

            await Transaction.findOneAndUpdate(
                { tx_Id },
                {
                    status,
                    release
                }
            );
            return;
        } catch (error) {
            errorLogger(error)
            console.error('Error updating main wallet:', error);
            throw error;
        }

    }
    async updateOpenClose(tx_Id) {
        try {
            const { uid, order_Id, source, amount, debit_credit } = await Transaction.findOne({ tx_Id });
            const orderTransaction = order_Id
                ? await Transaction.findOne({ uid, status: 1, order_Id, source }).sort({ updatedAt: -1 }).limit(1)
                : null;

            const sourceTransaction = await Transaction.findOne({ uid, status: 1, source }).sort({ updatedAt: -1 }).limit(1);
            const overallTransaction = await Transaction.findOne({ uid, status: 1 }).sort({ updatedAt: -1 }).limit(1);

            const close_ord = orderTransaction?.close_ord || 0;
            const close_src = sourceTransaction?.close_src || 0;
            const overall_close = overallTransaction?.overall_close || 0;
            // console.log('open close',overallTransaction)
            const updatedTras = await Transaction.findOneAndUpdate(
                { tx_Id },
                {
                    open_ord: close_ord,
                    close_ord: close_ord + (order_Id ? amount : 0),
                    open_src: close_src,
                    close_src: close_src + amount,
                    overall_open: overall_close,
                    overall_close: overall_close + ((debit_credit === 'credit') ? amount : -amount)
                }, { new: true }
            );
            return updatedTras.overall_close;
        } catch (error) {
            errorLogger(error)
            console.log(error)
        }
    }

    async getTransactions(req, res) {
        try {
            const { uid, role } = req.user;
            const {
                page = "1",
                limit = "10",
                from,
                search,
                fromname,
                userstatus,
                rank,
                release,
                startDate,
                endDate,
                ...filters
            } = req.query;

            console.log("Queries: ", req.query);
            // Convert pagination parameters to numbers
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;

            // Initialize the query for transactions
            const query = {
                source: { $ne: "fund_transfer_to_game" },
            };

            // For non-admins, restrict transactions to their own uid
            if (role !== 'admin' && role !== 'manager') {
                query.uid = uid;
            }


            console.log("Filter: ", filters);
            // Apply any extra filters (like status, source, etc.)
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    query[key] = isNaN(value) ? value : parseInt(value, 10);
                }
            });

            // Time range filtering for the transaction's time field
            if (startDate || endDate) {
                query.time = {};
                if (startDate) {
                    query.time.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
                }
                if (endDate) {
                    query.time.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                }
            }

            // Filter based on user status if provided (for admin)
            const userFilters = {};
            if (userstatus) {
                userFilters.status = userstatus;
            }
            const matchingUsers = await UserData.find(userFilters, 'uid');
            const matchingUserIds = matchingUsers.map(user => user.uid);

            if (role === 'admin' && role !== "manager") {
                query.uid = { $in: matchingUserIds };
            } else if (userstatus) {
                query.uid = { $in: matchingUserIds, $eq: uid };
            }

            // Filter by rank if provided
            if (rank) {
                const matchingRanks = await Ranks.find({ rankName: rank.toLowerCase() });
                const matchingRankUserIds = matchingRanks.map(r => r.uid);
                if (query.uid) {
                    if (query.uid.$in) {
                        const intersected = query.uid.$in.filter(id => matchingRankUserIds.includes(id));
                        query.uid.$in = intersected;
                    } else {
                        if (!matchingRankUserIds.includes(query.uid)) {
                            query.uid = { $in: [] };
                        }
                    }
                } else {
                    query.uid = { $in: matchingRankUserIds };
                }
            }

            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find({
                    $or: [
                        { username: userSearchRegex },
                        // { name: userSearchRegex }
                    ]
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);

                if (role === 'admin' || role === "manager") {
                    // For admin, filter by matching user IDs
                    query.uid = { $in: matchingUserIds };
                } else {
                    // For regular users, ensure search only includes their own transactions
                    query.uid = {
                        $in: matchingUserIds,
                        $eq: uid
                    };
                }
            }

            // Filter by fromname and/or from (username)
            if (fromname || from) {
                let fromUserIds = [];
                if (fromname) {
                    const fromUsersByName = await UserData.find({ name: fromname.toLowerCase() }, 'uid');
                    fromUserIds = fromUsersByName.map(user => user.uid);
                }
                if (from) {
                    const fromUsersByUsername = await UserData.find({ username: from.toLowerCase() }, 'uid');
                    const fromUserIdsByUsername = fromUsersByUsername.map(user => user.uid);
                    fromUserIds = fromUserIds.length
                        ? fromUserIds.filter(id => fromUserIdsByUsername.includes(id))
                        : fromUserIdsByUsername;
                }
                query.to_from = { $in: fromUserIds.length ? fromUserIds : [] };
            }

            // Apply the release filter if provided (converting appropriately)
            if (release !== undefined && release !== '') {
                query.release = isNaN(release) ? release.toLowerCase() : parseInt(release, 10);
            }

            // Retrieve transactions with pagination and sort by creation date descending
            const transactions = await Transaction.find(query)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .sort({ createdAt: -1 });

            const totalCount = await Transaction.countDocuments(query);

            // Calculate debit and credit sums
            const debitSumAgg = await Transaction.aggregate([
                { $match: { ...query, debit_credit: 'debit' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const creditSumAgg = await Transaction.aggregate([
                { $match: { ...query, debit_credit: 'credit' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const debitSum = debitSumAgg[0]?.total || 0;
            const creditSum = creditSumAgg[0]?.total || 0;

            // Gather related user IDs (from both uid and to_from fields)
            const userIds = transactions
                .flatMap(tx => [tx.uid, tx.to_from])
                .filter(id => id != null);

            const users = await UserData.find({ uid: { $in: userIds } }, 'uid username name status');
            const userMap = users.reduce((acc, user) => {
                acc[user.uid] = user;
                return acc;
            }, {});

            // Get rank details for user IDs (ensure conversion to numbers if needed)
            const numericUserIds = [...new Set(userIds.map(id => Number(id)).filter(id => !isNaN(id)))];
            const ranks = await Ranks.find({ uid: { $in: numericUserIds } });
            const rankMap = ranks.reduce((acc, rank) => {
                acc[rank.uid] = rank;
                return acc;
            }, {});

            // Build the final transaction data without overwriting the transaction's own "status"
            const bank_details = await UserPaymentOption.find();
            const bankDetailsMap = bank_details.reduce((acc, b_user) => {
                acc[b_user.uid] = b_user;
                return acc;
            }, {});
            const transactionData = transactions.map(tx => ({
                ...tx.toObject(),
                username: userMap[tx.uid]?.username,
                from: userMap[tx.to_from]?.username,
                fromname: userMap[tx.to_from]?.name,
                bankDetails: bankDetailsMap[tx.uid] ? bankDetailsMap[tx.uid].bank[0] : {},
                name: userMap[tx.uid]?.name,
                userStatus: userMap[tx.uid]?.status,  // Renamed property to avoid conflict with tx.status
                rank: rankMap[tx.uid]?.rankName || "No Rank"
            }));

            res.status(200).json({
                success: true,
                data: transactionData,
                totalRecords: totalCount,
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                debitSum,
                creditSum
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // async getcommunity_team_transactions(req, res) {
    //     try {
    //         const { uid, role } = req.user;
    //         const {
    //             page = "1",
    //             limit = "10",
    //             from,
    //             fromname,
    //             userstatus,
    //             rank,
    //             release,
    //             startDate,
    //             endDate,
    //             teamType,
    //             ...filters
    //         } = req.query;

    //         const pageNum = parseInt(page, 10) || 1;
    //         const limitNum = parseInt(limit, 10) || 10;

    //         const query = {
    //             source: "community_income",
    //             status: 1
    //         };

    //         // Get team structure
    //         const {
    //             topUid,
    //             secondTopUid,
    //             otherUids
    //         } = await Rewards.calculateTotalTeamBusiness(uid);

    //         // Initialize array to store all team member UIDs
    //         let allTeamMemberUids = new Set();

    //         // Function to get all downline members for a given UID
    //         const getAllDownlineMembers = async (teamUid) => {
    //             const teamData = await Team.getAllTeamUIDsByLevel_withlevel(teamUid);
    //             if (!teamData || !Array.isArray(teamData)) return [];

    //             const downlineUids = new Set();
    //             teamData.forEach(levelData => {
    //                 if (levelData.level > 1 && Array.isArray(levelData.uids)) {
    //                     levelData.uids.forEach(memberId => {
    //                         if (memberId) downlineUids.add(Number(memberId));
    //                     });
    //                 }
    //             });
    //             return [...downlineUids];
    //         };

    //         // Process team members based on teamType
    //         if (teamType) {
    //             let initialUids = [];
    //             switch (teamType) {
    //                 case "topLeg":
    //                     initialUids = Array.isArray(topUid) ? topUid : [topUid];
    //                     break;
    //                 case "secondTopLeg":
    //                     initialUids = Array.isArray(secondTopUid) ? secondTopUid : [secondTopUid];
    //                     break;
    //                 case "otherLeg":
    //                     initialUids = otherUids;
    //                     break;
    //                 default:
    //                     initialUids = [
    //                         ...(Array.isArray(topUid) ? topUid : [topUid]),
    //                         ...(Array.isArray(secondTopUid) ? secondTopUid : [secondTopUid]),
    //                         ...otherUids
    //                     ];
    //             }

    //             // Filter out invalid UIDs
    //             initialUids = initialUids.filter(id => id && !isNaN(id));

    //             // Get downline members for each initial UID
    //             for (const teamUid of initialUids) {
    //                 const downlineMembers = await getAllDownlineMembers(teamUid);
    //                 downlineMembers.forEach(id => allTeamMemberUids.add(id));
    //                 allTeamMemberUids.add(Number(teamUid));
    //             }

    //             // Add to_from filter for team members
    //             query.to_from = { $in: [...allTeamMemberUids] };
    //         }

    //         // Apply date filters
    //         if (startDate || endDate) {
    //             query.time = {};
    //             if (startDate) {
    //                 query.time.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    //             }
    //             if (endDate) {
    //                 query.time.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    //             }
    //         }

    //         // Apply user status filter
    //         if (userstatus) {
    //             const matchingUsers = await UserData.find({ status: userstatus }, 'uid');
    //             const matchingUserIds = matchingUsers.map(user => Number(user.uid));
    //             if (query.to_from) {
    //                 query.to_from.$in = query.to_from.$in.filter(id => matchingUserIds.includes(id));
    //             } else {
    //                 query.to_from = { $in: matchingUserIds };
    //             }
    //         }

    //         // Apply rank filter
    //         if (rank) {
    //             const matchingRanks = await Ranks.find({ rankName: rank.toLowerCase() });
    //             const matchingRankUserIds = matchingRanks.map(r => Number(r.uid));
    //             if (query.to_from) {
    //                 query.to_from.$in = query.to_from.$in.filter(id => matchingRankUserIds.includes(id));
    //             } else {
    //                 query.to_from = { $in: matchingRankUserIds };
    //             }
    //         }

    //         // Apply from/fromname filter
    //         if (fromname || from) {
    //             let fromUserIds = [];
    //             if (fromname) {
    //                 const fromUsersByName = await UserData.find({ name: fromname.toLowerCase() }, 'uid');
    //                 fromUserIds = fromUsersByName.map(user => Number(user.uid));
    //             }
    //             if (from) {
    //                 const fromUsersByUsername = await UserData.find({ username: from.toLowerCase() }, 'uid');
    //                 const fromUserIdsByUsername = fromUsersByUsername.map(user => Number(user.uid));
    //                 fromUserIds = fromUserIds.length
    //                     ? fromUserIds.filter(id => fromUserIdsByUsername.includes(id))
    //                     : fromUserIdsByUsername;
    //             }
    //             if (query.to_from) {
    //                 query.to_from.$in = query.to_from.$in.filter(id => fromUserIds.includes(id));
    //             } else {
    //                 query.to_from = { $in: fromUserIds };
    //             }
    //         }

    //         // Apply release filter
    //         if (release !== undefined && release !== '') {
    //             query.release = isNaN(release) ? release.toLowerCase() : parseInt(release, 10);
    //         }

    //         // Get transactions with pagination
    //         const transactions = await Transaction.find(query)
    //             .skip((pageNum - 1) * limitNum)
    //             .limit(limitNum)
    //             .sort({ createdAt: -1 });

    //         const totalCount = await Transaction.countDocuments(query);

    //         // Calculate sums
    //         const debitSumAgg = await Transaction.aggregate([
    //             { $match: { ...query, debit_credit: 'debit' } },
    //             { $group: { _id: null, total: { $sum: '$amount' } } }
    //         ]);
    //         const creditSumAgg = await Transaction.aggregate([
    //             { $match: { ...query, debit_credit: 'credit' } },
    //             { $group: { _id: null, total: { $sum: '$amount' } } }
    //         ]);
    //         const debitSum = debitSumAgg[0]?.total || 0;
    //         const creditSum = creditSumAgg[0]?.total || 0;

    //         // Get user and rank data
    //         const userIds = transactions
    //             .flatMap(tx => [ tx.to_from])
    //             .filter(id => id != null)
    //             .map(id => Number(id));
    //         console.log("userIds: ", userIds);
    //         const users = await UserData.find({ uid: { $in: userIds } }, 'uid username name status');
    //         const userMap = users.reduce((acc, user) => {
    //             acc[user.uid] = user;
    //             return acc;
    //         }, {});

    //         const ranks = await Ranks.find({ uid: { $in: userIds } });
    //         const rankMap = ranks.reduce((acc, rank) => {
    //             acc[rank.uid] = rank;
    //             return acc;
    //         }, {});

    //         // Format response data
    //         const transactionData = transactions.map(tx => ({
    //             ...tx.toObject(),
    //             username: userMap[tx.uid]?.username,
    //             from: userMap[tx.to_from]?.username,
    //             fromname: userMap[tx.to_from]?.name,
    //             name: userMap[tx.uid]?.name,
    //             userStatus: userMap[tx.uid]?.status,
    //             rank: rankMap[tx.to_from]?.rankName || "No Rank"
    //         }));

    //         res.status(200).json({
    //             success: true,
    //             data: transactionData,
    //             totalRecords: totalCount,
    //             currentPage: pageNum,
    //             totalPages: Math.ceil(totalCount / limitNum),
    //             debitSum,
    //             creditSum
    //         });
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ success: false, message: error.message });
    //     }
    // }


    async getIncomeTransactions(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, startDate, endDate, ...filters } = req.query;

            const matchQuery = {};

            // Apply filters based on user role
            if (role !== 'admin') {
                // Restrict to user's own transactions if not admin
                matchQuery.uid = !isNaN(uid) ? parseInt(uid) : uid; // Ensure uid is a number or string
            }

            // Apply additional filters
            for (const key in filters) {
                matchQuery[key] = !isNaN(filters[key]) ? parseInt(filters[key]) : new RegExp(filters[key], 'i');
            }

            // Date range filtering
            if (startDate || endDate) {
                matchQuery.time = {};
                if (startDate) {
                    matchQuery.time.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
                }
                if (endDate) {
                    matchQuery.time.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                }
            }

            // Fetch wallets with status=1 and wallet_type='income', and get the slugs and names
            const wallets = await Wallets.find(
                {
                    status: 1,
                    wallet_type: 'income',
                },
                'slug name'
            );

            // Create a mapping of slug to name
            const walletNameMap = wallets.reduce((map, wallet) => {
                map[wallet.slug] = wallet.name;
                return map;
            }, {});

            const walletSlugs = wallets.map((wallet) => wallet.slug);

            if (walletSlugs.length === 0) {
                return res.status(400).json({ success: false, message: 'No matching wallets found.' });
            }

            // Update matchQuery to include the fetched wallet slugs
            matchQuery.source = { $in: walletSlugs };

            // If search term is provided, find matching users
            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find(
                    {
                        $or: [{ username: userSearchRegex }, { name: userSearchRegex }],
                    },
                    'uid'
                );
                const matchingUserIds = matchingUsers.map((user) => user.uid);

                if (role === 'admin' || role === 'manager') {
                    // Admin can see all transactions, filter by search if provided
                    matchQuery.uid = { $in: matchingUserIds.length ? matchingUserIds : [uid] };
                } else {
                    // Non-admin users can only see their own transactions
                    matchQuery.uid = { $eq: uid };
                }
            }

            // Get today's date range
            const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
            const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

            // Aggregation pipeline to group by source and sum amounts, including today's totals
            const transactions = await Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$source', // Group by source (slug)
                        totalAmount: { $sum: '$amount' }, // Sum of amount for each source
                        transactionCount: { $sum: 1 }, // Count number of transactions per source
                        todayAmount: {
                            $sum: {
                                $cond: [
                                    { $and: [{ $gte: ['$time', todayStart] }, { $lt: ['$time', todayEnd] }] },
                                    '$amount',
                                    0
                                ]
                            }
                        } // Sum of amounts for today
                    },
                },
                { $sort: { totalAmount: -1 } }, // Sort by total amount in descending order
            ]);

            // Ensure all slugs are included with totalAmount = 0 and todayAmount = 0 if missing
            const transactionsWithNames = walletSlugs.map((slug) => {
                const transaction = transactions.find((t) => t._id === slug);
                return {
                    slug,
                    name: walletNameMap[slug] || 'Unknown', // Fetch name from the map or use 'Unknown'
                    totalAmount: transaction ? transaction.totalAmount : 0,
                    transactionCount: transaction ? transaction.transactionCount : 0,
                    todayAmount: transaction ? transaction.todayAmount : 0, // Include today's total
                };
            });

            // Calculate the total sum of all totalAmount values
            const totalSum = transactionsWithNames.reduce((sum, item) => sum + item.totalAmount, 0);

            // Calculate the total sum of today's amounts
            const totalTodaySum = transactionsWithNames.reduce((sum, item) => sum + item.todayAmount, 0);

            // Apply pagination manually
            const paginatedData = transactionsWithNames.slice((page - 1) * limit, page * limit);

            // Send the response with the data
            res.status(200).json({
                success: true,
                data: paginatedData,
                totalSources: transactionsWithNames.length,
                totalSum, // Include the total sum of all total amounts
                totalTodaySum, // Include the total sum of today's amounts
                currentPage: parseInt(page),
                totalPages: Math.ceil(transactionsWithNames.length / limit),
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // new 
    async getcommunity_team_transactions(req, res) {
        try {
            const { uid } = req.user;
            const { page = "1", limit = "10", teamType, startDate, endDate, source = "community_income" } = req.query;

            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;

            // Base Query for Transactions
            const query = { source: source, status: 1 };

            // Fetch Team Members for Filtering
            const { topUid, secondTopUid, otherUids } = await Rewards.calculateTotalTeamBusiness(uid);
            // Use Set from the beginning to avoid duplicates
            let allTeamMemberUids = new Set();

            // Fetch All Downline Members for a Given Team UID
            const getAllDownlineMembers = async (teamUid) => {
                const teamData = await Team.getAllTeamUIDsByLevel_withlevel(teamUid);
                if (!teamData || !Array.isArray(teamData)) return [];

                // Ensure that each item in the array has a uids property before attempting to access it
                // Use Set to deduplicate here too
                return [...new Set(teamData.flatMap(levelData =>
                    (levelData && levelData.uids) ? levelData.uids.map(id => Number(id)) : []
                ))];
            };

            if (teamType) {
                let initialUids = [];
                switch (teamType) {
                    case "topLeg":
                        initialUids = topUid ? (Array.isArray(topUid) ? topUid : [topUid]) : [];
                        break;
                    case "secondTopLeg":
                        initialUids = secondTopUid ? (Array.isArray(secondTopUid) ? secondTopUid : [secondTopUid]) : [];
                        break;
                    case "otherLeg":
                        initialUids = Array.isArray(otherUids) ? otherUids : [];
                        break;
                    default:
                        // Ensure all variables are arrays before spreading
                        const topArray = Array.isArray(topUid) ? topUid : (topUid ? [topUid] : []);
                        const secondArray = Array.isArray(secondTopUid) ? secondTopUid : (secondTopUid ? [secondTopUid] : []);
                        const otherArray = Array.isArray(otherUids) ? otherUids : [];
                        // Use Set constructor directly to deduplicate
                        initialUids = [...new Set([...topArray, ...secondArray, ...otherArray])];
                }

                // Remove invalid UIDs
                initialUids = initialUids.filter(id => id !== null && id !== undefined && !isNaN(id))
                    .map(id => Number(id)); // Convert all to numbers for consistency

                // Deduplicate initial UIDs
                initialUids = [...new Set(initialUids)];

                // Fetch Downline Members and Add to Set
                for (const teamUid of initialUids) {
                    const downlineMembers = await getAllDownlineMembers(teamUid);
                    // Set automatically handles duplicates
                    downlineMembers.forEach(id => allTeamMemberUids.add(Number(id)));
                    allTeamMemberUids.add(Number(teamUid)); // Ensure consistent type for teamUid
                }

                // Only apply team filter if we have team members
                if (allTeamMemberUids.size > 0) {
                    // Convert Set to Array of Numbers for MongoDB query
                    const uniqueTeamMembers = [...allTeamMemberUids].map(id => Number(id));
                    query.to_from = { $in: uniqueTeamMembers };
                }
            }

            // Apply Date Filters
            if (startDate || endDate) {
                query.time = {};
                if (startDate) {
                    const startDateTime = new Date(startDate);
                    if (!isNaN(startDateTime.getTime())) { // Check if date is valid
                        query.time.$gte = new Date(startDateTime.setHours(0, 0, 0, 0));
                    }
                }
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    if (!isNaN(endDateTime.getTime())) { // Check if date is valid
                        query.time.$lt = new Date(endDateTime.setHours(23, 59, 59, 999));
                    }
                }
            }

            // Add uid field to the query to ensure we only get transactions for this user
            query.uid = Number(uid);

            // Get Total Count for Pagination before applying skip & limit
            const totalCount = await Transaction.countDocuments(query);

            // Fetch Transactions with Pagination
            const transactions = await Transaction.find(query)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean();

            // Use transaction ID as unique identifier
            const uniqueTransactions = [];
            const seenIds = new Set();

            for (const tx of transactions) {
                if (tx && tx._id) {
                    const idStr = tx._id.toString();
                    if (!seenIds.has(idStr)) {
                        seenIds.add(idStr);
                        uniqueTransactions.push(tx);
                    }
                }
            }

            // Calculate Sums in Parallel
            const [debitSumAgg, creditSumAgg] = await Promise.all([
                Transaction.aggregate([
                    { $match: { ...query, debit_credit: 'debit' } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),
                Transaction.aggregate([
                    { $match: { ...query, debit_credit: 'credit' } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ])
            ]);

            const debitSum = debitSumAgg[0]?.total || 0;
            const creditSum = creditSumAgg[0]?.total || 0;

            // Extract unique user IDs from transactions
            const userIds = [...new Set(uniqueTransactions
                .filter(tx => tx && tx.to_from) // Ensure tx and tx.to_from exist
                .map(tx => Number(tx.to_from)))]; // Convert to number for consistency

            // Only fetch users and ranks if we have userIds
            let userMap = {};
            let rankMap = {};

            if (userIds.length > 0) {
                // Fetch Users & Ranks in One Batch
                const [users, ranks] = await Promise.all([
                    UserData.find({ uid: { $in: userIds } }, 'uid username name status').lean(),
                    Ranks.find({ uid: { $in: userIds } }).lean()
                ]);

                // Create Lookup Maps for Fast Access
                userMap = Object.fromEntries(users.map(user => [Number(user.uid), user]));
                rankMap = Object.fromEntries(ranks.map(rank => [Number(rank.uid), rank]));
            }

            // Format Transactions with User & Rank Data
            const transactionData = uniqueTransactions.map(tx => {
                // Make sure we have valid transaction
                if (!tx) return null;

                const txToFrom = tx.to_from ? Number(tx.to_from) : null;
                const txUid = tx.uid ? Number(tx.uid) : null;

                return {
                    ...tx,
                    username: txUid && userMap[txUid]?.username || "Unknown",
                    from: txToFrom && userMap[txToFrom]?.username || "Unknown",
                    fromname: txToFrom && userMap[txToFrom]?.name || "Unknown",
                    name: txUid && userMap[txUid]?.name || "Unknown",
                    userStatus: txUid && userMap[txUid]?.status || "Unknown",
                    rank: txToFrom && rankMap[txToFrom]?.rankName || "No Rank"
                };
            }).filter(Boolean); // Remove any null entries

            // Send Final Response
            res.status(200).json({
                success: true,
                data: transactionData,
                totalRecords: totalCount,
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                debitSum,
                creditSum
            });

        } catch (error) {
            console.error("Error in getcommunity_team_transactions:", error);
            res.status(500).json({ success: false, message: error.message || "Internal server error" });
        }
    }

    async calculateDebitCreditValues(uid) {
        try {
            // Validate input
            if (!uid) {
                throw new Error('User ID is required');
            }



            // Calculate total debit and credit by wallet type
            const debitCreditByWalletType = await Transaction.aggregate([
                {
                    $match: {
                        uid: uid,
                        release: 1
                    }
                },
                {
                    $group: {
                        _id: '$wallet_type',
                        totalDebit: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$debit_credit', 'debit'] },
                                    { $toDouble: '$amount' },
                                    0
                                ]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$debit_credit', 'credit'] },
                                    { $toDouble: '$amount' },
                                    0
                                ]
                            }
                        },
                        transactionCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        wallet_type: '$_id',
                        totalDebit: { $round: ['$totalDebit', 2] },
                        totalCredit: { $round: ['$totalCredit', 2] },
                        transactionCount: 1
                    }
                },
                { $sort: { wallet_type: 1 } }
            ]);

            // Calculate total debit and credit by source
            const debitCreditBySource = await Transaction.aggregate([
                {
                    $match: {
                        status: 1,
                        uid: uid
                    }
                },
                {
                    $group: {
                        _id: '$source',
                        totalDebit: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$debit_credit', 'debit'] },
                                    { $toDouble: '$amount' },
                                    0
                                ]
                            }
                        },
                        totalCredit: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$debit_credit', 'credit'] },
                                    { $toDouble: '$amount' },
                                    0
                                ]
                            }
                        },
                        transactionCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        source: '$_id',
                        totalDebit: { $round: ['$totalDebit', 2] },
                        totalCredit: { $round: ['$totalCredit', 2] },
                        transactionCount: 1
                    }
                },
                { $sort: { source: 1 } }
            ]);

            // Log results for debugging
            console.log('Debit/Credit by Wallet Type:', debitCreditByWalletType);
            // console.log('Debit/Credit by Source:', debitCreditBySource);

            return {
                debitCreditByWalletType,
                debitCreditBySource
            };
        } catch (error) {
            console.error("Error calculating debit and credit values:", error);
            throw error;
        }
    }


}
const transaction = new TRANSACTION();
// transaction.calculateDebitCreditValues(14)
module.exports = transaction;
