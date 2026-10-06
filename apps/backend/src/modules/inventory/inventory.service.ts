import type { CatalogPaginationQuery, CreateProductInput, StockAdjustmentInput, UpdateProductInput } from '@erp/contracts';
import type mongoose from 'mongoose';
import { withTransaction } from '../../core/database/transaction.helper.js';
import { AppError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { ProductModel } from './product.model.js';
import { StockBalanceModel } from './stock-balance.model.js';
import { StockMovementModel } from './stock-movement.model.js';
import { env } from '../../config/env.js';

export type ProductRecord = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  imageUrl: string;
  costo: number;
  precio: number;
  stockMinimo: number;
  currentStock: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function serializeProduct(product: Record<string, unknown>, currentStock: number): ProductRecord {
  const imageVersion = product.updatedAt instanceof Date ? product.updatedAt.getTime() : Date.parse(String(product.updatedAt ?? '')) || Date.now();
  return {
    id: String(product._id),
    sku: String(product.sku),
    barcode: String(product.barcode),
    name: String(product.name),
    imageUrl: product.hasImage === true
      ? `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/store/product-images/${String(product._id)}?v=${imageVersion}`
      : typeof product.imageUrl === 'string' && product.imageUrl.length > 0
      ? product.imageUrl
      : `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/store/images/${encodeURIComponent(String(product.sku))}.svg`,
    costo: Number(product.costo),
    precio: Number(product.precio),
    stockMinimo: Number(product.stockMinimo),
    currentStock,
    createdAt: product.createdAt instanceof Date ? product.createdAt : undefined,
    updatedAt: product.updatedAt instanceof Date ? product.updatedAt : undefined
  };
}

export async function saveProductImage(tenantId: string, id: string, imageData: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageData);
  if (!match?.[1] || !match[2]) throw new ValidationError('Selecciona una imagen JPG, PNG o WebP válida.');
  const size = Buffer.byteLength(match[2], 'base64');
  if (size > 1_500_000) throw new ValidationError('La imagen debe pesar menos de 1.5 MB.');
  const product = await ProductModel.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { imageData: match[2], imageMime: match[1], hasImage: true } },
    { new: true, runValidators: true }
  ).lean();
  if (!product) throw new NotFoundError('Producto no encontrado.');
  const balance = await StockBalanceModel.findOne({ tenantId, productId: id }).lean();
  return serializeProduct(product as unknown as Record<string, unknown>, balance?.currentStock ?? 0);
}

export async function listProducts(tenantId: string, options: CatalogPaginationQuery) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { tenantId };

  if (options.search) {
    filter.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { sku: { $regex: options.search, $options: 'i' } },
      { barcode: { $regex: options.search, $options: 'i' } }
    ];
  }

  const [products, total] = await Promise.all([
    ProductModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    ProductModel.countDocuments(filter)
  ]);
  const productIds = products.map((product) => String(product._id));
  const balances = await StockBalanceModel.find({ tenantId, productId: { $in: productIds } }).lean();
  const stockByProduct = new Map(balances.map((balance) => [balance.productId, balance.currentStock]));

  return {
    items: products.map((product) => serializeProduct(product as unknown as Record<string, unknown>, stockByProduct.get(String(product._id)) ?? 0)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function createProduct(tenantId: string, input: CreateProductInput) {
  try {
    return await withTransaction(async (session: mongoose.ClientSession) => {
      const [product] = await ProductModel.create([{
        tenantId,
        sku: input.sku.trim(),
        barcode: input.barcode.trim(),
        name: input.name.trim(),
        imageUrl: input.imageUrl?.trim() || undefined,
        costo: input.costo,
        precio: input.precio,
        stockMinimo: input.stockMinimo
      }], { session });
      if (!product) throw new ValidationError('No fue posible guardar el producto.');
      const productId = product.id;
      await StockBalanceModel.create([{ tenantId, productId, currentStock: input.initialStock }], { session });
      if (input.initialStock > 0) {
        await StockMovementModel.create([{
          tenantId,
          productId,
          type: 'ENTRADA',
          quantity: input.initialStock,
          referenceId: 'STOCK-INICIAL',
          occurredAt: new Date()
        }], { session });
      }
      return serializeProduct(product.toObject() as Record<string, unknown>, input.initialStock);
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      throw new AppError(409, `Ya existe un producto con el SKU '${input.sku}'.`);
    }
    throw error;
  }
}

export async function updateProduct(tenantId: string, id: string, input: UpdateProductInput) {
  try {
    const product = await ProductModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: input },
      { new: true, runValidators: true }
    ).lean();
    if (!product) throw new NotFoundError('Producto no encontrado.');
    const balance = await StockBalanceModel.findOne({ tenantId, productId: id }).lean();
    return serializeProduct(product as unknown as Record<string, unknown>, balance?.currentStock ?? 0);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      throw new AppError(409, `Ya existe un producto con el SKU '${input.sku}'.`);
    }
    throw error;
  }
}

export async function deleteProduct(tenantId: string, id: string) {
  return withTransaction(async (session: mongoose.ClientSession) => {
    const product = await ProductModel.findOneAndDelete({ _id: id, tenantId }, { session }).lean();
    if (!product) throw new NotFoundError('Producto no encontrado.');
    await Promise.all([
      StockBalanceModel.deleteMany({ tenantId, productId: id }, { session }),
      StockMovementModel.deleteMany({ tenantId, productId: id }, { session })
    ]);
    return { id, name: String(product.name) };
  });
}

export async function adjustStock(tenantId: string, id: string, input: StockAdjustmentInput) {
  const product = await ProductModel.findOne({ _id: id, tenantId }).lean();
  if (!product) throw new NotFoundError('Producto no encontrado.');
  return withTransaction(async (session: mongoose.ClientSession) => {
    const filter: Record<string, unknown> = { tenantId, productId: id };
    if (input.quantity < 0) filter.currentStock = { $gte: Math.abs(input.quantity) };

    const balance = await StockBalanceModel.findOneAndUpdate(
      filter,
      { $inc: { currentStock: input.quantity } },
      { new: true, upsert: input.quantity > 0, setDefaultsOnInsert: true, session }
    ).lean();

    if (!balance) {
      throw new ValidationError('El ajuste dejaría el inventario en negativo.', [
        { field: 'quantity', message: 'No hay existencias suficientes para realizar la salida.' }
      ]);
    }

    await StockMovementModel.create([{
      tenantId,
      productId: id,
      type: input.quantity > 0 ? 'ENTRADA' : 'SALIDA',
      quantity: Math.abs(input.quantity),
      referenceId: `AJUSTE:${input.reason}`,
      occurredAt: new Date()
    }], { session });

    return serializeProduct(product as unknown as Record<string, unknown>, balance.currentStock);
  });
}
