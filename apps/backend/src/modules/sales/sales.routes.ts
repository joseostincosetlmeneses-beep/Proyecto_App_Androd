import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createInvoice, listInvoices, getInvoiceById, updateInvoiceStatus } from './sales.service.js';
import { AppError } from '../../core/errors/app-error.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { CreateInvoiceInputSchema, PaginationQuerySchema, ResourceIdParamsSchema, UpdateInvoiceStatusInputSchema } from '@erp/contracts';
import { env } from '../../config/env.js';

const router: ReturnType<typeof Router> = Router();

// POST /api/sales/invoices - Crear factura transaccional
router.post(
  '/invoices',
  requireRoles('admin', 'sales'),
  validateRequest({ body: CreateInvoiceInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) {
        throw new AppError(400, 'Tenant requerido');
      }

      const invoice = await createInvoice({
        ...req.body,
        tenantId: req.tenantId
      });

      res.status(201).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/sales/invoices - Listado paginado de facturas
router.get(
  '/invoices',
  requireRoles('admin', 'sales', 'accounting'),
  validateRequest({ query: PaginationQuerySchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) {
        throw new AppError(400, 'Tenant requerido');
      }

      const query = req.query as unknown as Parameters<typeof listInvoices>[1];
      const result = await listInvoices(req.tenantId, query);

      res.json({
        success: true,
        data: result.items,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/sales/invoices/:id - Detalle de una factura por ID
router.get(
  '/invoices/:id',
  requireRoles('admin', 'sales', 'accounting'),
  validateRequest({ params: ResourceIdParamsSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) {
        throw new AppError(400, 'Tenant requerido');
      }

      const invoice = await getInvoiceById(req.tenantId, String(req.params.id));

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/invoices/:id/status',
  requireRoles('admin', 'sales', 'accounting'),
  validateRequest({ params: ResourceIdParamsSchema, body: UpdateInvoiceStatusInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const invoice = await updateInvoiceStatus(req.tenantId, String(req.params.id), req.body.status);
      res.json({ success: true, data: invoice });
    } catch (error) { next(error); }
  }
);

router.post(
  '/invoices/:id/document-link',
  requireRoles('admin', 'sales', 'accounting'),
  validateRequest({ params: ResourceIdParamsSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      await getInvoiceById(req.tenantId, String(req.params.id));
      const token = jwt.sign(
        { scope: 'invoice-document', invoiceId: String(req.params.id), tenantId: req.tenantId },
        env.JWT_SECRET,
        { subject: req.user?.id, expiresIn: '5m' }
      );
      const baseUrl = env.PUBLIC_API_URL.replace(/\/$/, '');
      res.json({
        success: true,
        data: {
          url: `${baseUrl}/api/documents/invoices/${req.params.id}?token=${encodeURIComponent(token)}`,
          expiresInSeconds: 300
        }
      });
    } catch (error) { next(error); }
  }
);

export default router;
