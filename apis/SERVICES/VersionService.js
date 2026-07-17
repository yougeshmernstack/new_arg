const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const Version = require("../MODALS/Version");
const semver = require('semver'); // Import semver
const TeamService = require("./UpdateTeam");
const transaction = require("./Transaction");

class VERSION_CONTROLLER {
    constructor() {
        this.applyVersionUpdates = this.applyVersionUpdates.bind(this);
        this.checkUserVersion = this.checkUserVersion.bind(this);
        this.correctWalletValues = this.correctWalletValues.bind(this);
        this.createVersion = this.createVersion.bind(this);
        this.getCurrentVersion = this.getCurrentVersion.bind(this);
      }
    // Method to create a new version (Admin)
    async createVersion(req, res) {
        const { version, description } = req.body;

        try {
            const newVersion = new Version({ version, description });
            await newVersion.save();

            // Fetch all users who have an older version
            const usersToUpdate = await UserData.find();
            // console.log("Total Users Found:", usersToUpdate.length);
// console.log("Inactive Users:", usersToUpdate.filter(u => u.status === 0).length);

            // Use for..of instead of forEach to handle async operations correctly
            for (const user of usersToUpdate) {
                if (semver.lt(user.version, version)) {
                    await this.applyVersionUpdates(user, version); // Apply updates for older users
                }
            }

            res.status(201).json({ message: "Version created and updates applied." });
        } catch (error) {
            console.error("Error creating version:", error);
            res.status(500).json({ error: "Failed to create version." });
        }
    }

    // Method to get the current app version
    async getCurrentVersion(req, res) {
        try {
            const currentVersion = await Version.findOne().sort({ releaseDate: -1 }).exec();
            res.status(200).json({ version: currentVersion });
        } catch (error) {
            console.error("Error fetching current version:", error);
            res.status(500).json({ error: "Failed to fetch current version." });
        }
    }

    // Method to check and update user data if their app version is outdated
    async checkUserVersion(req, res, next) {
        try {
            const {uid} = req.user;  // Assuming userId is available in req
            const user = await UserData.findOne({uid});

            const currentVersion = await Version.findOne().sort({ releaseDate: -1 }).exec();

            // Use semver to compare user version with current version
            if (semver.lt(user.version, currentVersion.version)) {
                // console.log(`User ${user.uid} is outdated. Updating from version ${user.version} to ${currentVersion.version}`);
                await this.applyVersionUpdates(user, currentVersion.version); // Apply updates
            }

            next();  // Proceed to the next middleware or controller
        } catch (error) {
            console.error("Error checking user version:", error);
            res.status(500).json({ error: "Failed to check user version." });
        }
    }

    // Method to apply updates for users with older versions
    async applyVersionUpdates(user, newVersion) {
        try {
            // console.log(`Applying updates for UID: ${user.uid}, Status: ${user.status}`);
            // Check if the user's current version is less than the new version
            if (semver.lt(user.version, newVersion)) {
                // Example: Update teamSection wallets for version 2.0.0
                await this.correctWalletValues(user.uid);
                // await this.updateWallets(user.uid);
            }

            // Update the user's version to the new version
            user.version = newVersion;
            await user.save();
        } catch (error) {
            console.error("Error applying version updates:", error);
            throw error;
        }
    }

    // Utility function to correct wallet values based on version changes
    async correctWalletValues(uid) {
        try {
            const liveTeam = await TeamService.TeamBusinessByLevel_with_activation_date(uid);  // Assuming TeamBusinessByLevel returns correct data
            await UserWallet.findOneAndUpdate(
                { uid },
                { $set: { teamSection: liveTeam.teamSection } }
            );
        } catch (error) {
            console.error("Error correcting wallet values:", error);
            throw error;
        }
    };

    async updateWallets(uid) {
        try {
            // Input validation
            if (!uid) {
                throw new Error('User ID is required');
            }
    
            // Fetch debit and credit values for the user
            const { debitCreditByWalletType, debitCreditBySource } = await transaction.calculateDebitCreditValues(uid);
    
            // Find the user's wallet
            const userWallet = await UserWallet.findOne({ uid });
    
            if (!userWallet) {
                console.error(`User wallet not found for uid: ${uid}`);
                return null;
            }
    
            // Flag to track if wallet needs saving
            let walletNeedsSave = false;
    
            // Mapping of transaction sources to wallet slugs
            const sourceWalletMapping = {
                'roi_income': 'roi_income',
                'roi_level_income': 'roi_level_income',
                'withdrawal': 'total_withdrawal'
            };
    
            // Helper function to update wallet value
            const updateWalletValue = (source, value) => {
                // Get the corresponding wallet slug
                const walletSlug = sourceWalletMapping[source];
                
                if (!walletSlug) {
                    console.warn(`No wallet mapping found for source: ${source}`);
                    return;
                }
    
                // Find the corresponding wallet entry
                const userWalletEntry = userWallet.wallets.find(w => w.slug === walletSlug);
                
                if (userWalletEntry) {
                    // Special handling for withdrawal (negative value)
                    const newValue = source === 'withdrawal' ? Math.abs(value) : value;
                    
                    if (userWalletEntry.value !== newValue) {
                        console.log(`Updating wallet ${walletSlug}:`, {
                            oldValue: userWalletEntry.value,
                            newValue: newValue,
                            source: source
                        });
    
                        userWalletEntry.value = newValue;
                        userWalletEntry.updated_on = new Date();
                        walletNeedsSave = true;
                    }
                }
            };
    
            // Update source wallets based on transaction sources
            debitCreditBySource.forEach(source => {
                // Use totalCredit for income, totalDebit for withdrawal
                const valueToUpdate = source.source === 'withdrawal' 
                    ? source.totalDebit 
                    : source.totalCredit;
                
                updateWalletValue(source.source, valueToUpdate);
            });
    
            // Save the updated wallet only if changes were made
            if (walletNeedsSave) {
                await userWallet.save();
                console.log(`Wallet values updated for user uid: ${uid}`);
            }
    
            return {
                success: true,
                message: `Wallet values processed for user uid: ${uid}`,
                sources: debitCreditBySource
            };
    
        } catch (error) {
            console.error("Error updating wallets:", error);
            
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }
          
    async  updateAllUserWallets() {
        try {
            // Fetch all user UIDs from the UserWallet collection
            const allUsers = await UserWallet.find({}, { uid: 1 }); // Fetch only the UID field
    
            if (!allUsers.length) {
                console.log("No users found to update wallets.");
                return { success: false, message: "No users found" };
            }
    
            console.log(`Updating wallets for ${allUsers.length} users...`);
    
            // Loop through each user and update their wallet
            for (const user of allUsers) {
                await this.updateWallets(user.uid); // Call the function for each user
            }
    
            console.log("All user wallets updated successfully.");
            return { success: true, message: "All user wallets updated successfully." };
    
        } catch (error) {
            console.error("Error updating all user wallets:", error);
            return { success: false, message: error.message };
        }
    }
           
         
         

}
const versionService = new VERSION_CONTROLLER();
// versionService.updateAllUserWallets()
module.exports = versionService;
