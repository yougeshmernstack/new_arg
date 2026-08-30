const cron = require('node-cron');
require('./connections')
const roiClosing = require('./SERVICES/Roi');
const { runAutoDistributorWithdraw } = require('./SERVICES/AutoDistributorWithdraw');

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

async function runAutoDistributorWithdrawCronJob() {
    try {
        console.log('Running auto distributor withdrawal...');
        await runAutoDistributorWithdraw();
    } catch (error) {
        console.error('Error in Auto Distributor Withdrawal Cron Job:', error);
    }
}

// Weekly matching income closing — every Saturday 12:01 AM IST
cron.schedule('1 0 * * 6', () => {
    runMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// Weekly repurchase matching income closing — every Saturday 12:11 AM IST
cron.schedule('11 0 * * 6', () => {
    runRepurchaseMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// Weekly upline matching income — every Saturday 12:21 AM IST
cron.schedule('21 0 * * 6', () => {
    runUplineMatchingIncomeCronJob();
}, {
    timezone: 'Asia/Kolkata'
});

// Weekly auto distributor withdrawal — every Saturday 12:31 AM IST (after income crons)
cron.schedule('31 0 * * 6', () => {
    runAutoDistributorWithdrawCronJob();
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
    runAutoDistributorWithdrawCronJob
};
