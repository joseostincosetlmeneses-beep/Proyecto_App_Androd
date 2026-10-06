import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { tenantMiddleware } from '../src/core/middlewares/tenant.middleware.js';
import { sanitizeAuditChanges } from '../src/core/middlewares/audit.middleware.js';

function mockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
}

describe('security middlewares', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects tenant header switching when JWT tenant is authenticated', () => {
    const req = {
      path: '/api/sales/invoices',
      header: vi.fn((name: string) => name.toLowerCase() === 'x-tenant-id' ? 'tenant-b' : undefined),
      authTenantId: 'tenant-a'
    } as unknown as Request;
    const next = vi.fn();

    tenantMiddleware(req, mockResponse(), next);

    const error = next.mock.calls[0]?.[0];
    expect(error?.statusCode).toBe(403);
  });

  it('uses the authenticated JWT tenant when the header is omitted', () => {
    const req = {
      path: '/api/sales/invoices',
      header: vi.fn().mockReturnValue(undefined),
      authTenantId: 'tenant-a'
    } as unknown as Request;
    const next = vi.fn();

    tenantMiddleware(req, mockResponse(), next);

    expect(req.tenantId).toBe('tenant-a');
    expect(req.tenantContext).toEqual({ tenantId: 'tenant-a' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects requests that have no authenticated tenant', () => {
    const req = {
      path: '/api/sales/invoices',
      header: vi.fn().mockReturnValue('tenant-a')
    } as unknown as Request;
    const next = vi.fn();

    tenantMiddleware(req, mockResponse(), next);

    const error = next.mock.calls[0]?.[0];
    expect(error?.statusCode).toBe(401);
  });

  it('redacts credentials from audit changes', () => {
    expect(sanitizeAuditChanges({ name: 'Ana', password: 'super-secret', nested: { apiToken: 'token', amount: 20 } })).toEqual({
      name: 'Ana', password: '[REDACTED]', nested: { apiToken: '[REDACTED]', amount: 20 }
    });
  });
});
