import { describe, expect, it } from 'vitest';
import { CreateContactInputSchema, CreateInvoiceInputSchema, CreateProductInputSchema, PaginationQuerySchema, StockAdjustmentInputSchema } from '@erp/contracts';

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
    if (result.success) {
      expect(result.data).not.toHaveProperty('total');
      expect(result.data.items[0]).not.toHaveProperty('unitPrice');
      expect(result.data.items[0]).not.toHaveProperty('description');
    }
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

  it('valida los datos operativos de productos y contactos', () => {
    expect(CreateProductInputSchema.safeParse({
      sku: 'SKU-1', barcode: '750000000001', name: 'Producto', imageUrl: 'https://cdn.example.com/producto.jpg', costo: 10, precio: 15, stockMinimo: 2, initialStock: 5
    }).success).toBe(true);
    expect(CreateProductInputSchema.safeParse({
      sku: 'SKU-2', barcode: '750000000002', name: 'Producto', imageUrl: 'javascript:alert(1)', costo: 10, precio: 15, stockMinimo: 2, initialStock: 5
    }).success).toBe(false);
    expect(CreateContactInputSchema.safeParse({ name: 'Cliente Uno', type: 'Cliente', email: 'cliente@example.com' }).success).toBe(true);
    expect(StockAdjustmentInputSchema.safeParse({ quantity: 0, reason: 'Conteo físico' }).success).toBe(false);
  });
});
