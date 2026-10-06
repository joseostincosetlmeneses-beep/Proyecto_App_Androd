import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { CashMovementModel } from './cash-movement.model.js';

const router: Router = Router();
const createSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(2).max(60),
  concept: z.string().trim().min(3).max(180),
  amount: z.number().positive().max(100_000_000),
  occurredAt: z.coerce.date()
});

router.get('/', requireRoles('admin', 'accounting'), async (req, res, next) => {
  try {
    const tenantId = String(req.tenantId);
    const [items, totals] = await Promise.all([
      CashMovementModel.find({ tenantId }).sort({ occurredAt: -1 }).limit(100).lean(),
      CashMovementModel.aggregate<{ _id: 'income' | 'expense'; total: number }>([{ $match: { tenantId } }, { $group: { _id: '$type', total: { $sum: '$amount' } } }])
    ]);
    const income = totals.find((item) => item._id === 'income')?.total ?? 0;
    const expense = totals.find((item) => item._id === 'expense')?.total ?? 0;
    res.json({ success: true, data: { items: items.map((item) => ({ ...item, id: String(item._id) })), summary: { income, expense, balance: income - expense } } });
  } catch (error) { next(error); }
});

router.post('/', requireRoles('admin', 'accounting'), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Revisa los datos del movimiento financiero.');
    const item = await CashMovementModel.create({ ...parsed.data, tenantId: req.tenantId, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: { ...item.toObject(), id: item.id } });
  } catch (error) { next(error); }
});

export default router;
