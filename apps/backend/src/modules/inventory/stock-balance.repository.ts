import type mongoose from 'mongoose';
import { StockBalanceModel } from './stock-balance.model.js';

export async function applyOutboundStock(
  tenantId: string,
  productId: string,
  quantity: number,
  session: mongoose.ClientSession
) {
  const result = await StockBalanceModel.updateOne(
    {
      tenantId,
      productId,
      currentStock: { $gte: quantity }
    },
    { $inc: { currentStock: -quantity } },
    { session }
  );

  if (result.modifiedCount !== 1) {
    throw new Error(`Stock insuficiente o inexistente para el producto '${productId}'.`);
  }
}

export async function applyInboundStock(
  tenantId: string,
  productId: string,
  quantity: number,
  session: mongoose.ClientSession
) {
  await StockBalanceModel.updateOne(
    { tenantId, productId },
    { $inc: { currentStock: quantity } },
    { upsert: true, session }
  );
}
