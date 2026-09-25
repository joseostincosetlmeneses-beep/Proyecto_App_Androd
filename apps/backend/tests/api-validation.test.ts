import { describe, expect, it } from 'vitest';
import { CreateInvoiceInputSchema, PaginationQuerySchema } from '@erp/contracts';

describe('Contracts & Validation Schemas', () => {
  it('PaginationQuerySchema asigna valores por defecto válidos', () => {
    const result = PaginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('PaginationQuerySchema rechaza límites superiores a 100', () => {
    const result = PaginationQuerySchema.safeParse({ limit: 150 });
    expect(result.success).toBe(false);
  });

  it('CreateInvoiceInputSchema valida correctamente una factura completa', () => {
    const validInvoice = {
      number: 'INV-2026-001',
      customer: {
        id: 'cust-1',
        name: 'Cliente Prueba S.A.',
        taxId: 'RFC123456789'
      },
      items: [
        {
          productId: 'prod-1',
          sku: 'SKU-001',
          description: 'Servicio de Consultoría',
          quantity: 2,
          unitPrice: 500,
          taxRate: 0.16
        }
      ],
      subtotal: 1000,
      impuestos: 160,
      total: 1160,
      issuedAt: new Date()
    };

    const result = CreateInvoiceInputSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('CreateInvoiceInputSchema rechaza facturas sin items', () => {
    const invalidInvoice = {
      number: 'INV-2026-002',
      customer: { id: 'cust-1', name: 'Cliente' },
      items: [],
      subtotal: 0,
      impuestos: 0,
      total: 0,
      issuedAt: new Date()
    };

    const result = CreateInvoiceInputSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
  });
});
