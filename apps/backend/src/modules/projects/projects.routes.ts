import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { ProjectModel } from './project.model.js';

const router: Router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const fields = {
  name: z.string().trim().min(2).max(120), client: z.string().trim().max(120).default(''), description: z.string().trim().max(500).default(''),
  status: z.enum(['planned', 'active', 'completed', 'paused']).default('planned'), budget: z.number().nonnegative().max(100_000_000).default(0), progress: z.number().int().min(0).max(100).default(0), dueAt: z.coerce.date().optional()
};
const createSchema = z.object(fields);
const updateSchema = z.object(fields).partial().refine((value) => Object.keys(value).length > 0);

router.get('/', requireRoles('admin', 'projects', 'sales'), async (req, res, next) => {
  try {
    const items = await ProjectModel.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: items.map((item) => ({ ...item, id: String(item._id) })) });
  } catch (error) { next(error); }
});

router.post('/', requireRoles('admin', 'projects'), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Revisa los datos del proyecto.');
    const item = await ProjectModel.create({ ...parsed.data, tenantId: req.tenantId });
    res.status(201).json({ success: true, data: { ...item.toObject(), id: item.id } });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRoles('admin', 'projects'), async (req, res, next) => {
  try {
    const id = idSchema.safeParse(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!id.success || !parsed.success) throw new AppError(422, 'Actualización de proyecto inválida.');
    const item = await ProjectModel.findOneAndUpdate({ _id: id.data, tenantId: req.tenantId }, { $set: parsed.data }, { new: true, runValidators: true }).lean();
    if (!item) throw new AppError(404, 'Proyecto no encontrado.');
    res.json({ success: true, data: { ...item, id: String(item._id) } });
  } catch (error) { next(error); }
});

export default router;
