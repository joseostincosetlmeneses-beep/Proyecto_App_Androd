import { z } from 'zod';

export const TenantSchema = z.object({ id:z.string().min(1), name:z.string().min(1), slug:z.string().min(1), isActive:z.boolean().default(true) });
export type Tenant = z.infer<typeof TenantSchema>;
export const UserSchema = z.object({ id:z.string().min(1), tenantId:z.string().min(1), email:z.string().email(), name:z.string().min(1), roles:z.array(z.string()).min(1), isActive:z.boolean().default(true) });
export type User = z.infer<typeof UserSchema>;
export const ProductSchema = z.object({ id:z.string().optional(), tenantId:z.string().min(1), sku:z.string().min(1), barcode:z.string().min(1), name:z.string().min(1), costo:z.number().nonnegative(), precio:z.number().nonnegative(), stockMinimo:z.number().nonnegative() });
export type Product = z.infer<typeof ProductSchema>;
const CustomerSnapshotSchema = z.object({ id:z.string(), name:z.string(), taxId:z.string().optional() });
const InvoiceItemSchema = z.object({ productId:z.string(), sku:z.string(), description:z.string(), quantity:z.number().positive(), unitPrice:z.number().nonnegative(), taxRate:z.number().nonnegative().default(0) });
export const InvoiceSchema = z.object({ id:z.string().optional(), tenantId:z.string().min(1), number:z.string().min(1), customer:CustomerSnapshotSchema, items:z.array(InvoiceItemSchema).min(1), subtotal:z.number().nonnegative(), impuestos:z.number().nonnegative(), total:z.number().nonnegative(), issuedAt:z.coerce.date() });
export type Invoice = z.infer<typeof InvoiceSchema>;
const JournalLineSchema = z.object({ accountId:z.string().min(1), debit:z.number().nonnegative(), credit:z.number().nonnegative() }).refine((line)=>!(line.debit > 0 && line.credit > 0), 'Una linea no puede tener Debe y Haber');
export const JournalEntrySchema = z.object({ id:z.string().optional(), tenantId:z.string().min(1), fecha:z.coerce.date(), glosa:z.string().min(1), lines:z.array(JournalLineSchema).min(2) }).superRefine((entry, ctx)=>{ const debit=entry.lines.reduce((sum,line)=>sum+line.debit,0); const credit=entry.lines.reduce((sum,line)=>sum+line.credit,0); if(Math.abs(debit-credit)>0.000001) ctx.addIssue({code:z.ZodIssueCode.custom,message:'El asiento contable no cuadra',path:['lines']}); });
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export const StockMovementSchema = z.object({ tenantId:z.string().min(1), productId:z.string(), type:z.enum(['ENTRADA','SALIDA','AJUSTE','TRANSFERENCIA']), quantity:z.number().positive(), referenceId:z.string(), occurredAt:z.coerce.date() });
export type StockMovement = z.infer<typeof StockMovementSchema>;
export const ApiResponseSchema = z.object({ success:z.boolean(), data:z.unknown().optional(), error:z.string().optional() });
