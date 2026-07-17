const advance_info = require("../MODALS/advanceInfo");
const Company = require("../MODALS/CompanyInfo");
const PlansInfo = require("../MODALS/Plan");
const UserData = require("../MODALS/userData");
const UserWallet = require('../MODALS/userWallets');


class SETUP {
    async save_advance() {
        const advance = new advance_info()
        return await advance.save()
    }
    async save_first_user() {
        ///save first user and wallet if not exists
        const user = await UserData.findOne({uid:1})
        if(!user){
            const user = new UserData({
                name: 'demo',
                email: 'demo@gmail.com',
                mobile: '1111111111',
                password: '$2b$10$4p.L84dL.zROGUIuhgoMyeMNGQrBWfSgNwTug0Rr4XF02mE84KPN.',
                username: 'demo',
                wallet_address: '0x0C2E39c4f3480BF312d9937Aa2621BbebaFE9152',
                uid: 1,
                status:1,
                roles:['admin','user'],
                sponsor_Id: 0,
                sponsor_Name: 'admin',
                joining_date: new Date()
            })
            await user.save()
        }
        const wallet = await UserWallet.findOne({uid:1})
        if(!wallet){
            const wallet = new UserWallet({uid:1})
            await wallet.save()
        }
        return user
    }
   
    async savePackage() {
        const plan = new PlansInfo({
            name: 'JOINING PACKAGE',
            min_amount: 10000,
            max_amount: 10000,
            multiplier: 1,
            staking_period: 0,
            total_capping: 200,
            included_incomes_for_capping: [
                "roi_income",
                "level_income",
                "daily_trading_profit",
                "direct_referral_bonus",
                "instant_leadership_reward",
                "team_activity_bonus"
            ]
        });
        await plan.save();
    }
    async saveCompanyInfo(){
        const company = new Company();
        await company.save()
    }
}

const project_setup = new SETUP();
module.exports = project_setup;