const PlansInfo = require("../MODALS/Plan");


class PlanService {
    // Method to fetch plan by ID
    async getPlanById(planId) {
        console.log("planid: ", planId);
        try {
            const plan = await PlansInfo.findOne({ planId });
            if (!plan) {
                throw new Error('Plan not found');
            }
            return plan;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Method to update a plan by its ID and new data
    async updatePlan(planId, updatedFields) {
        try {
            const updatedPlan = await PlansInfo.findOneAndUpdate(
                { planId },
                { $set: updatedFields },
                { new: true } // Returns the updated plan document
            );

            if (!updatedPlan) {
                throw new Error('Plan not found');
            }
            return updatedPlan;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
const planSettings = new PlanService();
module.exports = planSettings;
