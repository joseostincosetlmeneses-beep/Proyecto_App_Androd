import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const tenantMiddleware: RequestHandler = (req, _res, next) => {
  const publicPaths = ['/health', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.includes(req.path)) return next();

  const headerTenantId = req.header('x-tenant-id')?.trim();
  const authenticatedTenantId = req.authTenantId;

  // For authenticated API resources, the JWT tenant is authoritative.
  if (authenticatedTenantId) {
    if (headerTenantId && headerTenantId !== authenticatedTenantId) {
      next(new AppError(403, 'El tenant solicitado no coincide con el tenant autenticado.'));
      return;
    }

    req.tenantId = authenticatedTenantId;
    req.tenantContext = { tenantId: authenticatedTenantId };
    next();
    return;
  }

  // Never allow an unauthenticated request to establish a tenant context.
  next(new AppError(401, 'Autenticación y tenant asociado requeridos.'));
};
