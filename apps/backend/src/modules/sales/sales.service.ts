import { InvoiceSchema, JournalEntrySchema, type PaginationQuery } from '@erp/contracts';
import { withTransaction } from '../../core/database/transaction.helper.js';
import { ValidationError, NotFoundError } from '../../core/errors/app-error.js';
import { InvoiceModel } from './invoice.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { JournalEntryModel } from '../accounting/journal.model.js';
import type mongoose from 'mongoose';

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function createInvoice(input: unknown) {
  const parsed = InvoiceSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      'Datos de factura inválidos',
      parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    );
  }

  const inputInvoice = parsed.data;
  const skuList = [...new Set(inputInvoice.items.map((item) => item.sku))];
  const products = await ProductModel.find({
    tenantId: inputInvoice.tenantId,
    sku: { $in: skuList }
  }).lean();
  const productsBySku = new Map(products.map((product) => [product.sku, product]));

  const items = inputInvoice.items.map((item) => {
    const product = productsBySku.get(item.sku);
    if (!product || String(product._id) !== item.productId) {
      throw new ValidationError('Producto inválido para la factura', [
        { field: `items.${inputInvoice.items.indexOf(item)}.productId`, message: `El producto '${item.sku}' no pertenece al tenant o no existe.` }
      ]);
    }

    return {
      productId: String(product._id),
      sku: product.sku,
      description: product.name,
      quantity: item.quantity,
      unitPrice: product.precio,
      taxRate: item.taxRate
    };
  });

  const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const impuestos = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0));
  const total = money(subtotal + impuestos);

  const invoice = {
    ...inputInvoice,
    items,
    subtotal,
    impuestos,
    total
  };

  const journal = JournalEntrySchema.safeParse({
    tenantId: invoice.tenantId,
    fecha: invoice.issuedAt,
    glosa: `Factura ${invoice.number}`,
    lines: [
      { accountId: 'accounts-receivable', debit: total, credit: 0 },
      { accountId: 'sales', debit: 0, credit: subtotal },
      { accountId: 'taxes-payable', debit: 0, credit: impuestos }
    ]
  });

  if (!journal.success) {
    throw new ValidationError(
      'El asiento de la factura no cuadra',
      journal.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    );
  }

  return withTransaction(async (session: mongoose.ClientSession) => {
    // Reserve/decrement materialized stock atomically before recording the movement.
    for (const item of items) {
      const result = await StockBalanceModel.updateOne(
        {
          tenantId: invoice.tenantId,
          productId: item.productId,
          currentStock: { $gte: item.quantity }
        },
        { $inc: { currentStock: -item.quantity } },
        { session }
      );
      if (result.modifiedCount !== 1) {
        throw new ValidationError('Stock insuficiente', [
          { field: `items.${items.indexOf(item)}.quantity`, message: `Stock insuficiente para '${item.sku}'.` }
        ]);
      }
    }

    const [saved] = await InvoiceModel.create([invoice], { session });

    await StockMovementModel.insertMany(
      items.map((item) => ({
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
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function getInvoiceById(tenantId: string, id: string) {
  const invoice = await InvoiceModel.findOne({ _id: id, tenantId }).lean();
  if (!invoice) throw new NotFoundError(`Factura con id '${id}' no encontrada`);
  return invoice;
}
