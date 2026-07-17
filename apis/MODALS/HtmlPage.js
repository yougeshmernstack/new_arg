const mongoose = require("mongoose");
const { errorLogger } = require("../utils/logger");

const HtmlPageSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

HtmlPageSchema.pre("save", async function (next) {
  try {
    if (!this.tx_Id) {
      const latestTransaction = await this.constructor.findOne(
        {},
        {},
        { sort: { id: -1 } }
      );
      const lastTxId = latestTransaction ? latestTransaction.id : 0;
      this.id = lastTxId + 1;
    }
    next();
  } catch (error) {
            errorLogger(error)
    next(error);
  }
});

module.exports = mongoose.model("HtmlPage", HtmlPageSchema);
