import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    sku: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 }
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
    items: { type: [itemSchema], required: true, minlength: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    impuestos: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending', required: true },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, issuedAt: -1 });
schema.index({ tenantId: 1, number: 1 }, { unique: true });

export const InvoiceModel = mongoose.model('Invoice', schema, 'invoices');
