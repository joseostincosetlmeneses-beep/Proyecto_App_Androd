import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    currentStock: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, productId: 1 }, { unique: true });

export const StockBalanceModel = mongoose.model('StockBalance', schema, 'stock_balances');
