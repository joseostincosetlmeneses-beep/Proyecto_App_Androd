import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authMiddleware } from '../src/core/middlewares/auth.middleware.js';
import { tenantMiddleware } from '../src/core/middlewares/tenant.middleware.js';

function mockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
}

describe('security middlewares', () => {
  it('rejects protected requests without a bearer token', () => {
    const req = { path: '/api/sales/invoices', header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

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
});
