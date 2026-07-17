const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../MODALS/Admin');
const { loginSuccess, registrationSuccess, REQUEST_SUCCESS } = require('../../utils/successMessages');
const { INTERNAL_SERVER_ERROR, INVALID_CREDENTIALS, FORBIDDEN, INVALID_USERNAME } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const UserData = require('../../MODALS/userData');
const planSettings = require('../../SERVICES/planService');
const PlansInfo = require('../../MODALS/Plan');
const Order  = require('../../MODALS/Orders')
const Transaction  = require('../../MODALS/transactions');
const { Power } = require('../../MODALS/Power')
const crypto = require("crypto"); 
const Orders = require('../../MODALS/Orders');
const Team = require('../../SERVICES/UpdateTeam');
const LevelIncome = require('../../SERVICES/LevelIncome');
const form_validator = require('../../utils/form-validators');



class ADMIN {
    // async login(req, res) {
    //     const { username, password } = req.body;
    //     // console.log(req.body)
    //     try {
    //         const admin = await UserData.findOne({ username });
    //         // console.log(admin)
    //         if (!admin || !(admin.roles && admin.roles.includes('admin'))) {


    //             return res.status(401).json({ ...INVALID_CREDENTIALS });
    //         }

    //         const isMatch = await bcrypt.compare(password, admin.password);
    //         if (!isMatch) {
    //             // console.log('here', "==========", isMatch)
    //             return res.status(401).json({ ...INVALID_CREDENTIALS });
    //         }

    //         const payload = {
    //             uid: admin.uid,
    //             username: admin.username,
    //             role: 'admin'
    //         };

