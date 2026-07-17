const Activity = require("../MODALS/Activity");
const Orders = require("../MODALS/Orders");
const PlansInfo = require("../MODALS/Plan");
const Transaction = require("../MODALS/transactions");
const UserData = require("../MODALS/userData");
const { INTERNAL_SERVER_ERROR, INVALID_AMOUNT, PACKAGE_NAME_REQUIRED } = require("./errorMessages");
const { errorLogger, logger } = require("./logger");

class ORDER_VALIDATOR {

    // async validatePackage(req, res, next) {
    // try {
    //     const { uid } = req.user;
    //     const { amount, planId } = req.body;

    //     const user = await UserData.findOne({ uid });
    //     const activity = await Activity.findOne({ name:"topup" });

    //     const isDisallowed = user.disabled_activities.includes(activity.act_id);
    //     if (isDisallowed) {
    //         return res.status(400).json({ message:"You are not eligible for Activation." });
    //     }

    //     if (amount <= 0) {
    //         return res.status(400).json({...INVALID_AMOUNT});
    //     }

    //     let plan = await PlansInfo.findOne();
    //     const packageCount = await PlansInfo.countDocuments();
    //     if (packageCount > 1) {
    //         if (!planId) {
    //             return res.status(400).json({ ...PACKAGE_NAME_REQUIRED });
    //         } else {
    //             const isPack = await PlansInfo.findOne({ planId });
    //             if (isPack) {
    //                 plan = isPack;
    //             } else {
    //                 return res.status(400).json({ ...WRONG_PACKAGE_SELECTED });
    //             }
    //         }
    //     }

    //     // Get all plans to determine highest package across all
    //     const allPlans = await PlansInfo.find({});
    //     if (allPlans.length === 0) {
    //         return res.status(400).json({
    //             code: 400,
    //             message: 'No packages available for purchase.'
    //         });
    //     }

    //     // Pick the user-selected package from this plan by amount range
    //     const selectedPackage = plan.packages?.find(p => amount >= p.min_amount && amount <= p.max_amount);
    //     if (!selectedPackage) {
    //         return res.status(400).json({
    //             code: 400,
    //             message: 'Amount does not match any package range.'
    //         });
    //     }

    //     // Determine the global highest package by max_amount across all plans
    //     const highestMaxAmount = allPlans.reduce((maxVal, p) => {
    //         const planMax = (p.packages || []).reduce((m, pkg) => Math.max(m, pkg.max_amount || 0), 0);
    //         return Math.max(maxVal, planMax);
    //     }, 0);
    //     const isHighestPackage = (selectedPackage.max_amount || 0) === highestMaxAmount;

    //     // Get user's purchase history
    //     const userOrders = await Orders.find({ uid, status: 1 })
    //         .sort({ added_on: -1 });

    //     // Rule 1: Check if user can't purchase lower packages
    //     if (userOrders.length > 0) {
    //         const highestPurchasedAmount = Math.max(...userOrders.map(order => order.amount));
    //         if (amount < highestPurchasedAmount) {
    //             return res.status(400).json({
    //                 code: 400,
    //                 message: `You cannot purchase a lower package. Your highest purchase was ${highestPurchasedAmount}.`
    //             });
    //         }
    //     }

    //     // Rule 2: Check maximum 2 purchases per package (except highest package)
    //     if (!isHighestPackage) {
    //         const samePackageOrders = userOrders.filter(order => order.planId === plan.planId);
    //         if (samePackageOrders.length >= 2) {
    //             return res.status(400).json({
    //                 code: 400,
    //                 message: `You can only purchase this package maximum 2 times. You have already purchased it ${samePackageOrders.length} times.`
    //             });
    //         }
    //     }

    //     // Rule 3: For highest package, unlimited purchases allowed (no additional validation needed)
    //     console.log("selectedPackage",selectedPackage);
    //     if (selectedPackage.min_amount <= amount && selectedPackage.max_amount >= amount) {
    //         if (amount % selectedPackage.multiplier === 0) {
    //             req.plan = plan;
    //             req.selectedPackage = selectedPackage;
    //             next();
    //         } else {
    //             return res.status(400).json({ code: 400, message: `Amount should be a multiple of ${selectedPackage.multiplier}.` });
    //         }
    //     } else {
    //         return res.status(400).json({ code: 400, message: `Amount should be between ${selectedPackage.min_amount} to ${selectedPackage.max_amount}.` });
    //     }

    // } catch (error) {
    //     errorLogger(error);
    //     return res.status(500).json({...INTERNAL_SERVER_ERROR});
    // }
    // }

    // old
    // async validatePackage(req, res, next) {
    //     try {
    //         // const { uid } = req.user;
    //         const { amount,planId,username } = req.body;
    //         console.log("plance order with dap",req.body)
    //         if(!username){
    //             return res.status(400).json({ message: 'Username required'})
    //         }
    //         const user = await UserData.findOne({ username });
    //          if(!user){
    //             return res.status(400).json({ message: 'Username required'})
    //         }
    //         const activity = await Activity.findOne({ name:"topup" });

