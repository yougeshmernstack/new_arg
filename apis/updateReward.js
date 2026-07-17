const PlansInfo = require('./MODALS/Plan');
const newRewards = [
    { rank_name: "Star", required_business: 150000, monthly_income: { amount: 5000, duration: 6, status: 0 }, royalty_income: { amount: 0,                         duration: 0, status: 1 },   instant_income: { reward_item : "Tool-kit", amount: 5000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 1 },
    { rank_name: "Silver", required_business: 500000, monthly_income: { amount: 20000, duration: 6, status: 0 }, royalty_income: { amount: 0,                      duration: 0, status: 1 },   instant_income: { reward_item : "Phone", amount: 15000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 2 },
    { rank_name: "Gold", required_business: 1000000, monthly_income: { amount: 50000, duration: 6, status: 0 }, royalty_income: { amount: 0,                       duration: 0, status: 1 },   instant_income: { reward_item : "Laptop", amount: 30000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 3 },
    { rank_name: "Platinum", required_business: 2000000, monthly_income: { amount: 100000, duration: 6, status: 0 }, royalty_income: { amount: 10000,              duration: 120, status: 1 }, instant_income: { reward_item : "Bike", amount: 50000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 4 },
    { rank_name: "Topaz", required_business: 4000000, monthly_income: { amount: 150000, duration: 12, status: 0 }, royalty_income: { amount: 20000,                duration: 120, status: 1 }, instant_income: { reward_item : "Bullet", amount: 100000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 5 },
    { rank_name: "Emerald", required_business: 8000000, monthly_income: { amount: 200000, duration: 12, status: 0 }, royalty_income: { amount: 40000,              duration: 120, status: 1 }, instant_income: { reward_item : "Swift", amount: 200000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 6 },
    { rank_name: "Ruby Star", required_business: 16000000, monthly_income: { amount: 500000, duration: 12, status: 0 }, royalty_income: { amount: 60000,           duration: 120, status: 1 }, instant_income: { reward_item : "Nexon", amount: 400000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 7 },
    { rank_name: "Diamond", required_business: 32000000, monthly_income: { amount: 1000000, duration: 12, status: 0 }, royalty_income: { amount: 80000,            duration: 120, status: 1 }, instant_income: { reward_item : "i20 Car", amount: 800000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 8 },
    { rank_name: "Royal Diamond", required_business: 64000000, monthly_income: { amount: 2000000, duration: 12, status: 0 }, royalty_income: { amount: 100000,     duration: 120, status: 1 }, instant_income: { reward_item : "Creta car", amount: 1600000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 9 },
    { rank_name: "Ambassador", required_business: 128000000, monthly_income: { amount: 3000000, duration: 12, status: 0 }, royalty_income: { amount: 200000,       duration: 120, status: 1 }, instant_income: { reward_item : "Bmw car", amount: 3500000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 10 },
    { rank_name: "Royal Ambassador", required_business: 256000000, monthly_income: { amount: 3000000, duration: 12, status: 0 }, royalty_income: { amount: 200000, duration: 120, status: 1 }, instant_income: { reward_item : "Villa", amount: 8000000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 11 },
    { rank_name: "Crown Ambassador", required_business: 512000000, monthly_income: { amount: 3000000, duration: 12, status: 0 }, royalty_income: { amount: 200000, duration: 120, status: 1 }, instant_income: { reward_item : "Vill + World Tour", amount: 16000000, status: 1 }, cto_income: { amount: 0, status: 0 }, rankId: 12 }
]

const updateRewards = async (planId, newRewards) => {
    try {
        const updatedPlan = await PlansInfo.findOneAndUpdate(
            { planId },
            { $set: { 'reward.rewards': newRewards } },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            throw new Error(`Plan with ID ${planId} not found.`);
        }

        console.log('Updated Plan:', updatedPlan);
        return updatedPlan;
    } catch (error) {
        console.error('Error updating rewards:', error);
        throw error;
    }
};

// Example usage

updateRewards(1, newRewards)
    .then(updatedPlan => {
        console.log('Rewards updated successfully:', updatedPlan);
    })
    .catch(error => {
        console.error('Failed to update rewards:', error);
    });
