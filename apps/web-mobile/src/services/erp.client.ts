import { getApiBaseUrl } from './api.client';
import type { AuthSession } from './auth.client';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field?: string; message: string }>;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
};

export class ErpApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ErpApiError';
  }
}

export type DashboardSummary = {
  salesToday: number;
  invoicesToday: number;
  salesThisMonth: number;
  invoicesThisMonth: number;
  receivables: number;
  pendingInvoices: number;
  products: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
  customers: number;
  suppliers: number;
  recentInvoices: Array<Pick<InvoiceRecord, 'id' | 'number' | 'total' | 'status' | 'issuedAt'> & { customer: string }>;
};

export type ProductRecord = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  costo: number;
  precio: number;
  stockMinimo: number;
  currentStock: number;
};

export type ContactRecord = {
  id: string;
  name: string;
  type: 'Cliente' | 'Proveedor';
  taxId: string;
  email: string;
  phone: string;
};

export type InvoiceRecord = {
  id: string;
  number: string;
  customer: { id: string; name: string; taxId?: string };
  items: Array<{ productId: string; sku: string; description: string; quantity: number; unitPrice: number; taxRate: number }>;
  subtotal: number;
  impuestos: number;
  total: number;
  issuedAt: string;
  status: 'pending' | 'paid' | 'cancelled';
};

export type NewProduct = Omit<ProductRecord, 'id' | 'currentStock'> & { initialStock: number };
export type NewContact = Omit<ContactRecord, 'id'>;
export type NewInvoice = {
  number: string;
  customer: { id: string; name: string; taxId?: string };
  items: Array<{ productId: string; sku: string; quantity: number; taxRate: number }>;
  issuedAt: string;
};

async function request<T>(session: AuthSession, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        'X-Tenant-Id': session.user.tenantId,
        ...(init?.headers ?? {})
      }
    });
  } catch {
    throw new ErpApiError('No fue posible conectar con Orbit ERP.', 0);
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    const detail = payload?.details?.[0]?.message;
    throw new ErpApiError(detail ?? payload?.error ?? 'La operación no pudo completarse.', response.status);
  }
  return payload.data;
}

export const getDashboard = (session: AuthSession) => request<DashboardSummary>(session, '/dashboard/summary');
export const getProducts = (session: AuthSession) => request<ProductRecord[]>(session, '/inventory/products?limit=100');
export const createProduct = (session: AuthSession, product: NewProduct) => request<ProductRecord>(session, '/inventory/products', { method: 'POST', body: JSON.stringify(product) });
export const updateProduct = (session: AuthSession, id: string, product: Partial<NewProduct>) => request<ProductRecord>(session, `/inventory/products/${id}`, { method: 'PATCH', body: JSON.stringify(product) });
export const adjustProductStock = (session: AuthSession, id: string, quantity: number, reason: string) => request<ProductRecord>(session, `/inventory/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify({ quantity, reason }) });
export const getContacts = (session: AuthSession) => request<ContactRecord[]>(session, '/contacts?limit=100');
export const createContact = (session: AuthSession, contact: NewContact) => request<ContactRecord>(session, '/contacts', { method: 'POST', body: JSON.stringify(contact) });
export const updateContact = (session: AuthSession, id: string, contact: Partial<NewContact>) => request<ContactRecord>(session, `/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(contact) });
export const getInvoices = (session: AuthSession) => request<InvoiceRecord[]>(session, '/sales/invoices?limit=100');
export const createInvoice = (session: AuthSession, invoice: NewInvoice) => request<InvoiceRecord>(session, '/sales/invoices', { method: 'POST', body: JSON.stringify(invoice) });
export const setInvoiceStatus = (session: AuthSession, id: string, status: 'paid' | 'cancelled') => request<InvoiceRecord>(session, `/sales/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getInvoiceDocumentLink = (session: AuthSession, id: string) => request<{ url: string; expiresInSeconds: number }>(session, `/sales/invoices/${id}/document-link`, { method: 'POST' });
