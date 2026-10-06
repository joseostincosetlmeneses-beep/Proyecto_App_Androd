import { Router } from 'express';
import {
  CatalogPaginationQuerySchema,
  CreateContactInputSchema,
  ResourceIdParamsSchema,
  UpdateContactInputSchema
} from '@erp/contracts';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { validateRequest } from '../../core/middlewares/validation.middleware.js';
import { createContact, deleteContact, listContacts, updateContact } from './contacts.service.js';

const router: Router = Router();

router.get(
  '/',
  requireRoles('admin', 'sales', 'accounting'),
  validateRequest({ query: CatalogPaginationQuerySchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const result = await listContacts(req.tenantId, req.query as never);
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (error) { next(error); }
  }
);

router.post(
  '/',
  requireRoles('admin', 'sales'),
  validateRequest({ body: CreateContactInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const contact = await createContact(req.tenantId, req.body);
      res.status(201).json({ success: true, data: contact });
    } catch (error) { next(error); }
  }
);

router.patch(
  '/:id',
  requireRoles('admin', 'sales'),
  validateRequest({ params: ResourceIdParamsSchema, body: UpdateContactInputSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const contact = await updateContact(req.tenantId, String(req.params.id), req.body);
      res.json({ success: true, data: contact });
    } catch (error) { next(error); }
  }
);

router.delete(
  '/:id',
  requireRoles('admin', 'sales'),
  validateRequest({ params: ResourceIdParamsSchema }),
  async (req, res, next) => {
    try {
      if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
      const contact = await deleteContact(req.tenantId, String(req.params.id));
      res.json({ success: true, data: contact });
    } catch (error) { next(error); }
  }
);

export default router;
