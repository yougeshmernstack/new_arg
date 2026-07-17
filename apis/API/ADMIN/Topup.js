const Orders = require("../../MODALS/Orders");
const UserData = require("../../MODALS/userData");
const LevelIncome = require("../../SERVICES/LevelIncome");
const TeamService = require("../../SERVICES/UpdateTeam");

class TOPUP {
    // async adminTopup(req, res) {
    //     try {
    //         const { username, amount, planId } = req.body;
    //         const { plan } = req;

    //         // Fetch user by username
    //         const user = await UserData.findOne({
    //             $or: [
    //                 { username: username },
    //                 { wallet_address: username }
    //             ]
    //         });

    //         if (!user) {
    //             return res.status(404).json({ message: "User not found" });
    //         }

    //         // Check if the plan exists
    //         if (!plan || !plan.package) {
    //             return res.status(400).json({ message: "Invalid plan information" });
    //         }

    //         // Generate a unique transaction ID (tx_Id)
    //         const tx_Id = "TX" + Date.now(); // Transaction ID generation
    //         const wallet_type = "admin"; // Define the wallet type for admin transactions

    //         // Check if there is an existing active order for the user
    //         const existingOrder = await Orders.findOne({ uid: user.uid, status: 1 });
    //         const type = existingOrder ? "Re-purchase" : "Purchase";

    //         // Calculate max return and create the order
    //         // const max_return = (amount * plan.package.total_capping) / 100;
    //         const newOrder = new Orders({
    //             uid: user.uid,
    //             source: wallet_type,
    //             amount,
    //             // max_return,
    //             status: 1, // Assuming '1' indicates active/approved
    //             type,
    //             package: plan.package.name,
    //             planId: plan.planId,
    //             order_bv: amount // Assuming 'amount' is used as 'order_bv' value
    //         });

    //         // Save the new order to the database
    //         const order = await newOrder.save();
    //         await TeamService.updateBusiness(order.uid, order.amount, order.type)
    //         // await LevelIncome.distributeLevelIncome(order.uid, order.planId, order.amount, order.order_Id)
    //         // Respond with success
    //         res.status(201).json({ message: "Top-up successful", order: newOrder });
    //     } catch (error) {
    //         console.error("Error during admin top-up:", error);
    //         res.status(500).json({ message: "Internal Server Error" });
    //     }
    // }

    async adminTopup(req, res) {
        try {
            const { username, planId } = req.body;
            const { plan } = req;

            // ✅ Default amount from validation middleware
            const amount = req.amount || 10000;

            // Fetch user by username or wallet address
            const user = await UserData.findOne({
            $or: [{ username: username }, { wallet_address: username }],
            });

            if (!user) {
            return res.status(404).json({ message: "User not found" });
            }

            if (!plan) {
            return res.status(400).json({ message: "Invalid plan information" });
            }

            const tx_Id = "TX" + Date.now();
            const wallet_type = "admin";

            // Check if there’s already an active order
            const existingOrder = await Orders.findOne({ uid: user.uid, status: 1 });
            const type = existingOrder ? "Re-purchase" : "Purchase";

            const newOrder = new Orders({
            uid: user.uid,
            source: wallet_type,
            amount,
            status: 1,
            type,
            package: plan.package?.name || "Default Package",
            planId: plan.planId,
            order_bv: amount,
            });

            const order = await newOrder.save();

            // Update business logic
            await TeamService.updateBusiness(order.uid, order.amount, order.type);
            // await LevelIncome.distributeLevelIncome(order.uid, order.planId, order.amount, order.order_Id);

            res.status(201).json({ message: "Topup successful", order });
        } catch (error) {
            console.error("Error during admin top-up:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

}
const AdminTopup = new TOPUP
module.exports = AdminTopup;
