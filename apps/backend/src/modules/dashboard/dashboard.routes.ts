import { Router } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { requireRoles } from '../../core/middlewares/auth.middleware.js';
import { ContactModel } from '../contacts/contact.model.js';
import { ProductModel } from '../inventory/product.model.js';
import { StockBalanceModel } from '../inventory/stock-balance.model.js';
import { InvoiceModel } from '../sales/invoice.model.js';

const router: Router = Router();

router.get('/summary', requireRoles('admin', 'sales', 'inventory', 'accounting', 'purchasing', 'projects'), async (req, res, next) => {
  try {
    if (!req.tenantId) throw new AppError(400, 'Tenant requerido');
    const tenantId = req.tenantId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayTotals, monthTotals, pendingTotals, products, balances, contactsByType, recentInvoices] = await Promise.all([
      InvoiceModel.aggregate([
        { $match: { tenantId, issuedAt: { $gte: startOfDay }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { tenantId, issuedAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      InvoiceModel.aggregate([
        // Las facturas creadas antes de incorporar estados se consideran pendientes.
        { $match: { tenantId, status: { $nin: ['paid', 'cancelled'] } } },
        { $group: { _id: null, amount: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      ProductModel.find({ tenantId }).lean(),
      StockBalanceModel.find({ tenantId }).lean(),
      ContactModel.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      InvoiceModel.find({ tenantId }).sort({ issuedAt: -1 }).limit(6).lean()
    ]);

    const stockByProduct = new Map(balances.map((balance) => [balance.productId, balance.currentStock]));
    const lowStock = products.filter((product) => (stockByProduct.get(String(product._id)) ?? 0) <= product.stockMinimo);
    const outOfStock = products.filter((product) => (stockByProduct.get(String(product._id)) ?? 0) === 0);
    const inventoryValue = products.reduce(
      (sum, product) => sum + (stockByProduct.get(String(product._id)) ?? 0) * product.costo,
      0
    );
    const contactCounts = new Map(contactsByType.map((entry) => [String(entry._id), Number(entry.count)]));

    res.json({
      success: true,
      data: {
        salesToday: Number(todayTotals[0]?.revenue ?? 0),
        invoicesToday: Number(todayTotals[0]?.count ?? 0),
        salesThisMonth: Number(monthTotals[0]?.revenue ?? 0),
        invoicesThisMonth: Number(monthTotals[0]?.count ?? 0),
        receivables: Number(pendingTotals[0]?.amount ?? 0),
        pendingInvoices: Number(pendingTotals[0]?.count ?? 0),
        products: products.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        customers: contactCounts.get('Cliente') ?? 0,
        suppliers: contactCounts.get('Proveedor') ?? 0,
        recentInvoices: recentInvoices.map((invoice) => ({
          id: String(invoice._id),
          number: invoice.number,
          customer: invoice.customer.name,
          total: invoice.total,
          status: invoice.status ?? 'pending',
          issuedAt: invoice.issuedAt
        }))
      }
    });
  } catch (error) { next(error); }
});

export default router;
