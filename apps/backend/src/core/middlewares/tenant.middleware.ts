import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const tenantMiddleware: RequestHandler = (req, _res, next) => {
  const publicPaths = ['/health', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.includes(req.path)) return next();

  const headerTenantId = req.header('x-tenant-id')?.trim();
  const authenticatedTenantId = req.authTenantId;

  // A tenant from the JWT is authoritative. A client-supplied tenant header may
  // only repeat that tenant; it can never switch the authenticated context.
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

  // Keep the header path only for non-authenticated flows that explicitly need
  // a tenant context (for example future public onboarding endpoints).
  if (!headerTenantId) {
    next(new AppError(401, 'Tenant requerido. Se necesita un token asociado a un tenant.'));
    return;
  }

  next(new AppError(401, 'No existe un tenant autenticado para este recurso.'));
};
