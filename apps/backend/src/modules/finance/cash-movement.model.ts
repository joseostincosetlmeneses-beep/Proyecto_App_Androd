import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true, trim: true },
  concept: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  occurredAt: { type: Date, required: true },
  createdBy: { type: String, required: true },
  sourceType: { type: String, default: 'manual' },
  sourceId: { type: String, default: '' }
}, { timestamps: true });

schema.index({ tenantId: 1, sourceType: 1, sourceId: 1 }, { unique: true, partialFilterExpression: { sourceId: { $type: 'string', $ne: '' } } });

export const CashMovementModel = mongoose.model('CashMovement', schema);
