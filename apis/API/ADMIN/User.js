const Activity = require("../../MODALS/Activity");
const UserData = require("../../MODALS/userData");
const UserWallet = require("../../MODALS/userWallets");
const Team = require("../../SERVICES/UpdateTeam");
// const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const bcrypt = require("bcryptjs")


const advance_info = require("../../MODALS/advanceInfo");
// const PlansInfo = require("../../MODALS/Plan");
// const Ranks = require("../../MODALS/Ranks");
// const UserPaymentOption = require("../../MODALS/UserPaymentOption");

const Email = require("../../SERVICES/SendEmail");
const sms = require("../../SERVICES/SmsService");
// const Team = require("../../SERVICES/UpdateTeam");
const { INTERNAL_SERVER_ERROR, USERNAME_ALREADY_EXISTS, INVALID_USERNAME, SPONSOR_NOT_ACTIVE ,BLOCK_USER, INVALID_REQUEST } = require("../../utils/errorMessages");
const form_validator = require("../../utils/form-validators");
const { errorLogger } = require("../../utils/logger");
const { registrationSuccess, loginSuccess, REQUEST_SUCCESS } = require("../../utils/successMessages");
const jwt = require('jsonwebtoken');
const UserPaymentOption = require("../../MODALS/UserPaymentOption");
const Orders = require("../../MODALS/Orders");
const Order = require("../../MODALS/Orders");
const Transaction = require("../../MODALS/transactions");
const crypto = require("crypto");
const LevelIncome = require("../../SERVICES/LevelIncome");

class USER {

