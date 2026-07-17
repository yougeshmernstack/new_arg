const Activity = require("../../MODALS/Activity");
const Transaction = require("../../MODALS/transactions");
const UserData = require("../../MODALS/userData");
const Order = require("../../MODALS/Orders");
const { errorLogger } = require("../../utils/logger");

class DASHBOARD {
  async getStats(req, res) {
    try {
      // User stats
      const totalUsers = await UserData.countDocuments();
      const activeUsers = await UserData.countDocuments({ status: 1 });
      const inactiveUsers = await UserData.countDocuments({ status: 0 });

      // Today's date setup
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUsers = await UserData.countDocuments({ joining_date: { $gte: today } });
      const todayActiveUsers = await UserData.countDocuments({ Activation_date: { $gte: today } });

      // Withdrawal stats
      // const totalWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal' });
      const countPendingWithdrawals = await Transaction.countDocuments({ source: 'withdrawal', status: 0 });
      // const approvedWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', status: 1 });
      // const rejectedWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', status: 2 });
      const totalWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal'} },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const pendingWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 0 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const approvedWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const rejectedWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 2 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      // const todayWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', time: { $gte: today } });
      // const todayPendingWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', status: 0, time: { $gte: today } });
      // const todayApprovedWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', status: 1, time: { $gte: today } });
      // const todayRejectedWithdrawals = await Transaction.countDocuments({ tx_type: 'withdrawal', status: 2, time: { $gte: today } });
      const todayWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayPendingWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 0, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayApprovedWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayRejectedWithdrawals = await Transaction.aggregate([
        { $match: { source: 'withdrawal', status: 2, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      // total investment
      const totalInvestment = await Order.aggregate([
        { $match: { status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const todayInvestment = await Order.aggregate([
        { $match: { status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      // Payment request stats
      // const totalPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund' });
      const countPendingPaymentRequests = await Transaction.countDocuments({ source: 'add_fund', status: 0 });
      // const approvedPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', status: 1 });
      // const rejectedPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', status: 2 });
      const totalPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund'} },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const pendingPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 0 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const approvedPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const rejectedPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 2 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);


      // const todayPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', time: { $gte: today } });
      // const todayPendingPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', status: 0, time: { $gte: today } });
      // const todayApprovedPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', status: 1, time: { $gte: today } });
      // const todayRejectedPaymentRequests = await Transaction.countDocuments({ tx_type: 'add_fund', status: 2, time: { $gte: today } });
      const todayPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayPendingPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 0, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayApprovedPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const todayRejectedPaymentRequests = await Transaction.aggregate([
        { $match: { source: 'add_fund', status: 2, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      // Income activities
      const incomeActivities = await Activity.find({ type: 'income' }).select('name');

      // Total and today income
      const totalIncome = await Transaction.aggregate([
        { $match: { tx_type: { $in: incomeActivities.map(act => act.name) }, debit_credit: 'credit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const todayIncome = await Transaction.aggregate([
        { $match: { tx_type: { $in: incomeActivities.map(act => act.name) }, debit_credit: 'credit', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Bet activities
      const totalBet = await Transaction.aggregate([
        { $match: { tx_type: 'bet' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const todayBet = await Transaction.aggregate([
        { $match: { tx_type: 'bet', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Win activities
      const totalWin = await Transaction.aggregate([
        { $match: { tx_type: 'win' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const todayWin = await Transaction.aggregate([
        { $match: { tx_type: 'win', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Respond with all stats
      res.json({
        totalUsers,
        activeUsers,
        inactiveUsers,
        todayUsers,
        todayActiveUsers,
        todayInvestment: todayInvestment[0]?.total || 0,
        countPendingWithdrawals,
        countPendingPaymentRequests,
        totalInvestment: totalInvestment[0]?.total || 0,
        // totalWithdrawals,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
        // pendingWithdrawals,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        // approvedWithdrawals,
        approvedWithdrawals: approvedWithdrawals[0]?.total || 0,
        // rejectedWithdrawals,
        rejectedWithdrawals: rejectedWithdrawals[0]?.total || 0,
        // todayWithdrawals,
        todayWithdrawals: todayWithdrawals[0]?.total || 0,
        // todayPendingWithdrawals,
        todayPendingWithdrawals: todayPendingWithdrawals[0]?.total || 0,
        // todayApprovedWithdrawals,
        todayApprovedWithdrawals: todayApprovedWithdrawals[0]?.total || 0,
        // todayRejectedWithdrawals,
        todayRejectedWithdrawals: todayRejectedWithdrawals[0]?.total || 0,
        // totalPaymentRequests,
        totalPaymentRequests: totalPaymentRequests[0]?.total || 0,
        // pendingPaymentRequests,
        pendingPaymentRequests: pendingPaymentRequests[0]?.total || 0,
        // approvedPaymentRequests,
        approvedPaymentRequests: approvedPaymentRequests[0]?.total || 0,
        // rejectedPaymentRequests,
        rejectedPaymentRequests: rejectedPaymentRequests[0]?.total || 0,
        // todayPaymentRequests,
        todayPaymentRequests: todayPaymentRequests[0]?.total || 0,
        // todayPendingPaymentRequests,
        todayPendingPaymentRequests: todayPendingPaymentRequests[0]?.total || 0,
        // todayApprovedPaymentRequests,
        todayApprovedPaymentRequests: todayApprovedPaymentRequests[0]?.total || 0,
        // todayRejectedPaymentRequests,
        todayRejectedPaymentRequests: todayRejectedPaymentRequests[0]?.total || 0,
        totalIncome: totalIncome[0]?.total || 0,
        todayIncome: todayIncome[0]?.total || 0,
        totalBet: totalBet[0]?.total || 0,
        todayBet: todayBet[0]?.total || 0,
        totalWin: totalWin[0]?.total || 0,
        todayWin: todayWin[0]?.total || 0,
      });
    } catch (error) {
            errorLogger(error)
      res.status(500).json({ message: error.message });
    }
  }

  async payout(req, res) {
    try {

      // Today's date setup
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUsers = await UserData.countDocuments({ joining_date: { $gte: today } });
      const todayActiveUsers = await UserData.countDocuments({ Activation_date: { $gte: today } });

     
      const level_income = await Transaction.aggregate([
        { $match: { source: 'level_income', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const roi_income = await Transaction.aggregate([
        { $match: { source: 'roi_income', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const roi_level_income = await Transaction.aggregate([
        { $match: { source: 'roi_level_income', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const royality_income = await Transaction.aggregate([
        { $match: { source: 'royality_income', status: 1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const total_incomes = (level_income[0]?.total || 0) +
                     (roi_income[0]?.total || 0) +
                     (roi_level_income[0]?.total || 0) +
                     (royality_income[0]?.total || 0);


      const today_level_income = await Transaction.aggregate([
        { $match: { source: 'level_income', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const today_roi_income = await Transaction.aggregate([
        { $match: { source: 'roi_income', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const today_roi_level_income = await Transaction.aggregate([
        { $match: { source: 'roi_level_income', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const today_royality_income = await Transaction.aggregate([
        { $match: { source: 'royality_income', status: 1, time: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      

      const today_total_incomes = (today_level_income[0]?.total || 0) +
                     (today_roi_income[0]?.total || 0) +
                     (today_roi_level_income[0]?.total || 0) +
                     (today_royality_income[0]?.total || 0);
      

      // Respond with all stats
      res.json({
        level_income: level_income[0]?.total || 0,
        roi_income: roi_income[0]?.total || 0,
        roi_level_income: roi_level_income[0]?.total || 0,
        royality_income: royality_income[0]?.total || 0,
        today_level_income: today_level_income[0]?.total || 0,
        today_roi_income: today_roi_income[0]?.total || 0,
        today_roi_level_income: today_roi_level_income[0]?.total || 0,
        today_royality_income: today_royality_income[0]?.total || 0,
        total_incomes: total_incomes,
        today_total_incomes: today_total_incomes,
        
      });
    } catch (error) {
            errorLogger(error)
      res.status(500).json({ message: error.message });
    }
  }
}

const Dashboard = new DASHBOARD();
module.exports = Dashboard;
