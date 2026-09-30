import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from './auth.client';

const SESSION_KEY = 'orbit-erp.auth-session';

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const serialized = Platform.OS === 'web'
      ? globalThis.sessionStorage?.getItem(SESSION_KEY) ?? null
      : await SecureStore.getItemAsync(SESSION_KEY);
    if (!serialized) return null;
    const session = JSON.parse(serialized) as AuthSession;
    if (!session.token || !session.user?.id || !session.user.tenantId) return null;
    return session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function saveSession(session: AuthSession) {
  const serialized = JSON.stringify(session);
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(SESSION_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, serialized);
}

export async function clearSession() {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

