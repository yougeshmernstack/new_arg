const cron = require('node-cron');
require('./connections')
const roiClosing = require('./SERVICES/Roi');
const withdraw = require('./API/USER/Withdraw');

// Function to run cron job for ROI income
async function runMatchingIncomeCronJob() {
    try {
        console.log('Running matching income closing...');
        await roiClosing.matchingIncomeClosing();
    } catch (error) {
        console.error('Error in Matching Income Cron Job:', error);
    }
}

async function runRepurchaseMatchingIncomeCronJob() {
    try {
        console.log('Running repurchase matching income closing...');
        await roiClosing.repurchaseMatchingIncomeClosing();
    } catch (error) {
        console.error('Error in Repurchase Matching Income Cron Job:', error);
    }
}

async function runUplineMatchingIncomeCronJob() {
    try {
        console.log('Running upline matching income closing...');
        await roiClosing.uplineMatchingIncomeClosing();
    } catch (error) {
        console.error('Error in Upline Matching Income Cron Job:', error);
    }
}

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

// Daily matching income closing (1:1 × 1250) — 6:00 AM IST
cron.schedule('0 6 * * *', () => {
    runMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// Daily repurchase matching income closing (1:1 × 500) — 6:05 AM IST
cron.schedule('5 6 * * *', () => {
    runRepurchaseMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// Daily upline matching income (10% of matching → active directs) — 6:10 AM IST
cron.schedule('10 6 * * *', () => {
    runUplineMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// cron.schedule('55 23 * * *', () => {
//     runCron_distribute_royalty_income();
// }, {
//     timezone: "Asia/Kolkata" 
// });

module.exports = {
    // runRoiCronJob,
    // runCron_distribute_royalty_income,
    runMatchingIncomeCronJob,
    runRepurchaseMatchingIncomeCronJob,
    runUplineMatchingIncomeCronJob,
    runAutoWithdrawalCronJob
};
