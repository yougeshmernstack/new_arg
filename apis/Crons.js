const cron = require('node-cron');
require('./connections')
const roiClosing = require('./SERVICES/Roi');
const withdraw = require('./API/USER/Withdraw');

// Function to run cron job for ROI income
async function runAutoWithdrawalCronJob() {
    try {
        await withdraw.process_auto_withdrawals();
    } catch (error) {
        console.error("Error in ROI Cron Job:", error);
    }
}
async function runRoiCronJob() {
    try {
        await roiClosing.roiIncome();
    } catch (error) {
        console.error("Error in ROI Cron Job:", error);
    }
}

async function runCron_distribute_royalty_income() {
    try {
        console.log("Running  Income ");
        await roiClosing.distribute_royalty_income();

    } catch (error) {
        console.error("Error in  Cron Job:", error);
    }
}
// async function runCron_income_release() {
//     try {
//         console.log("Running release Income ");
//         await withdrawal.autoReleaseIncome();

//     } catch (error) {
//         console.error("Error in ROI Cron Job:", error);
//     }
// }


// cron.schedule('30 5 * * *', () => {
//     runRoiCronJob();
// }, {
//     timezone: "Asia/Kolkata"
// });
cron.schedule('40 5 * * *', () => {
    runAutoWithdrawalCronJob();
}, {
    timezone: "Asia/Kolkata"
});

// cron.schedule('55 23 * * *', () => {
//     runCron_distribute_royalty_income();
// }, {
//     timezone: "Asia/Kolkata" 
// });

module.exports = {
    // runRoiCronJob,
    // runCron_distribute_royalty_income,
    runAutoWithdrawalCronJob
};