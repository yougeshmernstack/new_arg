const mongoose = require('mongoose');

// Bet Setup Schema - To be used by Admin to define a new round
const betSetupSchema = new mongoose.Schema({
  betId: { type: Number, unique: true }, // Sequential and unique
  roundTime: Date,
  betType: String,
  betColor: String,
  betSize: String,
  roundId: {type: Number},
   betRange: {
    type: [Number], // This will allow [10, 100]
    default: []
  },
  status: { type: Number, default: 0 },
}, { timestamps: true });

const BetSetup = mongoose.model('BetSetup', betSetupSchema);

module.exports = BetSetup;
