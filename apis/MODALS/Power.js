const mongoose = require('mongoose');
const getNextTxId = require('./Counter');

const PowerSchema = new mongoose.Schema({
   powerId: { type: Number },
   username: { type: String },
   uid: { type: Number },
   power: { type: Number },
},
  { timestamps: true }
);

PowerSchema.pre('save', async function (next) {
  try {
      this.powerId = await getNextTxId('powerId');
      next();
  } catch (err) {
      next(err); 
  }
});

const Power = mongoose.model('Power', PowerSchema);
module.exports = { Power };









