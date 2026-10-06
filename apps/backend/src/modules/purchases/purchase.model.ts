import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  sku: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 }
}, { _id: false });

const schema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  number: { type: String, required: true },
  supplier: { id: { type: String, required: true }, name: { type: String, required: true } },
  items: { type: [itemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'ordered', 'received', 'cancelled'], default: 'draft' },
  expectedAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ tenantId: 1, number: 1 }, { unique: true });

export const PurchaseModel = mongoose.model('Purchase', schema);
