import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
export const tenantMiddleware:RequestHandler=(req,res,next)=>{ const tenantId=req.tenantId??req.header('x-tenant-id'); if(!tenantId){ next(new AppError(400,'Tenant requerido')); return; } req.tenantId=tenantId; req.tenantContext={tenantId}; next(); };
