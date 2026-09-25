import { InvoiceSchema, JournalEntrySchema } from '@erp/contracts';
import { withTransaction } from '../../core/database/transaction.helper.js';
import { ValidationError } from '../../core/errors/app-error.js';
import { InvoiceModel } from './invoice.model.js';
import { StockMovementModel } from '../inventory/stock-movement.model.js';
import { JournalEntryModel } from '../accounting/journal.model.js';
import type mongoose from 'mongoose';
export async function createInvoice(input:unknown){ const invoice=InvoiceSchema.parse(input); const debit=invoice.total; const lines=[{accountId:'accounts-receivable',debit,credit:0},{accountId:'sales',debit:0,credit:invoice.subtotal},{accountId:'taxes-payable',debit:0,credit:invoice.impuestos}]; const journal=JournalEntrySchema.safeParse({tenantId:invoice.tenantId,fecha:invoice.issuedAt,glosa:`Factura ${invoice.number}`,lines}); if(!journal.success)throw new ValidationError('El asiento de la factura no cuadra',journal.error.flatten()); return withTransaction(async(session:mongoose.ClientSession)=>{ const [saved]=await InvoiceModel.create([invoice],{session}); await StockMovementModel.insertMany(invoice.items.map(item=>({tenantId:invoice.tenantId,productId:item.productId,type:'SALIDA',quantity:item.quantity,referenceId:invoice.number,occurredAt:invoice.issuedAt})),{session}); await JournalEntryModel.create([journal.data],{session}); return saved; }); }
