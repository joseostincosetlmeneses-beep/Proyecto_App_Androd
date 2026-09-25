import { Router } from 'express';
import { createInvoice, listInvoices, getInvoiceById } from './sales.service.js';
import { AppError } from '../../core/errors/app-error.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { CreateInvoiceInputSchema, PaginationQuerySchema } from '@erp/contracts';

const router: ReturnType<typeof Router> = Router();

// POST /api/sales/invoices - Crear factura transaccional
router.post(
  '/invoices',
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
  async (req, res, next) => {
    try {
      if (!req.tenantId) {
        throw new AppError(400, 'Tenant requerido');
      }

      const invoice = await getInvoiceById(req.tenantId, req.params.id);

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
