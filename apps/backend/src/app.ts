import express,{type ErrorRequestHandler,type Express} from 'express';
import cors from 'cors';
import { authMiddleware } from './core/middlewares/auth.middleware.js';
import { tenantMiddleware } from './core/middlewares/tenant.middleware.js';
import { auditMiddleware } from './core/middlewares/audit.middleware.js';
import salesRoutes from './modules/sales/sales.routes.js';
import { AppError } from './core/errors/app-error.js';
export function createApp():Express{ const app=express(); app.use(cors()); app.use(express.json()); app.get('/health',(_req,res)=>res.json({success:true,data:{status:'ok'}})); app.use(authMiddleware); app.use(tenantMiddleware); app.use(auditMiddleware); app.use('/api/sales',salesRoutes); const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{ const status=error instanceof AppError?error.statusCode:500; res.status(status).json({success:false,error:error instanceof Error?error.message:'Error interno'}); }; app.use(errorHandler); return app; }
