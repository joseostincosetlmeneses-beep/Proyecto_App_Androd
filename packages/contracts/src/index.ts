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
  imageUrl: z.union([z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), 'La imagen debe usar HTTP o HTTPS'), z.literal('')]).optional(),
  costo: z.number().nonnegative(),
  precio: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative()
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductInputSchema = ProductSchema.omit({ id: true, tenantId: true }).extend({
  initialStock: z.number().nonnegative().default(0)
});
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = ProductSchema.omit({ id: true, tenantId: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  'Incluye al menos un campo para actualizar'
);
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

export const StockAdjustmentInputSchema = z.object({
  quantity: z.number().finite().refine((value) => value !== 0, 'El ajuste no puede ser cero'),
  reason: z.string().trim().min(3).max(160)
});
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentInputSchema>;

export const ContactSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(140),
  type: z.enum(['Cliente', 'Proveedor']).default('Cliente'),
  taxId: z.string().trim().max(40).optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional()
});
export type Contact = z.infer<typeof ContactSchema>;

export const CreateContactInputSchema = ContactSchema.omit({ id: true, tenantId: true });
export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

export const UpdateContactInputSchema = CreateContactInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Incluye al menos un campo para actualizar'
);
export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;

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
  // Decimal fraction: 0.16 represents 16%.
  taxRate: z.number().min(0).max(1).default(0)
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
  issuedAt: z.coerce.date(),
  status: z.enum(['pending', 'paid', 'cancelled']).default('pending'),
  paidAt: z.coerce.date().nullable().optional()
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceItemSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().positive(),
  taxRate: z.number().min(0).max(1).default(0)
});

export const CreateInvoiceInputSchema = z.object({
  number: z.string().trim().min(1).max(60),
  customer: CustomerSnapshotSchema,
  items: z.array(CreateInvoiceItemSchema).min(1),
  issuedAt: z.coerce.date()
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

export const UpdateInvoiceStatusInputSchema = z.object({
  status: z.enum(['paid', 'cancelled'])
});
export type UpdateInvoiceStatusInput = z.infer<typeof UpdateInvoiceStatusInputSchema>;

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
  sortBy: z.enum(['issuedAt', 'number', 'total', 'customer.name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const CatalogPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().trim().optional()
});
export type CatalogPaginationQuery = z.infer<typeof CatalogPaginationQuerySchema>;

export const ResourceIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido')
});
export type ResourceIdParams = z.infer<typeof ResourceIdParamsSchema>;

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