    // register
    async register(req, res, next) {
        try {
            const { name, capping,email, mobile, pancard, password,  sponsor, username='demo', country_code, bankName, accountNumber, ifsc, holder, ac_type, branch } = req.body;

            // Check if file is uploaded
            if (!req.file || !req.file.filename) {
                res.status(400).json({ ...INVALID_REQUEST, message: 'Proof file is required' });
                return;
            }

            const upiUrl = `${req.file.filename}`;
            // Validate all required fields
            const requiredFields = {
                name: name,
                email: email,
                mobile: mobile,
                capping: capping,
                pancard: pancard,
                password: password,
                sponsor: sponsor,
                bankName: bankName,
                accountNumber: accountNumber,
                ifsc: ifsc,
                holder: holder,
                ac_type: ac_type,
                branch: branch
            };

            const missingFields = [];
            for (const [field, value] of Object.entries(requiredFields)) {
                if (value === undefined || value === null || value === '') {
                    missingFields.push(field);
                }
            }

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    missingFields: missingFields
                });
            }

            const { Registration } = await advance_info.findOne();
            const { is_mobile_required, is_email_required, is_password_required, is_sponsor_required, is_pancard_required, send_email } = Registration;
            const validUserNameResult = await form_validator.generateUserName(username || 'demo');
            if (!validUserNameResult.status) {
                res.status(INVALID_USERNAME.code).json({ ...INVALID_USERNAME });
                return;
            }


            const isEmail = is_email_required.value === "yes" ? await form_validator.isEmail(email) : { status: true };
            if (!isEmail.status) {
                res.status(400).json({ ...isEmail });
                return;
            }

            // Validate mobile if required
            const isMobile = is_mobile_required.value === "yes" ? await form_validator.isMobile(mobile, country_code) : { status: true };
            if (!isMobile.status) {
                res.status(400).json({ ...isMobile });
                return;
            }

            const isPanCard = is_pancard_required.value === "yes" ? await form_validator.isPanCard(pancard) : { status: true };
            if (!isPanCard.status) {
                res.status(400).json({ ...isPanCard });
                return;
            }

            // Validate sponsor
            const sponsorData = is_sponsor_required.value === "yes" ? await form_validator.sponsor(sponsor) : { status: true };
            if (!sponsorData.status) {
                res.status(400).json({ ...sponsorData });
                return;
            }

            const isUsernameExist = await UserData.findOne({ username: validUserNameResult.userName });
            if (isUsernameExist) {
                // next()
                res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
                return;
            }

            // Generate password if required
            const isStrongPassword = is_password_required.value === "yes" ? await form_validator.generatePassword(password) : { status: true };
            if (!isStrongPassword.status) {
                res.status(400).json({ ...isStrongPassword });
                return;
            }

            // Save user details
            const totalUsers = await UserData.find().count();
            const hashedPassword = is_password_required.value === "yes" ? await form_validator.hashPassword(isStrongPassword.password) : password;
            const user = new UserData({
                name,
                email,
                mobile,
                capping,
                pancard,
                roles: ['user'],
                password: hashedPassword,
                username: validUserNameResult.userName,
                uid: totalUsers + 1,
                profile_edit_status: 1,
                sponsor_Id: sponsorData.sponsor_Id,
                sponsor_Name: sponsorData.name,
                joining_date: new Date()
            });
            const User = await user.save();
            const payload = {
                uid: User.uid,
                username: User.username,
                role: 'user'
            };

            // Example secret key for signing the token
            const secretKey = process.env.JWT_KEY;
            const token = jwt.sign(payload, secretKey);
            // next()
            const wallet = new UserWallet({ uid: User.uid })
            await wallet.save();
            await Team.updateTeam(User.uid)

            // ✅ Save bank details in UserPaymentOption (always required)
            const userPayment = new UserPaymentOption({
                uid: User.uid,
                bank: [{
                    bankName,
                    accountNumber,
                    ifsc,
                    holder,
                    ac_type,
                    branch,
                    status: 1 // active by default for first bank
                }],
                upi: [{
                    name: req.file.filename,
                    upiId: upiUrl,
                    status: 1 // active by default for first upi
                }]
            });
            await userPayment.save();

            // ✅ Create order automatically with fixed amount 10000 and planId 1
            const fixedAmount = 10000;
            const fixedPlanId = 1;
            
            // Check if user already has an order
            const myOrder = await Orders.findOne({ uid: User.uid, status: { $in: [1, 2] } });
            let type = myOrder ? 'Re-purchase' : 'Purchase';
            
            let newOrder;
            try {
                newOrder = await Order.create({
                    uid: User.uid,
                    amount: fixedAmount,
                    source: "from_admin",
                    type,
                    order_bv: fixedAmount,
                    status: 1,
                    planId: fixedPlanId
                });
                console.log('Order created successfully:', newOrder.order_Id);
            } catch (orderError) {
                errorLogger(orderError);
                console.error('Error creating order:', orderError);
                // Continue with registration even if order creation fails
                throw orderError; // Re-throw to be caught by outer catch
            }

            // Calculate transaction charges (using same amount as withdrawal for consistency)
            const withdrawal = fixedAmount; // Using same amount as deposit
            const tx_charge = parseFloat((withdrawal * 0.05).toFixed(2)); 
            const Re_purchase_wallet = parseFloat((withdrawal * 0.10).toFixed(2)); 

            // Generate unique tx_hash
            let tx_hash;
            let isUnique = false;

            while (!isUnique) {
                tx_hash = `admin_${crypto.randomBytes(16).toString("hex")}`;
                const existingTransaction = await Transaction.findOne({ tx_hash });
                if (!existingTransaction) {
                    isUnique = true;
                }
            }

            const order = newOrder.order_Id;

            // Activate user if it's a Purchase type
            if (type == 'Purchase') {
                await UserData.findOneAndUpdate(
                    { uid: User.uid },
                    { $set: { status: 1, Activation_date: new Date() } },
                    { new: true }
                );
                
                // Check if this activation gives sponsor 2 referrals, then distribute level income
                if (User.sponsor_Id) {
                    await LevelIncome.distributeLevelIncomeOnReferralCompletion(
                        User.sponsor_Id,
                        User.uid,
                        fixedPlanId,
                        fixedAmount,
                        newOrder.order_Id
                    );
                }
            }
            
            // Update business
            await Team.updateBusiness(User.uid, fixedAmount, type);

            // Return response with order information
            const responseData = { ...registrationSuccess, token, User };
            if (newOrder) {
                responseData.order = newOrder;
                responseData.orderCreated = true;
            } else {
                responseData.orderCreated = false;
                responseData.message = "User registered but order creation failed";
            }
            res.status(200).json(responseData);
            const plainPassword = isStrongPassword.password || password;
            req.welcome = { email: User.email, name: User.name, username: User.username, password: plainPassword }
            send_email == 1 && await Email.sendWelcomeEmail(req, res, () => { });
            if (User.mobile && plainPassword) {
                try {
                    await sms.usernameSms(User.mobile, User.username, plainPassword);
                } catch (smsErr) {
                    errorLogger(smsErr);
                }
            }
            return;
        } catch (error) {
            errorLogger(error)
            res.status(500).json({ ...INTERNAL_SERVER_ERROR })
            return;
        }
    }

    // async getUserData(req, res) {
    //     try {
    //         const { uid, role } = req.user; // Assuming user information is attached to req.user
    //         const { page = 1, limit = 10, search, startDateJoining, endDateJoining, startDateActive, endDateActive, ...filters } = req.query;

    //         const query = {};

    //         // Restrict to user's own transactions if not admin
    //         if (role !== 'admin') {
    //             query.uid = uid;
    //         }

    //         // Apply additional filters
    //         for (const key in filters) {
    //             if (!isNaN(filters[key])) {
    //                 query[key] = parseInt(filters[key]);
    //             } else if (filters[key]) {
    //                 query[key] = new RegExp(filters[key], 'i'); // Handle other filters
    //             }
    //         }

    //         // Date range filtering
    //         if (startDateJoining || endDateJoining) {
    //             query.joining_date = {};
    //             if (startDateJoining) {
    //                 query.joining_date.$gte = new Date(new Date(startDateJoining).setHours(0, 0, 0, 0));
    //             }
    //             if (endDateJoining) {
    //                 query.joining_date.$lt = new Date(new Date(endDateJoining).setHours(23, 59, 59, 999));
    //             }
    //         }
    //         if (startDateActive || endDateActive) {
    //             query.Activation_date = {};
    //             if (startDateActive) {
    //                 query.Activation_date.$gte = new Date(new Date(startDateActive).setHours(0, 0, 0, 0));
    //             }
    //             if (endDateActive) {
    //                 query.Activation_date.$lt = new Date(new Date(endDateActive).setHours(23, 59, 59, 999));
    //             }
    //         }

    //         // If search term is provided, find matching users
    //         if (search) {
    //             const userSearchRegex = new RegExp(search, 'i');
    //             const matchingUsers = await UserData.find({
    //                 $or: [
    //                     { username: userSearchRegex },
    //                     { name: userSearchRegex }
    //                 ]
    //             }, 'uid');
    //             const matchingUserIds = matchingUsers.map(user => user.uid);

    //               if (role === 'admin' || role === "manager") {
    //                 // For admin, filter by matching user IDs
    //                 query.uid = { $in: matchingUserIds };
    //             } else {
    //                 // For regular users, ensure search only includes their own transactions
    //                 query.uid = {
    //                     $in: matchingUserIds,
    //                     $eq: uid
    //                 };
    //             }
    //         }

    //         // Pagination and sorting
    //         const users = await UserData.find(query)
    //             .sort({ uid: -1 })
    //             .skip((page - 1) * limit)
    //             .limit(parseInt(limit));

    //         // Wallet slugs
    //         const walletSlugs = [
    //             'self_investment',
    //             'main_wallet',
    //             'fund_wallet',
    //             'direct_income',
    //             'level_income',
    //             'roi_income',
    //             'salary_income',
    //             'royality_income',
    //             'total_withdrawal',
    //             'total_payout'
    //         ];

    //         // Function to fetch wallet values for a user
    //         const fetchWalletValues = async (uid) => {
    //             const walletValues = {};
    //             const userWallets = await UserWallet.findOne({ uid });

    //             walletSlugs.forEach(slug => {
    //                 const wallet = userWallets?.wallets.find(wallet => wallet.slug === slug);
    //                 walletValues[slug] = wallet ? wallet.value : 0;
    //             });

    //             return walletValues;
    //         };

    //         // Fetch wallet values and sponsor information for each user
    //         const usersWithDetails = await Promise.all(users.map(async user => {
    //             const walletValues = await fetchWalletValues(user.uid);
    //             const sponsor = await UserData.findOne({ uid: user.sponsor_Id }, 'username name');
    //             return {
    //                 ...user._doc,
    //                 ...walletValues,
    //                 sponsor_username: sponsor ? sponsor.username : null,
    //                 sponsor_name: sponsor ? sponsor.name : null
    //             };
    //         }));

            

    //         // Total count for pagination
    //         const totalCount = await UserData.countDocuments(query);

    //         res.status(200).json({
    //             success: true,
    //             data: usersWithDetails,
    //             totalRecords: totalCount,
    //             currentPage: parseInt(page),
    //             totalPages: Math.ceil(totalCount / limit),
    //             ...filters
    //         });
    //     } catch (error) {
    //         return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    async getUserData(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, userRole, startDateJoining, endDateJoining, startDateActive, endDateActive, ...filters } = req.query;

            const query = {};

            // Restrict to user's own transactions if not admin
            if (role !== 'admin' && role !== 'manager') {
                query.uid = uid;
            }

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
                query.Activation_date = {};
                if (startDateActive) {
                    query.Activation_date.$gte = new Date(new Date(startDateActive).setHours(0, 0, 0, 0));
                }
                if (endDateActive) {
                    query.Activation_date.$lt = new Date(new Date(endDateActive).setHours(23, 59, 59, 999));
                }
            }

            // If search term is provided, find matching users
            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find({
                    $or: [
                        { username: userSearchRegex },
                        { name: userSearchRegex },
                        { wallet_address: userSearchRegex}

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

            if (userRole) {
                query.roles = userRole; 
            }
            // Pagination and sorting
            const users = await UserData.find(query)
                .sort({ uid: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            // Wallet slugs
            const walletSlugs = [
                'self_investment',
                'main_wallet',
                'gaming_wallet',
                'working_wallet',
                'fund_wallet',
                'direct_income',
                'level_income',
                'roi_income',
                'salary_income',
                'royality_income',
                'total_withdrawal',
                'total_payout'
            ];

            // Function to fetch wallet values for a user
            const fetchWalletValues = async (uid) => {
                const walletValues = {};
                const userWallets = await UserWallet.findOne({ uid });

                walletSlugs.forEach(slug => {
                    const wallet = userWallets?.wallets.find(wallet => wallet.slug === slug);
                    walletValues[slug] = wallet ? wallet.value : 0;
                });

                return walletValues;
            };


            const usersWithDetails = await Promise.all(users.map(async user => {
                const walletValues = await fetchWalletValues(user.uid);
                const sponsor = await UserData.findOne({ uid: user.sponsor_Id }, 'username name');
            
                const { password, ...userWithoutPassword } = user._doc;
            
                return {
                    ...userWithoutPassword,
                    ...walletValues,
                    sponsor_username: sponsor ? sponsor.username : null,
                    sponsor_name: sponsor ? sponsor.name : null,
                    isPassword: !!password // true if password exists, false otherwise
                };
            }));
            
            

            

            // Total count for pagination
            const totalCount = await UserData.countDocuments(query);

            res.status(200).json({
                success: true,
                data: usersWithDetails,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                ...filters
            });
        } catch (error) {
            console.log("ksjdgf", error )
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async  user_block_unblock(req, res) {
        try {
           
            const { username, block_Status } = req.body;
            const { role } = req.user; 
    
            if (role !== 'admin') {
                return res.status(403).json({ success: false, message: "You don't have permission to block or unblock users." });
            }
    
            // Validate inputs
            if (!username || block_Status === undefined) {
                return res.status(400).json({ success: false, message: 'Username and blockStatus are required.' });
            }
    
            // Ensure block_Status is either 0 (unblock) or 1 (block)
            if (![0, 1].includes(block_Status)) {
                return res.status(400).json({ success: false, message: 'Invalid blockStatus. Use 1 to block and 0 to unblock.' });
            }
    
            // Fetch only the act_id field from activities
            const activities = await Activity.find({}, 'act_id');
            const disabledActivityIds = activities.map(activity => activity.act_id); // Extract act_ids
    
            // Prepare update fields
            const updateFields = {
                blockStatus: block_Status,
                disabled_activities: block_Status === 1 ? disabledActivityIds : [] // Add act_ids if blocking, clear if unblocking
            };
    
            // Find the user by username and update their block status and disabled activities
            const user = await UserData.findOneAndUpdate(
                { username: username },          // Search criteria
                { $set: updateFields },          // Update operation
                { new: true }                    // Return the updated document
            );
    
            // Check if the user was found and updated
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
    
            // Determine the action (block or unblock) based on block_Status
            const action = block_Status === 1 ? 'blocked' : 'unblocked';
    
            // Respond with success message and updated user data
            return res.status(200).json({
                success: true,
                message: `User has been ${action}.`,
                data: user
            });
        } catch (error) {
            // Log the error and send an internal server error response
            console.error('Error updating user block status:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error.' });
        }
    }

    async block_unblock_tree_activity(req, res) {
        try {
            const { uid, action, act_ids } = req.body;
            const { role } = req.user; 
    
            if (role !== 'admin') {
                return res.status(403).json({ success: false, message: "You don't have permission to block or unblock users." });
            }
    
            if (!uid || !action || !Array.isArray(act_ids)) {
                return res.status(400).json({ message: "Provide uid, action, act ids." });
            }
    
            if (!["enable", "disable"].includes(action)) {
                return res.status(400).json({ message: "Invalid action. Use 'enable' or 'disable'." });
            }
    
            const uids = await Team.getAllTeamUIDs(uid, 9999999);
            console.log("uids", uids)
            if (!uids || uids.length === 0) {
                return res.status(404).json({ message: "No team members found." });
            }

            uids.push(uid);

            // Find activity documents based on provided act_ids
        const activities = await Activity.find({ act_id: { $in: act_ids } });
        const validActivityIds = activities.map(act => act.act_id);

        if (validActivityIds.length === 0) {
            return res.status(404).json({ message: "No valid activities found with provided act_ids." });
        }

        let result;

        if (action === "disable") {
            result = await UserData.updateMany(
                {
                    uid: { $in: uids },
                    disabled_activities: { $nin: validActivityIds }
                },
                {
                    $addToSet: { disabled_activities: { $each: validActivityIds } },
                    $set: {
                        widthrawal_tree_block: 1,
                        widthrawal_tree_block_date: new Date()
                    }
                }
            );
        } else if (action === "enable") {
            result = await UserData.updateMany(
                {
                    uid: { $in: uids }
                },
                {
                    $pull: { disabled_activities: { $in: validActivityIds } },
                    $set: {
                        widthrawal_tree_block: 0,
                        widthrawal_tree_block_date: new Date()
                    }
                }
            );
        }

        return res.status(200).json({
            message: `Activities ${action === "disable" ? "blocked" : "unblocked"} for team successfully.`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Error while toggling users activities:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
}


    async get_blocked_widthrawal_users(req, res) {
        try {
            const { page = 1, limit = 10, name, username } = req.query;
    
            const query = {
                widthrawal_tree_block: 1
            };
    
            // Apply optional filters
            if (name) {
                query.name = { $regex: new RegExp(name, 'i') }; // case-insensitive search
            }
    
            if (username) {
                query.username = { $regex: new RegExp(username, 'i') }; // case-insensitive search
            }
    
            const skip = (parseInt(page) - 1) * parseInt(limit);
    
            // Fetch users with filters and pagination
            const users = await UserData.find(query)
                .select('widthrawal_tree_block widthrawal_tree_block_date username name uid')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ uid: -1 }); // Optional: sort by uid descending
    
            // Get total count for pagination metadata
            const totalCount = await UserData.countDocuments(query);
    
            return res.status(200).json({
                message: "success",
                data: users,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            });
    
        } catch (error) {
            console.error('Error while fetching blocked users:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error.' });
        }
    }
    
    
    
    async add_capping(req, res) {
        try {
            const { username, capping } = req.body;
            const { role } = req.user; 
    
            if (role !== 'admin') {
                return res.status(403).json({ success: false, message: "You don't have permission to block or unblock users." });
            }

            if (!username || capping === undefined || capping === null) {
                return res.status(400).json({ message: "Provide username and capping" });
            }
    
            const updatedUser = await UserData.findOneAndUpdate(
                { username },
                {
                    $set: {
                        capping_set_admin: capping,
                        capping_set_Date: new Date()
                    }
                },
                { new: true }
            );
    
            if (!updatedUser) {
                return res.status(400).json({ message: "User does not exist" });
            }
    
            return res.status(200).json({ success: true, message: "Capping updated successfully", data: updatedUser });
        } catch (error) {
            console.error('Error while adding capping:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error.' });
        }
    }

    async get_capping_users(req, res) {
        try {
          const { username, capping, startDate, endDate, page = 1, limit = 10 } = req.query;
      
          const projection = "username capping_set_Date capping_set_admin";
      
          const query = {
            capping_set_admin: { $nin: [null, "", 0] }
          };
      
          // Add username filter if provided
          if (username) {
            query.username = username;
          }
      
          // Add capping filter if provided
          if (capping) {
            query.capping_set_admin = capping;
          }
      
          // Add date range filter if provided
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1); // optional: include whole end day
      
            query.capping_set_Date = {
              $gte: start,
              $lt: end
            };
          }
      
          const skip = (parseInt(page) - 1) * parseInt(limit);
      
          const [users, total] = await Promise.all([
            UserData.find(query).select(projection).skip(skip).limit(parseInt(limit)),
            UserData.countDocuments(query)
          ]);
      
          return res.status(200).json({
            success: true,
            data: users,
            pagination: {
              total,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(total / limit)
            }
          });
        } catch (error) {
          console.error("Error in get_capping_users:", error);
          return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
      }


       async get_blocked_widthrawal_users(req, res) {
        try {
            const { page = 1, limit = 10, name, username } = req.query;
    
            const query = {
                widthrawal_tree_block: 1
            };
    
            // Apply optional filters
            if (name) {
                query.name = { $regex: new RegExp(name, 'i') }; // case-insensitive search
            }
    
            if (username) {
                query.username = { $regex: new RegExp(username, 'i') }; // case-insensitive search
            }
    
            const skip = (parseInt(page) - 1) * parseInt(limit);
    
            // Fetch users with filters and pagination
            const users = await UserData.find(query)
                .select('widthrawal_tree_block widthrawal_tree_block_date username name uid')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ uid: -1 }); // Optional: sort by uid descending
    
            // Get total count for pagination metadata
            const totalCount = await UserData.countDocuments(query);
    
            return res.status(200).json({
                message: "success",
                data: users,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            });
    
        } catch (error) {
            console.error('Error while fetching blocked users:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error.' });
        }
    }
      
      
     async updateUserRole(req, res) {
        try {
            const { username, password, roles } = req.body;
    
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
            }
    
            if (Array.isArray(roles)) {
                user.roles = roles;
            } else {
                return res.status(400).json({ message: "Roles must be an array." });
            }
    
            await user.save();
    
            return res.status(200).json({
                success: true,
                message: "User roles and password (if provided) updated successfully.",
                updatedRoles: user.roles
            });
    
        } catch (error) {
            console.error("Error updating user role:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
    }
    
    

}

const Users = new USER();
module.exports = Users;
