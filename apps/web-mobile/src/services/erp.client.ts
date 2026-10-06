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
  imageUrl: string;
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

export type NewProduct = Omit<ProductRecord, 'id' | 'currentStock' | 'imageUrl'> & { initialStock: number; imageUrl?: string };
export type NewContact = Omit<ContactRecord, 'id'>;
export type NewInvoice = {
  number: string;
  customer: { id: string; name: string; taxId?: string };
  items: Array<{ productId: string; sku: string; quantity: number; taxRate: number }>;
  issuedAt: string;
};

export type PageResult<T> = { items: T[]; page: number; total: number; totalPages: number };
export type StoreInfo = { id: string; name: string };
export type StoreProduct = Pick<ProductRecord, 'id' | 'sku' | 'name' | 'imageUrl' | 'precio' | 'currentStock'>;
export type StoreOrder = { id: string; number: string; total: number; status: string };

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

async function requestPage<T>(session: AuthSession, path: string): Promise<PageResult<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { headers: { Authorization: `Bearer ${session.token}`, 'X-Tenant-Id': session.user.tenantId } });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T[]> | null;
  if (!response.ok || !payload?.success || !payload.data) throw new ErpApiError(payload?.error ?? 'No se pudo cargar la página.', response.status);
  return { items: payload.data, page: payload.meta?.page ?? 1, total: payload.meta?.total ?? payload.data.length, totalPages: payload.meta?.totalPages ?? 1 };
}

async function getEveryPage<T>(session: AuthSession, path: string): Promise<T[]> {
  const first = await requestPage<T>(session, `${path}${path.includes('?') ? '&' : '?'}page=1&limit=100`);
  if (first.totalPages <= 1) return first.items;
  const remaining = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, index) => requestPage<T>(session, `${path}${path.includes('?') ? '&' : '?'}page=${index + 2}&limit=100`)));
  return [first, ...remaining].flatMap((page) => page.items);
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: ApiEnvelope<unknown>['meta'] }> {
  let response: Response;
  try { response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } }); }
  catch { throw new ErpApiError('No fue posible conectar con la tienda.', 0); }
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) throw new ErpApiError(payload?.details?.[0]?.message ?? payload?.error ?? 'La tienda no pudo completar la operación.', response.status);
  return { data: payload.data, meta: payload.meta };
}

export const getDashboard = (session: AuthSession) => request<DashboardSummary>(session, '/dashboard/summary');
export const getProductPage = (session: AuthSession, page = 1, search = '') => requestPage<ProductRecord>(session, `/inventory/products?page=${page}&limit=100&search=${encodeURIComponent(search)}`);
export const getProducts = (session: AuthSession) => getEveryPage<ProductRecord>(session, '/inventory/products');
export const createProduct = (session: AuthSession, product: NewProduct) => request<ProductRecord>(session, '/inventory/products', { method: 'POST', body: JSON.stringify(product) });
export const updateProduct = (session: AuthSession, id: string, product: Partial<NewProduct>) => request<ProductRecord>(session, `/inventory/products/${id}`, { method: 'PATCH', body: JSON.stringify(product) });
export const uploadProductImage = (session: AuthSession, id: string, imageData: string) => request<ProductRecord>(session, `/inventory/products/${id}/image`, { method: 'POST', body: JSON.stringify({ imageData }) });
export const adjustProductStock = (session: AuthSession, id: string, quantity: number, reason: string) => request<ProductRecord>(session, `/inventory/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify({ quantity, reason }) });
export const getContactPage = (session: AuthSession, page = 1, search = '') => requestPage<ContactRecord>(session, `/contacts?page=${page}&limit=100&search=${encodeURIComponent(search)}`);
export const getContacts = (session: AuthSession) => getEveryPage<ContactRecord>(session, '/contacts');
export const createContact = (session: AuthSession, contact: NewContact) => request<ContactRecord>(session, '/contacts', { method: 'POST', body: JSON.stringify(contact) });
export const updateContact = (session: AuthSession, id: string, contact: Partial<NewContact>) => request<ContactRecord>(session, `/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(contact) });
export const getInvoices = (session: AuthSession) => request<InvoiceRecord[]>(session, '/sales/invoices?limit=100');
export const createInvoice = (session: AuthSession, invoice: NewInvoice) => request<InvoiceRecord>(session, '/sales/invoices', { method: 'POST', body: JSON.stringify(invoice) });
export const setInvoiceStatus = (session: AuthSession, id: string, status: 'paid' | 'cancelled') => request<InvoiceRecord>(session, `/sales/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getInvoiceDocumentLink = (session: AuthSession, id: string) => request<{ url: string; expiresInSeconds: number }>(session, `/sales/invoices/${id}/document-link`, { method: 'POST' });
export const seedSampleData = (session: AuthSession) => request<{ products: number; contacts: number; customers: number; invoices: number; message: string }>(session, '/setup/sample-data', { method: 'POST' });
export const getDataExportLink = (session: AuthSession, format: 'pdf' | 'xlsx') => request<{ url: string; expiresInSeconds: number }>(session, '/exports/link', { method: 'POST', body: JSON.stringify({ format }) });
export const getStoreInfo = async (tenantId: string) => (await publicRequest<StoreInfo>(`/store/${tenantId}/info`)).data;
export const getStoreProducts = async (tenantId: string, page = 1, search = '') => {
  const result = await publicRequest<StoreProduct[]>(`/store/${tenantId}/products?page=${page}&limit=24&search=${encodeURIComponent(search)}`);
  return { items: result.data, page: result.meta?.page ?? page, total: result.meta?.total ?? result.data.length, totalPages: result.meta?.totalPages ?? 1 } satisfies PageResult<StoreProduct>;
};
export const createStoreOrder = async (tenantId: string, input: { customer: { name: string; email: string; phone: string }; items: Array<{ productId: string; quantity: number }> }) => (await publicRequest<StoreOrder>(`/store/${tenantId}/orders`, { method: 'POST', body: JSON.stringify(input) })).data;
