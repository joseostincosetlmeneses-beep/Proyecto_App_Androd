import { describe, expect, it } from 'vitest';
import { sampleCustomers, sampleProducts } from '../src/modules/setup/sample-data.service.js';

describe('Catálogo de datos iniciales', () => {
  it('contiene 1,000 productos únicos', () => {
    expect(sampleProducts).toHaveLength(1_000);
    expect(new Set(sampleProducts.map((product) => product.sku)).size).toBe(1_000);
    expect(new Set(sampleProducts.map((product) => product.barcode)).size).toBe(1_000);
  });

  it('contiene 1,000 clientes únicos', () => {
    expect(sampleCustomers).toHaveLength(1_000);
    expect(sampleCustomers.every((contact) => contact.type === 'Cliente')).toBe(true);
    expect(new Set(sampleCustomers.map((contact) => contact.email)).size).toBe(1_000);
  });
});
