import type { RequestHandler } from 'express';
import { AuditLogModel } from '../../modules/audit/audit.model.js';
export const auditMiddleware:RequestHandler=(req,res,next)=>{ if(!['POST','PUT','PATCH','DELETE'].includes(req.method)){next();return;} res.on('finish',()=>{ if(!req.tenantId)return; void AuditLogModel.create({tenantId:req.tenantId,userId:req.user?.id??'anonymous',action:req.method,resource:req.originalUrl,ip:req.ip,timestamp:new Date(),statusCode:res.statusCode,changes:req.body}); }); next(); };