    //         const isDisallowed = user.disabled_activities.includes(activity.act_id);
    //             if (isDisallowed) {
    //             return res.status(400).json({ message:"You are not eligible for Activation." });
    //         }

    //         if (amount<=0) {
    //             return res.status(400).json({...INVALID_AMOUNT})
    //         }
    //         let plan = await PlansInfo.findOne();
    //         const packageCount = await PlansInfo.countDocuments();
    //         if (packageCount > 1) {
    //             if (!planId) {
    //                 return res.status(400).json({ ...PACKAGE_NAME_REQUIRED })
    //             } else {
    //                 const isPack = await PlansInfo.findOne({ planId });
    //                 if (isPack) {
    //                     plan = isPack;
    //                 } else {
    //                     return res.status(400).json({ ...WRONG_PACKAGE_SELECTED })
    //                 }
    //             }
    //         }
    //         // Prefer packageId if provided
    //         const { packageId } = req.body;
    //         let selectedPackage = null;
    //         if (packageId !== undefined && packageId !== null) {
    //             // Find plan containing this packageId
    //             const planByPackage = await PlansInfo.findOne({ 'packages.packageId': Number(packageId) }) || plan;
    //             if (planByPackage) {
    //                 plan = planByPackage;
    //                 selectedPackage = Array.isArray(plan.packages) ? plan.packages.find(p => Number(p.packageId) === Number(packageId)) : null;
    //             }
    //         }

    //         // Fallback: Find matching package by amount range
    //         if (!selectedPackage) {
    //             selectedPackage = Array.isArray(plan.packages) ? plan.packages.find(p => p.min_amount <= amount && p.max_amount >= amount) : null;
    //         }
    //         if (selectedPackage) {
    //             if (amount % selectedPackage.multiplier == 0) {
    //                 req.plan = plan;
    //                 req.selectedPackage = selectedPackage;
    //                 next();
    //             } else {
    //                 res.status(400).json({ code: 400, message: `Amount should be a multiple of ${selectedPackage.multiplier}.` })
    //             }
    //         } else {
    //             // Build a human-readable list of ranges if available
    //             const ranges = (plan.packages || []).map(p => `${p.min_amount} to ${p.max_amount}`).join(', ');
    //             res.status(400).json({ code: 400, message: ranges ? `Amount should fall within one of the package ranges: ${ranges}.` : 'No packages configured for this plan.' })
    //         }
    //     } catch (error) {
    //         errorLogger(error);
    //         res.status(500).json({...INTERNAL_SERVER_ERROR});
    //     }
    // }

    // new
    async validatePackage(req, res, next) {
        try {
            const { username, planId } = req.body;
            let { amount } = req.body;

            console.log("🔍 Plan order request:", req.body);

            if (!username) {
            return res.status(400).json({ message: "Username required" });
            }

            // ✅ Default amount if not provided
            amount = amount || 10000;

            const user = await UserData.findOne({ username });
            if (!user) {
            return res.status(400).json({ message: "User not found" });
            }

            const activity = await Activity.findOne({ name: "topup" });
            if (!activity) {
            return res.status(400).json({ message: "Topup activity not found" });
            }

            const isDisallowed = user.disabled_activities.includes(activity.act_id);
            if (isDisallowed) {
            return res
                .status(400)
                .json({ message: "You are not eligible for Activation." });
            }

            if (amount <= 0) {
            return res.status(400).json({ ...INVALID_AMOUNT });
            }

            let plan = await PlansInfo.findOne();
            const packageCount = await PlansInfo.countDocuments();

            if (packageCount > 1) {
            if (!planId) {
                return res.status(400).json({ ...PACKAGE_NAME_REQUIRED });
            }

            const isPack = await PlansInfo.findOne({ planId });
            if (!isPack) {
                return res.status(400).json({ ...WRONG_PACKAGE_SELECTED });
            }
            plan = isPack;
            }

            // ✅ Skip package validation — directly allow default plan if you want
            req.plan = plan;
            req.amount = amount;
            next();

        } catch (error) {
            console.error("validatePackage error:", error);
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async validateFund(req, res, next) {
        try {
            const { amount, tx_id } = req.body;
            console.log(req.body)

            if (amount <= 0) {
                return res.status(400).json({ ...INVALID_AMOUNT })
            }
            let add_fund = await Transaction.findOne({ tx_Id: tx_id, status: 1 });

            if (add_fund) {
                return res.status(404).json({ message: 'User have already add fund with this request' });
            }


            next();

        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

}
const orderValidator = new ORDER_VALIDATOR();
module.exports = orderValidator;