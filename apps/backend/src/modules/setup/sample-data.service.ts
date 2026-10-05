import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { InvoiceModel } from '../sales/invoice.model.js';
import { createInvoice, updateInvoiceStatus } from '../sales/sales.service.js';

const products = [
  { sku: 'ORB-LAP-14', barcode: '750100000001', name: 'Laptop Pro 14', costo: 18500, precio: 24990, stockMinimo: 5, initialStock: 28 },
  { sku: 'ORB-MON-24', barcode: '750100000002', name: 'Monitor 24 IPS', costo: 3150, precio: 4890, stockMinimo: 6, initialStock: 12 },
  { sku: 'ORB-TEC-WL', barcode: '750100000003', name: 'Teclado inalámbrico', costo: 710, precio: 1290, stockMinimo: 10, initialStock: 40 },
  { sku: 'ORB-DOC-USC', barcode: '750100000004', name: 'Dock USB-C', costo: 1420, precio: 2150, stockMinimo: 4, initialStock: 8 },
  { sku: 'ORB-MOU-ERG', barcode: '750100000005', name: 'Mouse ergonómico', costo: 520, precio: 980, stockMinimo: 8, initialStock: 24 }
] as const;

const contacts = [
  { name: 'Distribuidora Nova', type: 'Cliente', taxId: 'DNO260101AA1', email: 'compras@nova.example', phone: '55 1000 2001' },
  { name: 'Comercial Delta', type: 'Cliente', taxId: 'CDE260101BB2', email: 'ventas@delta.example', phone: '55 1000 2002' },
  { name: 'Tecnología Norte', type: 'Cliente', taxId: 'TNO260101CC3', email: 'contacto@norte.example', phone: '81 1000 2003' },
  { name: 'Suministros Órbita', type: 'Proveedor', taxId: 'SOR260101DD4', email: 'pedidos@orbita.example', phone: '33 1000 2004' }
] as const;

export async function seedSampleData(tenantId: string) {
  for (const product of products) {
    const saved = await ProductModel.findOneAndUpdate(
      { tenantId, sku: product.sku },
      { $setOnInsert: { tenantId, sku: product.sku, barcode: product.barcode, name: product.name, costo: product.costo, precio: product.precio, stockMinimo: product.stockMinimo } },
      { new: true, upsert: true, runValidators: true }
    );
    const balance = await StockBalanceModel.findOneAndUpdate(
      { tenantId, productId: saved.id },
      { $setOnInsert: { tenantId, productId: saved.id, currentStock: product.initialStock } },
      { new: true, upsert: true }
    );
    const movementExists = await StockMovementModel.exists({ tenantId, productId: saved.id, referenceId: 'DATOS-INICIALES' });
    if (!movementExists && balance.currentStock === product.initialStock) {
      await StockMovementModel.create({ tenantId, productId: saved.id, type: 'ENTRADA', quantity: product.initialStock, referenceId: 'DATOS-INICIALES', occurredAt: new Date() });
    }
  }

  for (const contact of contacts) {
    await ContactModel.updateOne(
      { tenantId, email: contact.email },
      { $setOnInsert: { ...contact, tenantId } },
      { upsert: true, runValidators: true }
    );
  }

  const savedProducts = await ProductModel.find({ tenantId, sku: { $in: products.map((item) => item.sku) } }).lean();
  const productBySku = new Map(savedProducts.map((product) => [product.sku, product]));
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

  const [productCount, contactCount, invoiceCount] = await Promise.all([
    ProductModel.countDocuments({ tenantId }), ContactModel.countDocuments({ tenantId }), InvoiceModel.countDocuments({ tenantId })
  ]);
  return { products: productCount, contacts: contactCount, invoices: invoiceCount };
}
