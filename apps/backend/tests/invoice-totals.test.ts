import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals } from '../src/modules/sales/sales.service.js';

describe('calculateInvoiceTotals', () => {
  it('interpreta 0.16 como 16 por ciento', () => {
    expect(calculateInvoiceTotals([{ quantity: 2, unitPrice: 500, taxRate: 0.16 }])).toEqual({
      subtotal: 1000,
      impuestos: 160,
      total: 1160
    });
  });

  it('redondea importes monetarios a dos decimales', () => {
    expect(calculateInvoiceTotals([{ quantity: 3, unitPrice: 19.99, taxRate: 0.16 }])).toEqual({
      subtotal: 59.97,
      impuestos: 9.6,
      total: 69.57
    });
  });
});
