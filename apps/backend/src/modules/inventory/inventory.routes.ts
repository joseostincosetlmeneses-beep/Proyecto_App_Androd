import { Router } from 'express';
import {
  CatalogPaginationQuerySchema,
  CreateProductInputSchema,
  ResourceIdParamsSchema,
  StockAdjustmentInputSchema,
  UpdateProductInputSchema
} from '@erp/contracts';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { adjustStock, createProduct, deleteProduct, listProducts, saveProductImage, updateProduct } from './inventory.service.js';

const router: Router = Router();

router.get(
  '/products',
  requireRoles('admin', 'sales', 'inventory', 'accounting', 'purchasing'),
  validateRequest({ query: CatalogPaginationQuerySchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const result = await listProducts(req.tenantId, req.query as never);
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (error) { next(error); }
  }
);

router.post(
  '/products',
  requireRoles('admin', 'inventory', 'purchasing'),
  validateRequest({ body: CreateProductInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const product = await createProduct(req.tenantId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

router.patch(
  '/products/:id',
  requireRoles('admin', 'inventory', 'purchasing'),
  validateRequest({ params: ResourceIdParamsSchema, body: UpdateProductInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const product = await updateProduct(req.tenantId, String(req.params.id), req.body);
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

router.delete(
  '/products/:id',
  requireRoles('admin', 'inventory', 'purchasing'),
  validateRequest({ params: ResourceIdParamsSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const product = await deleteProduct(req.tenantId, String(req.params.id));
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

router.post(
  '/products/:id/image',
  requireRoles('admin', 'inventory', 'purchasing'),
  validateRequest({ params: ResourceIdParamsSchema, body: z.object({ imageData: z.string().max(2_100_000) }) }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const product = await saveProductImage(req.tenantId, String(req.params.id), String(req.body.imageData));
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

router.post(
  '/products/:id/adjust-stock',
  requireRoles('admin', 'inventory', 'purchasing'),
  validateRequest({ params: ResourceIdParamsSchema, body: StockAdjustmentInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const product = await adjustStock(req.tenantId, String(req.params.id), req.body);
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

export default router;
