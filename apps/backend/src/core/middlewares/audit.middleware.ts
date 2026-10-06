import type { RequestHandler } from 'express';
import { AuditLogModel } from '../../modules/audit/audit.model.js';

export function sanitizeAuditChanges(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditChanges);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|token|secret|authorization/i.test(key) ? '[REDACTED]' : sanitizeAuditChanges(item)]));
}

export const auditMiddleware: RequestHandler = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) { next(); return; }
  res.on('finish', () => {
    if (!req.tenantId) return;
    void AuditLogModel.create({ tenantId: req.tenantId, userId: req.user?.id ?? 'anonymous', action: req.method, resource: req.originalUrl, ip: req.ip, timestamp: new Date(), statusCode: res.statusCode, changes: sanitizeAuditChanges(req.body) });
  });
  next();
};
