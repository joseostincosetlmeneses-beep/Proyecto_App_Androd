import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppShell, type ScreenKey } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ContactsScreen, DashboardScreen, InventoryScreen, ProfileScreen, SalesScreen } from './screens/Screens';
import { getApiBaseUrl, pingApi } from './services/api.client';
import { colors } from './theme';

export default function App() {
  const { height } = useWindowDimensions();
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useKeyboardShortcuts(() => setPaletteOpen(true));

  useEffect(() => {
    let mounted = true;
    pingApi().then((online) => {
      if (mounted) setApiOnline(online);
    });
    return () => { mounted = false; };
  }, []);

  const content = useMemo(() => {
    switch (active) {
      case 'sales': return <SalesScreen />;
      case 'inventory': return <InventoryScreen />;
      case 'contacts': return <ContactsScreen />;
      case 'profile': return <ProfileScreen apiOnline={apiOnline} apiUrl={getApiBaseUrl()} />;
      default: return <DashboardScreen />;
    }
  }, [active, apiOnline]);

  return (
    <View style={[styles.app, { minHeight: height }]}>
      <AppShell
        active={active}
        apiOnline={apiOnline}
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
  }
});
