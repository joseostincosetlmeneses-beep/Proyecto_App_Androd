const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export function getApiBaseUrl() {
  return (configuredUrl || 'https://orbit-erp-api-p9vp.onrender.com/api').replace(/\/$/, '');
}

export async function pingApi(timeoutMs = 3500): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const healthUrl = getApiBaseUrl().replace(/\/api$/, '') + '/health';
    const response = await fetch(healthUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

