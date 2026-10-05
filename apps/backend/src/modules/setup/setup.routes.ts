import { Router } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { seedSampleData } from './sample-data.service.js';

const router: Router = Router();

router.post('/sample-data', requireRoles('admin'), async (req, res, next) => {
  try {
    if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
    const summary = await seedSampleData(req.tenantId);
    res.json({ success: true, data: { ...summary, message: 'Los datos iniciales están listos.' } });
  } catch (error) { next(error); }
});

export default router;
