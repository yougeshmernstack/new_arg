const bcrypt = require('bcryptjs');
const UserData = require("../../MODALS/userData"); 
const AdminData = require("../../MODALS/AdminData");
const form_validator = require('../../utils/form-validators');
const { errorLogger } = require('../../utils/logger');
const { NOT_FOUND, INTERNAL_SERVER_ERROR, INVALID_INPUT } = require('../../utils/errorMessages');
const { updated_successfully } = require('../../utils/successMessages');
const UserPaymentOption = require('../../MODALS/UserPaymentOption');


class UPDATE {

  


    // async adminUpdateUserProfile(req, res) {
    //     try {
    //         const { uid } = req.query;
    //         const { wallet_address, name, email, mobile } = req.body;
    
    //         // Validate required fields
    //         if (!uid) {
    //             return res.status(400).json({ ...INVALID_INPUT });
    //         }
    
    //         let updates = {};
    //         if (wallet_address) {
                
    //             updates.wallet_address = wallet_address;

    //             let updateUserPaymentOptions = await UserPaymentOption.findOneAndUpdate(
    //                 { uid }, 
    //                 { 
    //                     $push: { 
    //                         web3: {
    //                             address: wallet_address,
    //                         }
    //                     } 
    //                 }, 
    //                 { new: true }
    //             ); }
    //         if (email) {
    //             const isEmail = await form_validator.isEmail(email);
    //             if (!isEmail.status) {
    //                 return res.status(400).json({ isEmail });
    //             }
    //             updates.email = email;
    //         }
    
    //         // Validate mobile
    //         if (mobile) {
    //             const isMobile = await form_validator.isMobile(mobile);
    //             if (!isMobile.status) {
    //                 return res.status(400).json({ isMobile });
    //             }
    //             updates.mobile = mobile;
    //         }
    
    //         // Update name
    //         if (name) {
    //             updates.name = name;
    //         }
    
    //         // Update the user and return updated document
    //         const user = await UserData.findOneAndUpdate({ uid }, { $set: updates }, { new: true });
    
    //         if (!user) {
    //             return res.status(404).json({ ...NOT_FOUND });
    //         }
    
    //         res.status(200).json({ ...updated_successfully, user });
    
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }
    
    async adminUpdateUserProfile(req, res) {
        try {
            const { uid } = req.query;
            const { wallet_address, name, email, mobile, pancard,capping } = req.body;
    
            // Validate required fields
            if (!uid) {
                return res.status(400).json({ ...INVALID_INPUT });
            }
    
            let updates = {};
            
            // Handle wallet address update
            if (wallet_address) {
                 // Check if this wallet_address is already associated with another user
                const existingWalletUser = await UserPaymentOption.findOne({
                    "web3.0.address": wallet_address,
                    uid: { $ne: uid } // Exclude the current user from the check
                });

                if (existingWalletUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'This wallet address is already associated with another user.'
                    });
                }
                updates.wallet_address = wallet_address;
    
                // Check if the user payment option exists
                const userPaymentOption = await UserPaymentOption.findOne({ uid });
                
                if (userPaymentOption) {
                    if (userPaymentOption.web3 && userPaymentOption.web3.length > 0) {
                        // Update the address at index 0
                        await UserPaymentOption.findOneAndUpdate(
                            { uid }, 
                            { $set: { "web3.0.address": wallet_address } },
                            { new: true }
                        );
                    } 
                }
            }
            
            // Rest of the function remains the same
            if (capping) {
                updates.capping = capping;
            }

            // Rest of the function remains the same
            if (email) {
                const isEmail = await form_validator.isEmail(email);
                if (!isEmail.status) {
                    return res.status(400).json({ isEmail });
                }
                updates.email = email;
            }
    
            if (mobile) {
                const isMobile = await form_validator.isMobile(mobile);
                if (!isMobile.status) {
                    return res.status(400).json({ isMobile });
                }
                updates.mobile = mobile;
            }
    
            if (name) {
                updates.name = name;
            }

            if (pancard) {
                updates.pancard = pancard;
            }
    
            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No valid fields provided for update' 
                });
            }
    
            const user = await UserData.findOneAndUpdate({ uid }, { $set: updates }, { new: true });
    
            if (!user) {
                return res.status(404).json({ ...NOT_FOUND });
            }
    
            res.status(200).json({ ...updated_successfully, user });
    
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async adminUpdateUserPassword(req, res) {
        try {
            const { uid } = req.user;
            const { passwordData } = req.body;
    
            //  console.log("adminPassword",passwordData.adminPassword);
            //  console.log("NewPassword",passwordData.NewPassword);
            // Validate required fields
            if (!uid && !passwordData.adminPassword && !passwordData.NewPassword && !passwordData.username) {
                return res.status(400).json({ message: 'Invalid input. All fields are required.' });
            }
    
            // Find admin user by UID from admin_data
            const admin = await AdminData.findOne({ uid });
            if (!admin || !(admin.roles && admin.roles.includes('admin'))) {
                return res.status(401).json({message: 'admin  not found.'});
            }
    
            // Verify admin password
            const isMatch = await bcrypt.compare(passwordData.adminPassword, admin.password);
            if (!isMatch) {
                return res.status(401).json({message: 'admin password does not matched.'});
            }
    
            // Find the user by username 
            const hashedPassword = await bcrypt.hash(passwordData.NewPassword, 10);
            
            const user = await UserData.findOne({username:passwordData.username});
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
        // Update user's password
        user.password = hashedPassword;
        await user.save();
            res.status(200).json({ message: 'User password updated successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    }



}

const update = new UPDATE();
module.exports = update;

