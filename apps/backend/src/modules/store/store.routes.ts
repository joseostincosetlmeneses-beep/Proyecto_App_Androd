import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { CatalogPaginationQuerySchema } from '@erp/contracts';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { TenantModel } from '../auth/tenant.model.js';
import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { createInvoice } from '../sales/sales.service.js';

const router: Router = Router();
const tenantIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const orderLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados pedidos desde esta conexión. Intenta nuevamente en unos minutos.' }
});
const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(140),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(7).max(40)
  }),
  items: z.array(z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    quantity: z.number().int().positive().max(100)
  })).min(1).max(20)
});

function imageUrl(sku: string, custom?: unknown) {
  if (typeof custom === 'string' && custom.length > 0) return custom;
  return `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/store/images/${encodeURIComponent(sku)}.svg`;
}

function colorFor(value: string) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 72% 42%)`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character);
}

function catalogSearchPattern(value: string) {
  const accentGroups: Record<string, string> = {
    a: '[aáàäâã]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöôõ]', u: '[uúùüû]', n: '[nñ]', c: '[cç]'
  };
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .split('')
    .map((character) => accentGroups[character] ?? character)
    .join('');
}

export function catalogSearchFilter(search: string) {
  const tokens = search.trim().split(/[\s._-]+/).filter(Boolean).slice(0, 8);
  if (tokens.length === 0) return {};
  return {
    $and: tokens.map((token) => {
      const pattern = catalogSearchPattern(token);
      return { $or: [{ name: { $regex: pattern, $options: 'i' } }, { sku: { $regex: pattern, $options: 'i' } }] };
    })
  };
}

router.get('/images/:sku.svg', (req, res) => {
  const sku = String(req.params.sku).slice(0, 40);
  const color = colorFor(sku);
  const safeSku = escapeXml(sku);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#071229"/></linearGradient></defs><rect width="640" height="420" rx="36" fill="url(#g)"/><circle cx="520" cy="70" r="150" fill="#ffffff" opacity=".08"/><circle cx="100" cy="390" r="170" fill="#38a0ff" opacity=".12"/><path d="M230 206c0-47 38-85 85-85s85 38 85 85-38 85-85 85-85-38-85-85Zm37 0c0 27 21 48 48 48s48-21 48-48-21-48-48-48-48 21-48 48Z" fill="#fff" opacity=".92"/><path d="M166 238c73 32 226 43 310-46" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" opacity=".9"/><text x="320" y="365" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#fff">${safeSku}</text></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

router.get('/product-images/:id', async (req, res, next) => {
  try {
    const parsedId = tenantIdSchema.safeParse(req.params.id);
    if (!parsedId.success) throw new AppError(404, 'Imagen no encontrada.');
    const product = await ProductModel.findById(parsedId.data).select('+imageData +imageMime').lean();
    if (!product?.imageData || !product.imageMime) throw new AppError(404, 'Imagen no encontrada.');
    res.setHeader('Content-Type', product.imageMime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(product.imageData, 'base64'));
  } catch (error) { next(error); }
});

router.get('/:tenantId/info', async (req, res, next) => {
  try {
    const parsedTenant = tenantIdSchema.safeParse(req.params.tenantId);
    if (!parsedTenant.success) throw new AppError(404, 'Tienda no encontrada.');
    const tenant = await TenantModel.findOne({ _id: parsedTenant.data, isActive: true }).lean();
    if (!tenant) throw new AppError(404, 'Tienda no encontrada.');
    res.json({ success: true, data: { id: String(tenant._id), name: tenant.name } });
  } catch (error) { next(error); }
});

router.get('/:tenantId/products', async (req, res, next) => {
  try {
    const parsedTenant = tenantIdSchema.safeParse(req.params.tenantId);
    const parsedQuery = CatalogPaginationQuerySchema.safeParse(req.query);
    if (!parsedTenant.success) throw new AppError(404, 'Tienda no encontrada.');
    if (!parsedQuery.success) throw new AppError(422, 'Consulta de catálogo inválida.');
    const tenant = await TenantModel.exists({ _id: parsedTenant.data, isActive: true });
    if (!tenant) throw new AppError(404, 'Tienda no encontrada.');
    const { page, limit, search } = parsedQuery.data;
    const filter: Record<string, unknown> = { tenantId: parsedTenant.data };
    if (search) Object.assign(filter, catalogSearchFilter(search));
    const [products, total] = await Promise.all([
      ProductModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(filter)
    ]);
    const ids = products.map((product) => String(product._id));
    const balances = await StockBalanceModel.find({ tenantId: parsedTenant.data, productId: { $in: ids } }).lean();
    const stock = new Map(balances.map((balance) => [balance.productId, balance.currentStock]));
    res.json({
      success: true,
      data: products.map((product) => ({
        id: String(product._id), sku: product.sku, name: product.name, precio: product.precio,
        currentStock: stock.get(String(product._id)) ?? 0,
        imageUrl: product.hasImage
          ? `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/store/product-images/${String(product._id)}?v=${product.updatedAt.getTime()}`
          : imageUrl(product.sku, product.imageUrl)
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error); }
});

router.post('/:tenantId/orders', orderLimiter, async (req, res, next) => {
  try {
    const parsedTenant = tenantIdSchema.safeParse(req.params.tenantId);
    const parsed = orderSchema.safeParse(req.body);
    if (!parsedTenant.success) throw new AppError(404, 'Tienda no encontrada.');
    if (!parsed.success) throw new AppError(422, 'Revisa los datos del cliente y del carrito.', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
    const tenantId = parsedTenant.data;
    const tenant = await TenantModel.exists({ _id: tenantId, isActive: true });
    if (!tenant) throw new AppError(404, 'Tienda no encontrada.');

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await ProductModel.find({ tenantId, _id: { $in: productIds } }).lean();
    const byId = new Map(products.map((product) => [String(product._id), product]));
    if (products.length !== productIds.length) throw new AppError(422, 'Uno de los productos ya no está disponible.');

    const contact = await ContactModel.findOneAndUpdate(
      { tenantId, email: parsed.data.customer.email },
      { $set: { name: parsed.data.customer.name, phone: parsed.data.customer.phone, type: 'Cliente' }, $setOnInsert: { tenantId, email: parsed.data.customer.email } },
      { new: true, upsert: true, runValidators: true }
    );
    const number = `SIM-WEB-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const invoice = await createInvoice({
      tenantId,
      number,
      customer: { id: contact.id, name: contact.name, taxId: contact.taxId || undefined },
      items: parsed.data.items.map((item) => {
        const product = byId.get(item.productId);
        if (!product) throw new AppError(422, 'Producto no disponible.');
        return { productId: item.productId, sku: product.sku, quantity: item.quantity, taxRate: 0.16 };
      }),
      issuedAt: new Date()
    });
    res.status(201).json({ success: true, data: { id: String(invoice.id), number: invoice.number, total: invoice.total, status: invoice.status } });
  } catch (error) { next(error); }
});

export default router;
