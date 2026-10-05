import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { InvoiceModel } from '../sales/invoice.model.js';
import { createInvoice, updateInvoiceStatus } from '../sales/sales.service.js';

type SampleProduct = {
  sku: string;
  barcode: string;
  name: string;
  costo: number;
  precio: number;
  stockMinimo: number;
  initialStock: number;
};

type SampleContact = {
  name: string;
  type: 'Cliente' | 'Proveedor';
  taxId: string;
  email: string;
  phone: string;
};

const featuredProducts: SampleProduct[] = [
  { sku: 'ORB-LAP-14', barcode: '750100000001', name: 'Laptop Pro 14', costo: 18500, precio: 24990, stockMinimo: 5, initialStock: 28 },
  { sku: 'ORB-MON-24', barcode: '750100000002', name: 'Monitor 24 IPS', costo: 3150, precio: 4890, stockMinimo: 6, initialStock: 12 },
  { sku: 'ORB-TEC-WL', barcode: '750100000003', name: 'Teclado inalámbrico', costo: 710, precio: 1290, stockMinimo: 10, initialStock: 40 },
  { sku: 'ORB-DOC-USC', barcode: '750100000004', name: 'Dock USB-C', costo: 1420, precio: 2150, stockMinimo: 4, initialStock: 8 },
  { sku: 'ORB-MOU-ERG', barcode: '750100000005', name: 'Mouse ergonómico', costo: 520, precio: 980, stockMinimo: 8, initialStock: 24 }
];

const categories = ['Accesorios', 'Cómputo', 'Oficina', 'Redes', 'Almacenamiento', 'Audio', 'Energía', 'Movilidad'];
const generatedProducts: SampleProduct[] = Array.from({ length: 995 }, (_, offset) => {
  const index = offset + 6;
  const costo = Math.round((100 + (index % 80) * 37.5) * 100) / 100;
  return {
    sku: `ORB-${String(index).padStart(4, '0')}`,
    barcode: `750200${String(index).padStart(6, '0')}`,
    name: `Producto ${String(index).padStart(4, '0')} · ${categories[index % categories.length]}`,
    costo,
    precio: Math.round(costo * 1.45 * 100) / 100,
    stockMinimo: 2 + (index % 12),
    initialStock: 10 + (index % 90)
  };
});
const products = [...featuredProducts, ...generatedProducts];
const productSampleBySku = new Map(products.map((product) => [product.sku, product]));

const featuredCustomers: SampleContact[] = [
  { name: 'Distribuidora Nova', type: 'Cliente', taxId: 'DNO260101AA1', email: 'compras@nova.example', phone: '55 1000 2001' },
  { name: 'Comercial Delta', type: 'Cliente', taxId: 'CDE260101BB2', email: 'ventas@delta.example', phone: '55 1000 2002' },
  { name: 'Tecnología Norte', type: 'Cliente', taxId: 'TNO260101CC3', email: 'contacto@norte.example', phone: '81 1000 2003' }
];
const generatedCustomers: SampleContact[] = Array.from({ length: 997 }, (_, offset) => {
  const index = offset + 4;
  const serial = String(index).padStart(4, '0');
  return {
    name: `Cliente ${serial}`,
    type: 'Cliente',
    taxId: `CLI${String(index).padStart(6, '0')}MX`,
    email: `cliente${serial}@orbit-demo.example`,
    phone: `55 ${String(2000 + (index % 8000)).padStart(4, '0')} ${String(1000 + (index % 9000)).padStart(4, '0')}`
  };
});
const customers = [...featuredCustomers, ...generatedCustomers];
const suppliers: SampleContact[] = [
  { name: 'Suministros Órbita', type: 'Proveedor', taxId: 'SOR260101DD4', email: 'pedidos@orbita.example', phone: '33 1000 2004' }
];
const contacts = [...customers, ...suppliers];

export const sampleProducts = products;
export const sampleCustomers = customers;

