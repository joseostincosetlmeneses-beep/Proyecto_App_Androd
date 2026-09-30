import { getApiBaseUrl } from './api.client';

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new AuthApiError('No fue posible conectar con Orbit ERP. Revisa tu conexión e inténtalo otra vez.', 0);
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new AuthApiError(payload?.error ?? 'La solicitud no pudo completarse.', response.status, payload?.code);
  }

  return payload.data;
}

export async function getCurrentUser(token: string, tenantId: string): Promise<AuthUser> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });
  } catch {
    throw new AuthApiError('No fue posible comprobar la sesión.', 0);
  }

  const payload = await response.json().catch(() => null) as ApiEnvelope<AuthUser> | null;
  if (!response.ok || !payload?.success || !payload.data) {
    throw new AuthApiError(payload?.error ?? 'La sesión ya no es válida.', response.status, payload?.code);
  }
  return payload.data;
}

export function login(email: string, password: string) {
  return request<AuthSession>('/auth/login', { email, password });
}

export function registerAccount(input: { name: string; companyName: string; email: string; password: string }) {
  return request<{ message: string }>('/auth/register', input);
}

export function resendVerification(email: string) {
  return request<{ message: string }>('/auth/resend-verification', { email });
}

