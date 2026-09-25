import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const tenantMiddleware: RequestHandler = (req, _res, next) => {
  const publicPaths = ['/health', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const tenantId = req.tenantId ?? req.header('x-tenant-id');
  if (!tenantId) {
    next(new AppError(400, 'Tenant requerido. Proporcione el encabezado x-tenant-id o un token asociado a un tenant.'));
    return;
  }

  req.tenantId = tenantId;
  req.tenantContext = { tenantId };
  next();
};
