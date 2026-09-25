import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    sku: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    taxRate: { type: Number, default: 0 }
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    taxId: { type: String }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    number: { type: String, required: true },
    customer: { type: customerSchema, required: true },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    impuestos: { type: Number, required: true },
    total: { type: Number, required: true },
    issuedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, issuedAt: -1 });
schema.index({ tenantId: 1, number: 1 });

export const InvoiceModel = mongoose.model('Invoice', schema, 'invoices');