    //         // Example secret key for signing the token
    //         const secretKey = process.env.JWT_KEY;
    //         const token = jwt.sign(payload, secretKey);
    //         res.status(200).json({ ...loginSuccess, token, admin });
    //     } catch (error) {
    //         errorLogger(error)
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }
    
    async login(req, res) {
        const { username, password } = req.body;
    
        try {
            const admin = await UserData.findOne({ username });
            console.log(admin);
    
            if (
                !admin ||
                !admin.roles ||
                !(admin.roles.includes('admin') || admin.roles.includes('manager'))
            ) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
    
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                console.log('here', "==========", isMatch);
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
    
            // Dynamically determine the highest role
            let role = null;
            if (admin.roles.includes('admin')) {
                role = 'admin';
            } else if (admin.roles.includes('manager')) {
                role = 'manager';
            }
            console.log("--------------------------------------", role);
            const payload = {
                uid: admin.uid,
                username: admin.username,
                role // will be either 'admin' or 'manager'
            };
    
            const secretKey = process.env.JWT_KEY;
            const token = jwt.sign(payload, secretKey);
            
            // Update lastActivity on admin login
            await UserData.updateOne({ uid: admin.uid }, { $set: { lastActivity: new Date() } });
            
            res.status(200).json({ ...loginSuccess, token, admin });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    
    async createAdmin(req, res) {
        const { username, password } = req.body;
        try {
            // Check if admin with the same username already exists
            const existingAdmin = await Admin.findOne({ username });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Admin with this username already exists' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new admin
            const newAdmin = new Admin({ username, password: hashedPassword, uid: 1 });
            await newAdmin.save();

            res.status(201).json({ ...registrationSuccess, admin: newAdmin });
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async loginUser(req, res) {
        try {
            const { role } = req.user;
            const { username } = req.body;
            if (role !== 'admin') {
                res.status(400).json({ ...FORBIDDEN });
            }
            const User = await UserData.findOne({ username });
            if (!User) {
                res.status(400).json({ ...INVALID_USERNAME });
            }
            const payload = {
                uid: User.uid,
                username: User.username,
                role: 'user'
            };

            // Example secret key for signing the token
            const secretKey = process.env.JWT_KEY;
            const token = await jwt.sign(payload, secretKey);
            
            // Update lastActivity on admin login as user
            await UserData.updateOne({ uid: User.uid }, { $set: { lastActivity: new Date() } });
            
            return res.status(200).json({ token });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async getPlanById(req, res) {
        const { planId } = req.body;

        try {
            const plan = await planSettings.getPlanById(planId);
            return res.status(200).json(plan);
        } catch (error) {
            console.error(error);
            return res.status(404).json({ message: error.message });
        }
    }

    // Controller method to update a plan by its ID
    async updatePlan(req, res) {
        const { planId } = req.params;
        const updatedFields = req.body;
        // console.log("Request body : ", req.body);
        try {
            const updatedPlan = await planSettings.updatePlan(planId, updatedFields);
            return res.status(200).json({ message: 'Plan updated successfully', updatedPlan });
        } catch (error) {
            console.error(error);
            return res.status(404).json({ message: error.message });
        }
    }

    async order(req, res) {
        try {
            const { username, deposit, withdrawal } = req.body;
    
            // Validate input
            if (!username || !deposit || !withdrawal) {
                return res.status(400).json({ message: "All fields are required" });
            }
    
            // Find user and get uid
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(404).json({ message: "Username not found" });
            }
    
            const uid = user.uid;
    
            const myOrder = await Orders.findOne({  uid, status: { $in: [1, 2] } });
        
            let type = myOrder ? 'Re-purchase' : 'Purchase';
            const newOrder = await Order.create({
                uid,
                amount: deposit,
                source:"from_admin",
                type,
                order_bv: deposit,
                status: 1
            });
    
           // Calculate transaction charges without rounding
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

            let transaction;
            try {
                // Create transaction record
                transaction = await Transaction.create({
                    uid,
                    amount: withdrawal,
                    tx_charge,
                    Re_purchase_wallet,
                    debit_credit: "debit",
                    wallet_type: "main_wallet",
                    tx_type: "withdrawal",
                    to_from: "1",
                    status: 1,
                    source: "withdrawal",
                    tx_hash,
                    remark:"from_admin",
                    order_Id: order
                });
                
            } catch (error) {
                await Order.deleteOne({ order_Id:order });
                return res.status(500).json({ message: "Transaction failed, order has been deleted." });
                
            }

            if (type == 'Purchase') {
                const updateStatus = await UserData.findOneAndUpdate(
                    { uid },
                    { $set: { status: 1, Activation_date: new Date() } },
                    { new: true }
                );
                
                // Check if this activation gives sponsor 2 referrals, then distribute level income
                if (updateStatus && updateStatus.sponsor_Id) {
                    await LevelIncome.distributeLevelIncomeOnReferralCompletion(
                        updateStatus.sponsor_Id,
                        uid,
                        newOrder.planId || 1,
                        newOrder.amount,
                        newOrder.order_Id
                    );
                }
            }
            
            await Team.updateBusiness(newOrder.uid, newOrder.amount, newOrder.type)

            return res.status(200).json({
                message: "Order and transaction recorded successfully",
                newOrder,
                transaction,
            });
    
        } catch (error) {
            console.error("Error processing order:", error);
            return res.status(500).json({ message: "Transaction failed. Order not saved." });
        }
    }

    async givePower(req, res) {
        try {
            const { from_username, to_username, power } = req.body;
    
            // Validate input
            if (!from_username || !to_username || !power) {
                return res.status(400).json({ message: "All fields are required" });
            }
    
            // Fetch user data to get sponsorId
            const fromUser = await UserData.findOne({ username: from_username });
            if (!fromUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const toUser = await UserData.findOne({ username: to_username });
            if (!toUser) {
                return res.status(404).json({ message: "to username not found" });
            }

           
            let uid = fromUser.uid;
            let sponsorId = fromUser.sponsor_Id;
            let username = fromUser.username;

            if (uid < toUser.uid) {
                return res.status(400).json({ message: "from_username UID must be greater than to_username UID" });
            }


            await Power.create({ uid, power, username });
    
            // Traverse through the sponsor chain
            while (sponsorId) {
                const sponsorUser = await UserData.findOne({ uid: sponsorId });
    
                if (!sponsorUser) break; 
    
                if (sponsorUser.username === to_username) {
                    await Power.create({ uid: sponsorUser.uid, power, username: sponsorUser.username });
                    break;
                }
    
                // Store power for intermediate sponsors
                await Power.create({ uid: sponsorUser.uid, power, username: sponsorUser.username });
    
                // Move to the next sponsor in the chain
                sponsorId = sponsorUser.sponsor_Id;
            }
    
            return res.status(200).json({ message: "Power stored successfully" });
    
        } catch (error) {
            console.error("Error in givePower function:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    
    async getAllPower(req, res) {
        try {
            let { page = 1, limit = 10, username, startDate, endDate } = req.query;
    
            // Convert page and limit to integers
            page = parseInt(page) || 1;
            limit = parseInt(limit) || 10;
    
            let query = {};
    
            // Filter by username (case-insensitive search)
            if (username) {
                query['username'] = new RegExp(username, 'i');
            }
    
            // Filter by date range (Ensure valid date format)
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
    
                if (!isNaN(start) && !isNaN(end)) {
                    // Set end date to include the full day
                    end.setHours(23, 59, 59, 999);
                    query['createdAt'] = { 
                        $gte: start, 
                        $lte: end 
                    };
                } else {
                    return res.status(400).json({ message: "Invalid date format" });
                }
            }
    
            // Get total count for pagination
            const totalRecords = await Power.countDocuments(query);
    
            // Fetch paginated data
            const power = await Power.find(query)
                .skip((page - 1) * limit) 
                .limit(limit) 
                .sort({ createdAt: -1 });
    
            // if (power.length === 0) {
            //     return res.status(404).json({ message: "Data not found in the database", data: [] });
            // }
    
            return res.status(200).json({
                message: "Successfully fetched",
                data: power,
                pagination: {
                    totalRecords,
                    totalPages: Math.ceil(totalRecords / limit),
                    currentPage: page,
                    limit: limit
                }
            });
    
        } catch (error) {
            console.error("Error fetching power data:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    async updatePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;

        console.log("rsjlkj",req.body )

        if (req.user?.uid !== 1) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!oldPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Invalid password input' });
        }
         console.log("ksjdfk", req.user)
        // Fetch user with uid: 1
        if(req.user.uid !== 1){
            return res.status(403).json({ success: false, message: 'Acceses Denied' });
        }
        const user = await UserData.findOne({ uid: 1 });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Compare old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Old password is incorrect' });
        }

        // Hash and update the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserData.updateOne({ uid: 1 }, { $set: { password: hashedPassword } });

        res.status(200).json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

    async forgotPassword(req, res) {
        try {
            const { username, newPassword } = req.body;
            
            // Find admin user by username
            const admin = await UserData.findOne({ username });
            
            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }

            // Verify that the user has admin or manager role
            if (!admin.roles || !(admin.roles.includes('admin') || admin.roles.includes('manager'))) {
                return res.status(403).json({ message: 'Access denied. This account is not an admin account.' });
            }

            // Validate the new password
            const isStrongPassword = await form_validator.generatePassword(newPassword);
            if (!isStrongPassword.status) {
                return res.status(400).json({ ...isStrongPassword });
            }

            // Hash the new password
            const hashedPassword = await form_validator.hashPassword(isStrongPassword.password);

            // Update the password in the database
            await UserData.updateOne({ uid: admin.uid }, { $set: { password: hashedPassword } });

            res.status(200).json({ ...REQUEST_SUCCESS });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    
    
    
}
const AdminController = new ADMIN();
module.exports = AdminController;
