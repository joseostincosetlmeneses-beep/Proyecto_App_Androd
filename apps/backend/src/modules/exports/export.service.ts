import type { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { TenantModel } from '../auth/tenant.model.js';
import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { InvoiceModel } from '../sales/invoice.model.js';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

async function getExportData(tenantId: string) {
  const [tenant, products, balances, contacts, invoices] = await Promise.all([
    TenantModel.findById(tenantId).lean(),
    ProductModel.find({ tenantId }).sort({ name: 1 }).lean(),
    StockBalanceModel.find({ tenantId }).lean(),
    ContactModel.find({ tenantId }).sort({ name: 1 }).lean(),
    InvoiceModel.find({ tenantId }).sort({ issuedAt: -1 }).lean()
  ]);
  const stock = new Map(balances.map((balance) => [String(balance.productId), balance.currentStock]));
  return {
    company: tenant?.name ?? 'Empresa',
    products: products.map((product) => ({ ...product, currentStock: stock.get(String(product._id)) ?? 0 })),
    contacts,
    invoices
  };
}

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1557C8' } };
  sheet.getRow(1).alignment = { vertical: 'middle' };
  sheet.columns.forEach((column) => { column.width = Math.min(34, Math.max(12, Number(column.header?.toString().length ?? 10) + 4)); });
}

export async function streamTenantWorkbook(tenantId: string, res: Response) {
  const data = await getExportData(tenantId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Orbit ERP';
  workbook.created = new Date();
  const summary = workbook.addWorksheet('Resumen');
  summary.addRows([
    ['Orbit ERP - Exportación de datos', data.company],
    ['Fecha de exportación', new Date()],
    ['Productos', data.products.length],
    ['Contactos', data.contacts.length],
    ['Facturas', data.invoices.length],
    ['Ventas no canceladas', data.invoices.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + item.total, 0)]
  ]);
  summary.getColumn(1).font = { bold: true };
  summary.getColumn(1).width = 30; summary.getColumn(2).width = 34;
  summary.getCell('B2').numFmt = 'dd/mm/yyyy hh:mm'; summary.getCell('B6').numFmt = '$#,##0.00';

  const productSheet = workbook.addWorksheet('Productos');
  productSheet.columns = [
    { header: 'SKU', key: 'sku' }, { header: 'Código de barras', key: 'barcode' }, { header: 'Producto', key: 'name' },
    { header: 'Costo', key: 'costo' }, { header: 'Precio', key: 'precio' }, { header: 'Stock mínimo', key: 'stockMinimo' }, { header: 'Existencia', key: 'currentStock' }
  ];
  productSheet.addRows(data.products);
  productSheet.getColumn('costo').numFmt = '$#,##0.00'; productSheet.getColumn('precio').numFmt = '$#,##0.00'; styleSheet(productSheet);

  const contactSheet = workbook.addWorksheet('Contactos');
  contactSheet.columns = [
    { header: 'Nombre', key: 'name' }, { header: 'Tipo', key: 'type' }, { header: 'RFC / ID fiscal', key: 'taxId' },
    { header: 'Correo', key: 'email' }, { header: 'Teléfono', key: 'phone' }
  ];
  contactSheet.addRows(data.contacts); styleSheet(contactSheet);

  const invoiceSheet = workbook.addWorksheet('Facturas');
  invoiceSheet.columns = [
    { header: 'Folio', key: 'number' }, { header: 'Fecha', key: 'issuedAt' }, { header: 'Cliente', key: 'customer' },
    { header: 'Estado', key: 'status' }, { header: 'Subtotal', key: 'subtotal' }, { header: 'Impuestos', key: 'impuestos' }, { header: 'Total', key: 'total' }
  ];
  invoiceSheet.addRows(data.invoices.map((invoice) => ({ ...invoice, customer: invoice.customer.name, status: invoice.status ?? 'pending' })));
  invoiceSheet.getColumn('issuedAt').numFmt = 'dd/mm/yyyy';
  ['subtotal', 'impuestos', 'total'].forEach((column) => { invoiceSheet.getColumn(column).numFmt = '$#,##0.00'; });
  styleSheet(invoiceSheet);

  await workbook.xlsx.write(res);
  res.end();
}

export async function streamTenantPdf(tenantId: string, res: Response) {
  const data = await getExportData(tenantId);
  const doc = new PDFDocument({ size: 'A4', margin: 44, info: { Title: `Reporte Orbit ERP - ${data.company}`, Author: 'Orbit ERP' } });
  doc.pipe(res);
  const ensureSpace = (height = 50) => { if (doc.y + height > 770) doc.addPage(); };
  const title = (value: string) => { ensureSpace(45); doc.moveDown().fillColor('#1557C8').fontSize(15).text(value); doc.moveDown(0.4); };
  const line = (columns: string[], widths: number[], header = false) => {
    ensureSpace(24);
    const y = doc.y;
    let x = 44;
    if (header) doc.rect(44, y - 4, 507, 20).fill('#1557C8');
    doc.fillColor(header ? '#FFFFFF' : '#111827').fontSize(8);
    columns.forEach((value, index) => { doc.text(value, x + 4, y, { width: (widths[index] ?? 80) - 8, ellipsis: true }); x += widths[index] ?? 80; });
    doc.y = y + 20;
    if (!header) doc.moveTo(44, doc.y - 3).lineTo(551, doc.y - 3).strokeColor('#D8DFEA').stroke();
  };

  doc.fillColor('#1557C8').fontSize(24).text('ORBIT ERP');
  doc.fillColor('#111827').fontSize(18).text(data.company);
  doc.fillColor('#52617A').fontSize(9).text(`Exportación generada el ${new Date().toLocaleString('es-MX')}`);
  title('Resumen');
  doc.fillColor('#111827').fontSize(10).text(`Productos: ${data.products.length}   Contactos: ${data.contacts.length}   Facturas: ${data.invoices.length}`);
  doc.text(`Ventas no canceladas: ${currency.format(data.invoices.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + item.total, 0))}`);

  title('Productos e inventario');
  line(['SKU', 'Producto', 'Existencia', 'Precio'], [100, 227, 80, 100], true);
  data.products.forEach((product) => line([product.sku, product.name, String(product.currentStock), currency.format(product.precio)], [100, 227, 80, 100]));

  title('Contactos');
  line(['Nombre', 'Tipo', 'Correo', 'Teléfono'], [170, 75, 172, 90], true);
  data.contacts.forEach((contact) => line([contact.name, contact.type ?? 'Cliente', contact.email ?? '', contact.phone ?? ''], [170, 75, 172, 90]));

  title('Facturas');
  line(['Folio', 'Fecha', 'Cliente', 'Estado', 'Total'], [95, 72, 165, 75, 100], true);
  data.invoices.forEach((invoice) => line([
    invoice.number,
    new Date(invoice.issuedAt).toLocaleDateString('es-MX'),
    invoice.customer.name,
    invoice.status === 'paid' ? 'Pagada' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendiente',
    currency.format(invoice.total)
  ], [95, 72, 165, 75, 100]));
  doc.end();
}
