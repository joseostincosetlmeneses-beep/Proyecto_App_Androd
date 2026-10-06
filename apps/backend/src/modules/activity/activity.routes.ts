import { Router } from 'express';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { UserModel } from '../auth/user.model.js';

const router: Router = Router();

router.get('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const logs = await AuditLogModel.find({ tenantId: req.tenantId }).sort({ timestamp: -1 }).limit(150).lean();
    const ids = [...new Set(logs.map((log) => log.userId))];
    const users = await UserModel.find({ _id: { $in: ids }, tenantId: req.tenantId }).select('name').lean();
    const names = new Map(users.map((user) => [String(user._id), user.name]));
    res.json({ success: true, data: logs.map((log) => ({ id: String(log._id), userId: log.userId, userName: names.get(log.userId) ?? 'Sistema', action: log.action, resource: log.resource, statusCode: log.statusCode ?? 0, timestamp: log.timestamp })) });
  } catch (error) { next(error); }
});

export default router;
