import type { User } from '@erp/contracts';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      /** Tenant proveniente del JWT. Nunca debe ser sustituido por un header. */
      authTenantId?: string;
      tenantContext?: { tenantId: string };
      user?: Pick<User, 'id' | 'roles'>;
    }
  }
}

export {};
