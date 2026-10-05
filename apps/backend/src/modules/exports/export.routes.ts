import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';

const router: Router = Router();
const ExportSchema = z.object({ format: z.enum(['pdf', 'xlsx']) });

router.post('/link', requireRoles('admin', 'sales', 'inventory', 'accounting'), validateRequest({ body: ExportSchema }), async (req, res, next) => {
  try {
    if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
    const format = req.body.format as 'pdf' | 'xlsx';
    const token = jwt.sign(
      { scope: 'tenant-export', tenantId: req.tenantId, format },
      env.JWT_SECRET,
      { subject: req.user?.id, expiresIn: '5m' }
    );
    const baseUrl = env.PUBLIC_API_URL.replace(/\/$/, '');
    res.json({ success: true, data: { url: `${baseUrl}/api/documents/export.${format}?token=${encodeURIComponent(token)}`, expiresInSeconds: 300 } });
  } catch (error) { next(error); }
});

export default router;
