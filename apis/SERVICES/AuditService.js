const AuditLog = require('../MODALS/AuditLog');
const { errorLogger } = require('../utils/logger');

class AuditService {
    async log({ actor_uid, actor_role, action, target_uid = null, target_role = null, target_type = '', target_id = '', ip = '', meta = {} }) {
        try {
            const entry = new AuditLog({
                actor_uid,
                actor_role,
                action,
                target_uid,
                target_role,
                target_type,
                target_id: String(target_id || ''),
                ip,
                meta
            });
            await entry.save();
            return entry;
        } catch (error) {
            errorLogger(error);
            return null;
        }
    }

    async getLogs(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const skip = (page - 1) * limit;
            const filter = {};
            if (req.query.action) filter.action = req.query.action;
            if (req.query.actor_uid) filter.actor_uid = Number(req.query.actor_uid);

            const [logs, total] = await Promise.all([
                AuditLog.find(filter).sort({ created_date: -1 }).skip(skip).limit(limit),
                AuditLog.countDocuments(filter)
            ]);

            res.status(200).json({
                status: 200,
                message: 'Audit logs fetched successfully.',
                data: logs,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ code: 500, message: 'Internal server error.' });
        }
    }
}

const auditService = new AuditService();
module.exports = auditService;
