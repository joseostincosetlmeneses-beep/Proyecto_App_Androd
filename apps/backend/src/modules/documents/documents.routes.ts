import { Router } from 'express';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { TenantModel } from '../auth/tenant.model.js';
import { InvoiceModel } from '../sales/invoice.model.js';
import { streamTenantPdf, streamTenantWorkbook } from '../exports/export.service.js';

const router: Router = Router();

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

router.get('/export.:format', async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) throw new AppError(401, 'Enlace de exportación inválido.');
    const format = req.params.format;
    const payload = jwt.verify(token, env.JWT_SECRET) as { scope?: string; tenantId?: string; format?: string };
    if (payload.scope !== 'tenant-export' || !payload.tenantId || payload.format !== format || !['pdf', 'xlsx'].includes(format)) {
      throw new AppError(403, 'El enlace no autoriza esta exportación.');
    }
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Cache-Control', 'private, no-store');
    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="orbit-erp-${date}.xlsx"`);
      await streamTenantWorkbook(payload.tenantId, res);
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="orbit-erp-${date}.pdf"`);
    await streamTenantPdf(payload.tenantId, res);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) return next(new AppError(401, 'El enlace de exportación venció o no es válido.'));
    next(error);
  }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) throw new AppError(401, 'Enlace de documento inválido.');

    const payload = jwt.verify(token, env.JWT_SECRET) as {
      scope?: string;
      invoiceId?: string;
      tenantId?: string;
    };
    if (payload.scope !== 'invoice-document' || payload.invoiceId !== req.params.id || !payload.tenantId) {
      throw new AppError(403, 'El enlace no autoriza este documento.');
    }

    const [invoice, tenant] = await Promise.all([
      InvoiceModel.findOne({ _id: req.params.id, tenantId: payload.tenantId }).lean(),
      TenantModel.findById(payload.tenantId).lean()
    ]);
    if (!invoice) throw new AppError(404, 'Factura no encontrada.');

    const safeNumber = invoice.number.replace(/[^a-zA-Z0-9_-]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura-${safeNumber}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Factura ${invoice.number}`, Author: 'Orbit ERP' } });
    doc.pipe(res);

    doc.fillColor('#1557C8').fontSize(25).text('ORBIT ERP');
    doc.fillColor('#52617A').fontSize(10).text(tenant?.name ?? 'Empresa');
    doc.moveDown(1.5);
    doc.fillColor('#111827').fontSize(20).text(`Factura ${invoice.number}`);
    doc.fontSize(10).fillColor('#52617A').text(`Fecha: ${new Date(invoice.issuedAt).toLocaleDateString('es-MX')}`);
    doc.text(`Estado: ${invoice.status === 'paid' ? 'Pagada' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}`);
    doc.moveDown();
    doc.fillColor('#111827').fontSize(12).text('Cliente', { underline: true });
    doc.fontSize(10).text(invoice.customer.name);
    if (invoice.customer.taxId) doc.text(`RFC/ID fiscal: ${invoice.customer.taxId}`);
    doc.moveDown(1.5);

    const startX = 50;
    const widths = [250, 65, 90, 90];
    const headers = ['Concepto', 'Cantidad', 'Precio', 'Importe'];
    let y = doc.y;
    doc.rect(startX, y, 495, 24).fill('#1557C8');
    doc.fillColor('#FFFFFF').fontSize(9);
    let x = startX + 7;
    headers.forEach((header, index) => {
      doc.text(header, x, y + 7, { width: widths[index], align: index > 0 ? 'right' : 'left' });
      x += widths[index] ?? 0;
    });
    y += 28;

    for (const item of invoice.items) {
      if (y > 700) { doc.addPage(); y = 50; }
      x = startX + 7;
      const amount = item.quantity * item.unitPrice * (1 + item.taxRate);
      const cells = [item.description, String(item.quantity), currency.format(item.unitPrice), currency.format(amount)];
      doc.fillColor('#111827').fontSize(9);
      cells.forEach((cell, index) => {
        doc.text(cell, x, y, { width: widths[index], align: index > 0 ? 'right' : 'left' });
        x += widths[index] ?? 0;
      });
      y += 22;
      doc.moveTo(startX, y - 5).lineTo(545, y - 5).strokeColor('#D8DFEA').stroke();
    }

    doc.y = y + 8;
    doc.fillColor('#52617A').fontSize(10).text(`Subtotal: ${currency.format(invoice.subtotal)}`, { align: 'right' });
    doc.text(`Impuestos: ${currency.format(invoice.impuestos)}`, { align: 'right' });
    doc.fillColor('#111827').fontSize(14).text(`Total: ${currency.format(invoice.total)}`, { align: 'right' });
    doc.moveDown(2);
    doc.fillColor('#52617A').fontSize(8).text('Documento generado por Orbit ERP.', { align: 'center' });
    doc.end();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'El enlace del documento venció o no es válido.'));
      return;
    }
    next(error);
  }
});

export default router;
