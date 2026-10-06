import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppShell, type ScreenKey } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AuthScreen } from './screens/AuthScreen';
import { ContactsScreen, DashboardScreen, InventoryScreen, ProfileScreen, ReportsScreen, SalesScreen, StorefrontScreen } from './screens/Screens';
import { getApiBaseUrl, pingApi } from './services/api.client';
import { AuthApiError, getCurrentUser, type AuthSession } from './services/auth.client';
import { clearSession, loadSession, saveSession } from './services/auth.storage';
import { colors } from './theme';

export default function App() {
  const { height } = useWindowDimensions();
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const publicStoreTenant = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('store') : null;

  useKeyboardShortcuts(() => setPaletteOpen(true));

  useEffect(() => {
    let mounted = true;
    pingApi().then((online) => {
      if (mounted) setApiOnline(online);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadSession().then(async (stored) => {
      if (!mounted) return;
      setSession(stored);
      setSessionReady(true);
      if (!stored) return;

      try {
        const user = await getCurrentUser(stored.token, stored.user.tenantId);
        const refreshed = { ...stored, user };
        await saveSession(refreshed);
        if (mounted) setSession(refreshed);
      } catch (cause) {
        if (cause instanceof AuthApiError && cause.status === 401) {
          await clearSession();
          if (mounted) setSession(null);
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  async function handleAuthenticated(nextSession: AuthSession) {
    await saveSession(nextSession);
    setSession(nextSession);
    setActive('dashboard');
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    setPaletteOpen(false);
    setActive('dashboard');
  }

  const content = useMemo(() => {
    if (!session) return null;
    switch (active) {
      case 'sales': return <SalesScreen session={session} />;
      case 'inventory': return <InventoryScreen session={session} />;
      case 'contacts': return <ContactsScreen session={session} />;
      case 'store': return <StorefrontScreen tenantId={session.user.tenantId} embedded />;
      case 'reports': return <ReportsScreen session={session} />;
      case 'profile': return <ProfileScreen apiOnline={apiOnline} apiUrl={getApiBaseUrl()} user={session!.user} onLogout={handleLogout} />;
      default: return <DashboardScreen session={session} />;
    }
  }, [active, apiOnline, session]);

  if (publicStoreTenant && /^[0-9a-fA-F]{24}$/.test(publicStoreTenant)) {
    return <StorefrontScreen tenantId={publicStoreTenant} />;
  }

  if (!sessionReady) {
    return <View style={[styles.app, styles.loading]} />;
  }

  if (!session) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <View style={[styles.app, { minHeight: height }]}>
      <AppShell
        active={active}
        apiOnline={apiOnline}
        user={session.user}
        onNavigate={setActive}
        onOpenCommands={() => setPaletteOpen(true)}
      >
        {content}
      </AppShell>
      <CommandPalette
        visible={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(screen) => {
          setActive(screen);
          setPaletteOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background
  },
  loading: { minHeight: '100%' }
});

