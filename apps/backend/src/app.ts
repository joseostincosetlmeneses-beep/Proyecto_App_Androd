import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import { authMiddleware } from './core/middlewares/auth.middleware.js';
import { tenantMiddleware } from './core/middlewares/tenant.middleware.js';
import { auditMiddleware } from './core/middlewares/audit.middleware.js';
import salesRoutes from './modules/sales/sales.routes.js';
import { AppError } from './core/errors/app-error.js';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      callback(new AppError(403, 'Origen no permitido por CORS'));
    }
  }));
  app.use(express.json());

  // Endpoint de salud del sistema
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'erp-backend',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Middlewares globales de seguridad y contexto
  app.use(authMiddleware);
  app.use(tenantMiddleware);
  app.use(auditMiddleware);

  // Módulos de la API
  app.use('/api/auth', authRoutes);
  app.use('/api/sales', salesRoutes);

  // Manejador global centralizado de errores
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        details: error.details
      });
      return;
    }

    // Manejo de errores no capturados
    console.error('[Unhandled Error]:', error);
    res.status(500).json({
      success: false,
      error: env.NODE_ENV === 'production' ? 'Error interno del servidor' : error instanceof Error ? error.message : 'Error interno del servidor'
    });
  };

  app.use(errorHandler);
  return app;
}

