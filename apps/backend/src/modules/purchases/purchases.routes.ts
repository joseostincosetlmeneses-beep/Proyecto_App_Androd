import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { withTransaction } from '../../core/database/transaction.helper.js';
import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { PurchaseModel } from './purchase.model.js';

const router: Router = Router();
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const createSchema = z.object({
  supplierId: idSchema,
  expectedAt: z.coerce.date().optional(),
  items: z.array(z.object({ productId: idSchema, quantity: z.number().int().positive().max(10000), unitCost: z.number().nonnegative() })).min(1).max(50)
});
const statusSchema = z.object({ status: z.enum(['ordered', 'received', 'cancelled']) });

router.get('/', requireRoles('admin', 'accounting', 'purchasing'), async (req, res, next) => {
  try {
    const items = await PurchaseModel.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: items.map((item) => ({ ...item, id: String(item._id) })) });
  } catch (error) { next(error); }
});

router.post('/', requireRoles('admin', 'accounting', 'purchasing'), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Revisa el proveedor y los productos de la compra.');
    const tenantId = String(req.tenantId);
    const supplier = await ContactModel.findOne({ _id: parsed.data.supplierId, tenantId, type: 'Proveedor' }).lean();
    if (!supplier) throw new AppError(422, 'Selecciona un proveedor válido.');
    const ids = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await ProductModel.find({ _id: { $in: ids }, tenantId }).lean();
    const byId = new Map(products.map((item) => [String(item._id), item]));
    if (products.length !== ids.length) throw new AppError(422, 'Uno de los productos no existe.');
    const items = parsed.data.items.map((item) => {
      const product = byId.get(item.productId)!;
      return { ...item, sku: product.sku, description: product.name };
    });
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const purchase = await PurchaseModel.create({ tenantId, number: `OC-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`, supplier: { id: String(supplier._id), name: supplier.name }, items, total, expectedAt: parsed.data.expectedAt });
    res.status(201).json({ success: true, data: { ...purchase.toObject(), id: purchase.id } });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireRoles('admin', 'accounting', 'purchasing'), async (req, res, next) => {
  try {
    const parsedId = idSchema.safeParse(req.params.id);
    const parsed = statusSchema.safeParse(req.body);
    if (!parsedId.success || !parsed.success) throw new AppError(422, 'Cambio de estado inválido.');
    const tenantId = String(req.tenantId);
    const updated = await withTransaction(async (session) => {
      const purchase = await PurchaseModel.findOne({ _id: parsedId.data, tenantId }).session(session);
      if (!purchase) throw new AppError(404, 'Orden de compra no encontrada.');
      if (purchase.status === 'received' || purchase.status === 'cancelled') throw new AppError(409, 'Esta orden ya está cerrada.');
      if (parsed.data.status === 'received') {
        for (const item of purchase.items) {
          await StockBalanceModel.updateOne({ tenantId, productId: item.productId }, { $inc: { currentStock: item.quantity } }, { upsert: true, session });
          await StockMovementModel.create([{ tenantId, productId: item.productId, type: 'ENTRADA', quantity: item.quantity, referenceId: purchase.number, occurredAt: new Date() }], { session });
        }
        purchase.receivedAt = new Date();
      }
      purchase.status = parsed.data.status;
      await purchase.save({ session });
      return purchase;
    });
    res.json({ success: true, data: { ...updated.toObject(), id: updated.id } });
  } catch (error) { next(error); }
});

export default router;
