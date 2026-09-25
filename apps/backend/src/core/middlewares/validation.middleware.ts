import type { RequestHandler } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error.js';

interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationOptions): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if ((error as ZodError).name === 'ZodError') {
        const zodError = error as ZodError;
        const details = zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        next(new ValidationError('Error de validación en la solicitud', details));
        return;
      }
      next(error);
    }
  };
}
