import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  isActive: z.boolean().default(true)
});
export type Tenant = z.infer<typeof TenantSchema>;

export const UserSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  roles: z.array(z.string()).min(1),
  isActive: z.boolean().default(true)
});
export type User = z.infer<typeof UserSchema>;

export const ProductSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().min(1),
  name: z.string().min(1),
  costo: z.number().nonnegative(),
  precio: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative()
});
export type Product = z.infer<typeof ProductSchema>;

export const CustomerSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  taxId: z.string().optional()
});
export type CustomerSnapshot = z.infer<typeof CustomerSnapshotSchema>;

export const InvoiceItemSchema = z.object({
  productId: z.string(),
  sku: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0)
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1),
  number: z.string().min(1),
  customer: CustomerSnapshotSchema,
  items: z.array(InvoiceItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  impuestos: z.number().nonnegative(),
  total: z.number().nonnegative(),
  issuedAt: z.coerce.date()
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceInputSchema = InvoiceSchema.omit({ tenantId: true }).extend({
  tenantId: z.string().optional()
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

export const JournalLineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative()
}).refine((line) => !(line.debit > 0 && line.credit > 0), 'Una línea no puede tener Debe y Haber simultáneos');
export type JournalLine = z.infer<typeof JournalLineSchema>;

export const JournalEntrySchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1),
  fecha: z.coerce.date(),
  glosa: z.string().min(1),
  lines: z.array(JournalLineSchema).min(2)
}).superRefine((entry, ctx) => {
  const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
  if (Math.abs(debit - credit) > 0.000001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El asiento contable no cuadra',
      path: ['lines']
    });
  }
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const StockMovementSchema = z.object({
  tenantId: z.string().min(1),
  productId: z.string(),
  type: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA']),
  quantity: z.number().positive(),
  referenceId: z.string(),
  occurredAt: z.coerce.date()
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string()
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  details: z.array(ApiErrorDetailSchema).optional(),
  meta: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
    totalPages: z.number().optional()
  }).optional()
});
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: ApiErrorDetail[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};
