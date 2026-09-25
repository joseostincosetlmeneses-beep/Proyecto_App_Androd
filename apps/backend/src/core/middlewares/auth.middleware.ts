import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';

export const authMiddleware: RequestHandler = (req, res, next) => {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/health', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.header('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Autenticación requerida. Proporcione un token Bearer válido.'
    });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub?: string;
      roles?: string[];
      tenantId?: string;
    };

    if (!payload.sub) {
      res.status(401).json({ success: false, error: 'Token inválido: identificador de usuario faltante.' });
      return;
    }

    req.user = {
      id: payload.sub,
      roles: payload.roles ?? []
    };

    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }

    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido o expirado.' });
  }
};

export function requireRoles(...requiredRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'No autenticado'));
    }
    const hasRole = req.user.roles.some((role) => requiredRoles.includes(role));
    if (!hasRole) {
      return next(new AppError(403, `Permiso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`));
    }
    next();
  };
}
