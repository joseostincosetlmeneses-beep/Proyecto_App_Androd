import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import { authMiddleware } from './core/middlewares/auth.middleware.js';
import { tenantMiddleware } from './core/middlewares/tenant.middleware.js';
import { auditMiddleware } from './core/middlewares/audit.middleware.js';
import salesRoutes from './modules/sales/sales.routes.js';
import { AppError } from './core/errors/app-error.js';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import documentsRoutes from './modules/documents/documents.routes.js';
import setupRoutes from './modules/setup/setup.routes.js';
import exportRoutes from './modules/exports/export.routes.js';
import storeRoutes from './modules/store/store.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      callback(new AppError(403, 'Origen no permitido por CORS'));
    }
  }));
  // Product photos are uploaded as bounded base64 payloads and stored with the tenant catalog.
  app.use(express.json({ limit: '2mb' }));

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

  // Los documentos usan enlaces firmados, breves y de un solo recurso.
  app.use('/api/documents', documentsRoutes);
  app.use('/api/store', storeRoutes);

  // Middlewares globales de seguridad y contexto
  app.use(authMiddleware);
  app.use(tenantMiddleware);
  app.use(auditMiddleware);

  // Módulos de la API
  app.use('/api/auth', authRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/setup', setupRoutes);
  app.use('/api/exports', exportRoutes);

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

