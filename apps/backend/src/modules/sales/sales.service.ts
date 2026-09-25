import { InvoiceSchema, JournalEntrySchema, type PaginationQuery } from '@erp/contracts';
import { withTransaction } from '../../core/database/transaction.helper.js';
import { ValidationError, NotFoundError } from '../../core/errors/app-error.js';
import { InvoiceModel } from './invoice.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { JournalEntryModel } from '../accounting/journal.model.js';
import type mongoose from 'mongoose';

export async function createInvoice(input: unknown) {
  const parsed = InvoiceSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message
    }));
    throw new ValidationError('Datos de factura inválidos', details);
  }

  const invoice = parsed.data;
  const debit = invoice.total;
  const lines = [
    { accountId: 'accounts-receivable', debit, credit: 0 },
    { accountId: 'sales', debit: 0, credit: invoice.subtotal },
    { accountId: 'taxes-payable', debit: 0, credit: invoice.impuestos }
  ];

  const journal = JournalEntrySchema.safeParse({
    tenantId: invoice.tenantId,
    fecha: invoice.issuedAt,
    glosa: `Factura ${invoice.number}`,
    lines
  });

  if (!journal.success) {
    const details = journal.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message
    }));
    throw new ValidationError('El asiento de la factura no cuadra', details);
  }

  return withTransaction(async (session: mongoose.ClientSession) => {
    const [saved] = await InvoiceModel.create([invoice], { session });

    await StockMovementModel.insertMany(
      invoice.items.map((item) => ({
        tenantId: invoice.tenantId,
        productId: item.productId,
        type: 'SALIDA',
        quantity: item.quantity,
        referenceId: invoice.number,
        occurredAt: invoice.issuedAt
      })),
      { session }
    );

    await JournalEntryModel.create([journal.data], { session });

    return saved;
  });
}

export async function listInvoices(tenantId: string, options: PaginationQuery) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { tenantId };

  if (options.search) {
    filter.$or = [
      { number: { $regex: options.search, $options: 'i' } },
      { 'customer.name': { $regex: options.search, $options: 'i' } }
    ];
  }

  const sortField = options.sortBy || 'issuedAt';
  const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

  const [invoices, total] = await Promise.all([
    InvoiceModel.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
    InvoiceModel.countDocuments(filter)
  ]);

  return {
    items: invoices,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getInvoiceById(tenantId: string, id: string) {
  const invoice = await InvoiceModel.findOne({ _id: id, tenantId }).lean();
  if (!invoice) {
    throw new NotFoundError(`Factura con id '${id}' no encontrada`);
  }
  return invoice;
}
