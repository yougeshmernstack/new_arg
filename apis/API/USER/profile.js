const advance_info = require("../../MODALS/advanceInfo");
const PlansInfo = require("../../MODALS/Plan");
const Ranks = require("../../MODALS/Ranks");
const UserData = require("../../MODALS/userData");
const UserPaymentOption = require("../../MODALS/UserPaymentOption");
const UserWallet = require("../../MODALS/userWallets");

const Email = require("../../SERVICES/SendEmail");
const sms = require("../../SERVICES/SmsService");
const Team = require("../../SERVICES/UpdateTeam");
const { INVALID_CREDENTIALS, PANCARD_ALREADY_EXISTS, INTERNAL_SERVER_ERROR, USERNAME_ALREADY_EXISTS, INVALID_USERNAME, SPONSOR_NOT_ACTIVE ,BLOCK_USER } = require("../../utils/errorMessages");
const form_validator = require("../../utils/form-validators");
const { errorLogger } = require("../../utils/logger");
const { registrationSuccess, loginSuccess, REQUEST_SUCCESS } = require("../../utils/successMessages");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
class PROFILE {
    async register(req, res, next) {
        try {
            const { name, email, mobile, password,  sponsor, username, country_code } = req.body;
            const { Registration } = await advance_info.findOne();
            const { is_mobile_required, is_email_required, is_password_required, is_sponsor_required, send_email } = Registration;
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
                roles: ['user'],
                password: hashedPassword,
                username: validUserNameResult.userName,
                uid: totalUsers + 1,

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

            // Set lastActivity on registration
            await UserData.updateOne({ uid: User.uid }, { $set: { lastActivity: new Date() } });

            res.status(200).json({ ...registrationSuccess, token, User });
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
    async login(req, res) {
        const { username, password } = req.body;
        try {
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            const payload = {
                uid: user.uid,
                username: user.username,
                role: 'user'
            };

            // Example secret key for signing the token
            const secretKey = process.env.JWT_KEY;
            const token = jwt.sign(payload, secretKey);
            
            // Update lastActivity on login
            await UserData.updateOne({ uid: user.uid }, { $set: { lastActivity: new Date() } });
            
            res.status(200).json({ ...loginSuccess, token, user });
        } catch (error) {
            errorLogger(error)
            console.error('Error during login:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // new api to login 
    // async login(req, res) {
    //     const { username, password } = req.body;
    //     console.log("username", username)
    //     console.log("password", password)
    //     try {
    //         // Find the user by username or mobile
    //         const user = await UserData.findOne({ $or: [{ username }, { mobile: username }] });
    //         console.log("User: ", user)

    //         if (!user) {
    //             return res.status(401).json({ ...INVALID_CREDENTIALS });
    //         }

    //         // Compare the provided password with the stored hash
    //         const passwordMatch = await bcrypt.compare(password, user.password);
    //         if (!passwordMatch) {
    //             return res.status(401).json({ ...INVALID_CREDENTIALS });
    //         }

    //         // Payload for the JWT token
    //         const payload = {
    //             uid: user.uid,
    //             username: user.username,
    //             role: 'user'
    //         };

    //         // Sign the JWT token with a secret key and set an expiration time
    //         const token = jwt.sign(payload, process.env.JWT_KEY);

    //         // Respond with the token and user data
    //         res.status(200).json({ ...loginSuccess, token, user });
    //     } catch (error) {
    //         // Log the error and respond with an internal server error status
    //         errorLogger(error);
    //         console.error('Error during login:', error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }
    

    async get_profile_by_username(req, res) {
        try {
            const { uid } = req.body;
            
            if (!uid) {
                res.status(200).json({ code: 20, message: "please enter Username" })
            }
            // console.log("1111111111111", uid);
            const userss= await UserData.findOne({ username:uid })

            if (!userss) {
                res.status(200).json({ code: 200, message: "please enter valid Username" })
            }
            const { username, name, email, mobile, status, joining_date, wallet_address, Activation_date, sponsor_Id } = userss




            const sponsorData = await UserData.findOne({ uid: sponsor_Id });
            const sponsor_username = sponsorData ? sponsorData.username : null;
            const sponsor_name = sponsorData ? sponsorData.name : null;

            const walletData = await UserWallet.findOne({ uid: userss.uid });
                    let directBusiness = 0;
                    let TeamBusiness = 0;

                    const selfInvestmentWallet = walletData?.wallets.find(wallet => wallet.slug === 'self_investment');
                    const selfInvestment = selfInvestmentWallet ? selfInvestmentWallet.value : 0;
    
    
                    if (walletData?.teamSection) {
                        directBusiness = walletData.teamSection
                            .filter(entry => entry.level === 1)
                            .reduce((sum, entry) => sum + (entry.business || 0), 0);
    
                            TeamBusiness = walletData.teamSection
                            .reduce((sum, entry) => sum + (entry.business || 0), 0);
                    }
                    const DirectTeam = await UserData.countDocuments({ sponsor_Id: userss.uid, status: 1 });
    
                    const Rankss = await Ranks.findOne({ uid: userss.uid }).sort({ createdAt: -1 });
                    const rank = Rankss ? Rankss.rankName : "No Rank";
            res.status(200).json({ rank,selfInvestment ,uid, username, wallet_address, name, email, mobile, status, sponsor_username, sponsor_name, joining_date, Activation_date,DirectTeam,directBusiness, TeamBusiness })
        } catch (error) {
            errorLogger(error)
            console.log(error)
            res.status(500).json({ INTERNAL_SERVER_ERROR })
        }
    }
    async get_profile(req, res) {
        try {
            const { uid } = req.user;
            // console.log("uid", uid);
            const { username, name, email, mobile, status, joining_date, wallet_address, Activation_date, sponsor_Id ,profile_edit_status,disabled_activities,enable_gaming_wallet,enable_gaming_wallet_Date} = await UserData.findOne({ uid })

            const sponsorData = await UserData.findOne({ uid: sponsor_Id });
            const sponsor_username = sponsorData ? sponsorData.username : null;
            const sponsor_name = sponsorData ? sponsorData.name : null;
            if (!username) {
                res.status(500).json({ INTERNAL_SERVER_ERROR })
            }

            const now = new Date();
                const result = new Date(now);

                // Get current day of the week (0 = Sunday, 5 = Friday)
                const currentDay = now.getDay();
                const daysUntilFriday = (5 - currentDay + 1) % 1 || 1; // ensure it's never 0

                // Set date to next Friday
                result.setDate(now.getDate() + daysUntilFriday);

                // Set time to 5:30 AM
                result.setHours(0, 0, 0, 0);

                const nextdistribution_date = result;
              
            res.status(200).json({enable_gaming_wallet,enable_gaming_wallet_Date,nextdistribution_date, uid,profile_edit_status, username, wallet_address, name, email, mobile, status, sponsor_username, sponsor_name, joining_date, Activation_date,disabled_activities })
        } catch (error) {
            errorLogger(error)
            console.log(error)
            res.status(500).json({ INTERNAL_SERVER_ERROR })
        }
    }
    async updatePassword(req, res) {
        try {
            const { uid } = req.user; // Assuming the user is authenticated and `req.user` is populated
            const { currentPassword, newPassword } = req.body;

            // Fetch the user from the database
            const user = await UserData.findOne({ uid });
            if (!user) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            // Validate the current password
            const passwordMatch = await bcrypt.compare(currentPassword, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }

            // Validate the new password
            const isStrongPassword = await form_validator.generatePassword(newPassword);
            if (!isStrongPassword.status) {
                return res.status(400).json({ isStrongPassword });
            }

            // Hash the new password
            const hashedNewPassword = await form_validator.hashPassword(isStrongPassword.password);

            // Update the password in the database
            user.password = hashedNewPassword;
            await user.save();

            res.status(200).json({ message: "Password updated successfully." });
        } catch (error) {
            errorLogger(error)
            console.error('Error during password update:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async updateProfile(req, res) {
        try {
            const { uid } = req.user; // Assumes the user is authenticated and `req.user` is populated
            const { name, email, mobile } = req.body;
    
            if (!name || !email || !mobile ) {
                return res.status(400).json({ message: "All fields (name, email, mobile, country_code) are required." });
            }

            const user = await UserData.findOne({ uid });
            if (!user) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
    
            // If profile_edit_status is 1, prevent further edits
            if (user.profile_edit_status === 1) {
                return res.status(403).json({ message: "Profile editing is locked." });
            }
    
            let updates = {};
    
            // Validate email
            if (email) {
                const isEmail = await form_validator.isEmail(email);
                if (!isEmail.status) {
                    return res.status(400).json({ isEmail });
                }
                updates.email = email;
            }
    
            // Validate mobile
            if (mobile) {
                const isMobile = await form_validator.isMobile(mobile);
                if (!isMobile.status) {
                    return res.status(400).json({ isMobile });
                }
                updates.mobile = mobile;
            }
    
            // Update name
            if (name) {
                updates.name = name;
            }
    
            // If no updates are needed, return success without saving
            if (Object.keys(updates).length === 0) {
                return res.status(200).json({ message: "No changes detected." });
            }
    
            // Set profile_edit_status to 1
            updates.profile_edit_status = 1;
    
            // Save the updated user
            await UserData.updateOne({ uid }, { $set: updates });
    
            res.status(200).json({ message: "Profile updated successfully.", updates });
        } catch (error) {
            errorLogger(error);
            console.error('Error during profile update:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    
    
    async registerWithDap(req, res, next) {
        try {
            console.log(req.body);
            const { sponsorUsername, userWalletAddress, username } = req.body;

            // Ensure the required fields are present
            if (!sponsorUsername || !userWalletAddress) {
                return res.status(400).json({ message: "Sponsor username and user wallet address are required." });
            }

            // Validate the sponsor wallet address
            const sponsorData = await UserData.findOne({ username: sponsorUsername });

            // Check if sponsor data is found
            if (!sponsorData) {
                return res.status(404).json({ message: "Sponsor not found." });
            }

            const validUserNameResult = await form_validator.generateUserName(username || 'demo');

            // Check if username already exists
            // const isUsernameExist = await UserData.findOne({ wallet_address: userWalletAddress });

            const isUsernameExist = await UserData.aggregate([
                {
                    $match: {
                        $expr: { $eq: [{ $toLower: "$wallet_address" }, userWalletAddress.toLowerCase()] }
                    }
                }
            ]);

            console.log("isUsernameExist", isUsernameExist)
            if (isUsernameExist && isUsernameExist?.length > 0) {
                // return res.status(USERNAME_ALREADY_EXISTS.code).json({ ...USERNAME_ALREADY_EXISTS });
                return res.status(400).json({ message: "The user already exists. Please log in." });
            }

            // Save user details
            const totalUsers = await UserData.countDocuments();
            const user = new UserData({
                username: validUserNameResult.userName,
                uid: totalUsers + 1,
                roles: ['user'],
                sponsor_Id: sponsorData.uid,
                wallet_address: userWalletAddress,
                joining_date: new Date()
            });
            const savedUser = await user.save();

            // Create a token for the user
            const payload = {
                uid: savedUser.uid,
                username: savedUser.username,
                role: 'user'
            };
            const secretKey = process.env.JWT_KEY;
            const token = jwt.sign(payload, secretKey);

            // Create a wallet for the user
            const wallet = new UserWallet({ uid: savedUser.uid });
            await wallet.save();
            let paymentOptions = await UserPaymentOption.findOne({ uid: savedUser.uid });

            if (!paymentOptions) {
                paymentOptions = new UserPaymentOption({ uid: savedUser.uid });
            }

            await wallet.save()
            paymentOptions.web3.push({
                chain: 56,
                address: savedUser.wallet_address,
                status: 1 // Set as default if no defaults exist
            });
            await paymentOptions.save();

            await Team.updateTeam(savedUser.uid);

            // Set lastActivity on registration
            await UserData.updateOne({ uid: savedUser.uid }, { $set: { lastActivity: new Date() } });

            // Respond with success
            return res.status(200).json({ ...registrationSuccess, token, user: savedUser });
        } catch (error) {
            console.error("Error in registerWithDap:", error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    // async loginWithDap(req, res) {
    //     const { username } = req.body;
    //     console.log("username", username);
    //     try {
    //         const user = await UserData.aggregate([
    //             {
    //                 $match: {
    //                     $expr: { $eq: [{ $toLower: "$wallet_address" }, username.toLowerCase()] }
    //                 }
    //             }
    //         ]);


    //         // console.log(user);
    //         if (!user) {
    //             return res.status(401).json({ ...INVALID_CREDENTIALS });
    //         }
    //         const payload = {
    //             uid: user.uid,
    //             username: user.username,
    //             role: 'user'
    //         };
    //         // Example secret key for signing the token
    //         const secretKey = process.env.JWT_KEY;
    //         const token = jwt.sign(payload, secretKey);

    //         res.status(200).json({ ...loginSuccess, token, user });
    //     } catch (error) {
    //         console.error('Error during login:', error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    async loginWithDap(req, res) {
        const { username } = req.body;
        console.log("username", username);
        try {

            // const user = await UserData.findOne({ wallet_address: username });
            const user = await UserData.aggregate([
                {
                    $match: {
                        $expr: { $eq: [{ $toLower: "$wallet_address" }, username.toLowerCase()] }
                    }
                }
            ]);

            // const users = await UserData.find();
            // const user = users.find(u => u.wallet_address.toLowerCase() === username.toLowerCase());



            console.log("userrr", user[0]);
            if (!user[0]) {
                return res.status(401).json({ ...INVALID_CREDENTIALS });
            }
            if (user[0].blockStatus == 1) {
                return res.status(403).json({ ...BLOCK_USER });
            }
            const payload = {
                uid: user[0].uid,
                username: user[0].username,
                role: 'user'
            };

            const secretKey = process.env.JWT_KEY;
            const token = jwt.sign(payload, secretKey);

            // Update lastActivity on login
            await UserData.updateOne({ uid: user[0].uid }, { $set: { lastActivity: new Date() } });

            res.status(200).json({ ...loginSuccess, token, user });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async check_username(req, res) {
        try {
            const { username } = req.body;
            // console.log("username", username)
            const userData = await UserData.findOne({ username });
            if (!userData) {
                return res.status(400).json({ message: "user not exist" })
            }
            const name = userData?.name;
            // console.log("name",name)
            // if (name != null) {
            return res.status(200).json({ status: 200, name });
            // } else {
            //    return res.status(400).json({...INVALID_USERNAME});
            // }
        } catch (error) {
            errorLogger(error)
            console.log("error", error)
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async forgotPassword(req, res) {
        try {
            const { username, newPassword } = req.body;
            const user = await UserData.findOne({ username });
            const hash = await form_validator.hashPassword(newPassword);
            user.password = hash;
            user.save();
            res.status(200).json({ ...REQUEST_SUCCESS })
        } catch (error) {
            errorLogger(error)
            res.status(500).json({ ...INTERNAL_SERVER_ERROR })
        }
    }
}
const profile = new PROFILE();
module.exports = profile;