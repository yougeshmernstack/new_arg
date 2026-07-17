const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    logId: { type: Number, unique: true },
    actor_uid: { type: Number, required: true },
    actor_role: { type: String, required: true },
    action: { type: String, required: true },
    target_uid: { type: Number, default: null },
    target_role: { type: String, default: null },
    target_type: { type: String, default: '' },
    target_id: { type: String, default: '' },
    ip: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

auditLogSchema.index({ actor_uid: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_date: -1 });

auditLogSchema.pre('save', async function (next) {
    try {
        if (!this.logId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { logId: -1 } });
            this.logId = latest ? latest.logId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