export async function seedSampleData(tenantId: string) {
  await ProductModel.bulkWrite(products.map((product) => ({
    updateOne: {
      filter: { tenantId, sku: product.sku },
      update: { $setOnInsert: { tenantId, sku: product.sku, barcode: product.barcode, name: product.name, costo: product.costo, precio: product.precio, stockMinimo: product.stockMinimo } },
      upsert: true
    }
  })), { ordered: false });

  const savedProducts = await ProductModel.find({ tenantId, sku: { $in: products.map((item) => item.sku) } }).lean();
  const productBySku = new Map(savedProducts.map((product) => [product.sku, product]));
  const productIds = savedProducts.map((product) => String(product._id));
  const existingBalances = await StockBalanceModel.find({ tenantId, productId: { $in: productIds } }).select('productId').lean();
  const existingBalanceIds = new Set(existingBalances.map((balance) => balance.productId));

  await StockBalanceModel.bulkWrite(savedProducts.map((product) => {
    const sample = productSampleBySku.get(product.sku);
    if (!sample) throw new Error(`Producto inicial no encontrado: ${product.sku}`);
    return {
      updateOne: {
        filter: { tenantId, productId: String(product._id) },
        update: { $setOnInsert: { tenantId, productId: String(product._id), currentStock: sample.initialStock } },
        upsert: true
      }
    };
  }), { ordered: false });

  const newMovements = savedProducts.flatMap((product) => {
    const productId = String(product._id);
    if (existingBalanceIds.has(productId)) return [];
    const sample = productSampleBySku.get(product.sku);
    return sample ? [{ tenantId, productId, type: 'ENTRADA', quantity: sample.initialStock, referenceId: 'DATOS-INICIALES', occurredAt: new Date() }] : [];
  });
  if (newMovements.length > 0) await StockMovementModel.insertMany(newMovements, { ordered: false });

  await ContactModel.bulkWrite(contacts.map((contact) => ({
    updateOne: {
      filter: { tenantId, email: contact.email },
      update: { $setOnInsert: { ...contact, tenantId } },
      upsert: true
    }
  })), { ordered: false });

  const savedContacts = await ContactModel.find({ tenantId, email: { $in: contacts.map((item) => item.email) } }).lean();
  const clientByEmail = new Map(savedContacts.map((contact) => [contact.email, contact]));
  const month = new Date().toISOString().slice(0, 7).replace('-', '');
  const invoices = [
    { number: `DEMO-${month}-001`, customerEmail: 'compras@nova.example', items: [{ sku: 'ORB-MON-24', quantity: 2 }, { sku: 'ORB-MOU-ERG', quantity: 3 }], paid: true },
    { number: `DEMO-${month}-002`, customerEmail: 'ventas@delta.example', items: [{ sku: 'ORB-LAP-14', quantity: 1 }, { sku: 'ORB-DOC-USC', quantity: 1 }], paid: false }
  ];

  for (const sample of invoices) {
    if (await InvoiceModel.exists({ tenantId, number: sample.number })) continue;
    const customer = clientByEmail.get(sample.customerEmail);
    if (!customer) continue;
    const invoice = await createInvoice({
      tenantId,
      number: sample.number,
      customer: { id: String(customer._id), name: customer.name, taxId: customer.taxId },
      items: sample.items.map((item) => {
        const product = productBySku.get(item.sku);
        if (!product) throw new Error(`Producto inicial no encontrado: ${item.sku}`);
        return { productId: String(product._id), sku: product.sku, quantity: item.quantity, taxRate: 0.16 };
      }),
      issuedAt: new Date()
    });
    if (sample.paid) await updateInvoiceStatus(tenantId, String(invoice.id), 'paid');
  }

  const [productCount, contactCount, customerCount, invoiceCount] = await Promise.all([
    ProductModel.countDocuments({ tenantId }),
    ContactModel.countDocuments({ tenantId }),
    ContactModel.countDocuments({ tenantId, type: 'Cliente' }),
    InvoiceModel.countDocuments({ tenantId })
  ]);
  return { products: productCount, contacts: contactCount, customers: customerCount, invoices: invoiceCount };
}
