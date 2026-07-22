const mongoose = require('mongoose');

/** Fixed display size for distributor dashboard banners (also shown in admin UI). */
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 360;

const dashboardBannerSchema = new mongoose.Schema({
  bannerId: { type: Number, unique: true },
  title: { type: String, default: '', trim: true },
  imageUrl: { type: String, required: true, trim: true },
  linkUrl: { type: String, default: '', trim: true },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_by: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

dashboardBannerSchema.index({ status: 1, sortOrder: 1 });

dashboardBannerSchema.pre('save', async function (next) {
  try {
    if (!this.bannerId) {
      const latest = await this.constructor.findOne({}, {}, { sort: { bannerId: -1 } });
      this.bannerId = latest ? latest.bannerId + 1 : 1;
    }
    this.updated_at = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

const DashboardBanner = mongoose.model('DashboardBanner', dashboardBannerSchema);

module.exports = DashboardBanner;
module.exports.BANNER_WIDTH = BANNER_WIDTH;
module.exports.BANNER_HEIGHT = BANNER_HEIGHT;
