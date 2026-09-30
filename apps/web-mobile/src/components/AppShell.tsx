import React, { type PropsWithChildren } from 'react';
import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Brand, IconButton, SearchField, StatusPill } from './ui';
import { colors, radius, spacing } from '../theme';
import type { AuthUser } from '../services/auth.client';

export type ScreenKey = 'dashboard' | 'sales' | 'inventory' | 'contacts' | 'profile';

const navigation: Array<{ key: ScreenKey; label: string; glyph: string }> = [
  { key: 'dashboard', label: 'Dashboard', glyph: '⌂' },
  { key: 'sales', label: 'Ventas', glyph: '↗' },
  { key: 'inventory', label: 'Inventario', glyph: '◫' },
  { key: 'contacts', label: 'Contactos', glyph: '◎' },
  { key: 'profile', label: 'Perfil', glyph: '○' }
];

export function AppShell({
  active,
  onNavigate,
  onOpenCommands,
  apiOnline,
  user,
  children
}: PropsWithChildren<{
  active: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  onOpenCommands: () => void;
  apiOnline: boolean | null;
  user: AuthUser;
}>) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.ambientTop} />
      <View style={styles.ambientSide} />
      <View style={styles.shell}>
        {desktop ? (
          <View style={styles.sidebar}>
            <Brand />
            <View style={styles.sideNav}>
              {navigation.map((item) => (
                <NavButton key={item.key} active={item.key === active} item={item} onPress={() => onNavigate(item.key)} />
              ))}
            </View>
            <View style={styles.sideFooter}>
              <View style={styles.workspaceIcon}><Text style={styles.workspaceInitial}>{user.name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.workspaceCopy}><Text numberOfLines={1} style={styles.workspaceName}>{user.name}</Text><Text style={styles.workspaceRole}>{user.roles.includes('admin') ? 'Administrador' : 'Usuario'}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.main}>
          <View style={styles.topbar}>
            {!desktop ? <Brand compact /> : <SearchField />}
            <View style={styles.topActions}>
              {desktop ? <StatusPill label={apiOnline ? 'API en línea' : apiOnline === false ? 'Modo demo' : 'Conectando'} tone={apiOnline ? 'success' : apiOnline === false ? 'warning' : 'info'} /> : null}
              <IconButton label="Abrir búsqueda rápida" glyph="⌕" />
              <Pressable accessibilityLabel="Abrir comandos" accessibilityRole="button" onPress={onOpenCommands} style={styles.commandButton}>
                <Text style={styles.commandGlyph}>⌘</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.content}>{children}</View>
          {!desktop ? (
            <View style={styles.bottomNav}>
              {navigation.map((item) => (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  key={item.key}
                  onPress={() => onNavigate(item.key)}
                  style={({ pressed }) => [styles.bottomItem, item.key === active && styles.bottomItemActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.bottomGlyph, item.key === active && styles.bottomGlyphActive]}>{item.glyph}</Text>
                  <Text numberOfLines={1} style={[styles.bottomLabel, item.key === active && styles.bottomLabelActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function NavButton({
  active,
  item,
  onPress
}: {
  active: boolean;
  item: { key: ScreenKey; label: string; glyph: string };
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.navButton, active && styles.navButtonActive, pressed && styles.pressed]}>
      <View style={[styles.navGlyphWrap, active && styles.navGlyphWrapActive]}><Text style={[styles.navGlyph, active && styles.navGlyphActive]}>{item.glyph}</Text></View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
      {active ? <View style={styles.activeRail} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0
  },
  ambientTop: { position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: colors.glow, top: -360, right: -120 },
  ambientSide: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(21, 87, 200, 0.10)', bottom: -220, left: -180 },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 252, padding: spacing.lg, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: 'rgba(5, 11, 24, 0.96)' },
  sideNav: { flex: 1, marginTop: spacing.xxl, gap: 7 },
  navButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, paddingHorizontal: 10, position: 'relative' },
  navButtonActive: { backgroundColor: colors.glow, borderWidth: 1, borderColor: colors.borderStrong },
  navGlyphWrap: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navGlyphWrapActive: { backgroundColor: colors.primaryDark },
  navGlyph: { color: colors.textMuted, fontSize: 17 },
  navGlyphActive: { color: colors.text },
  navLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  navLabelActive: { color: colors.text },
  activeRail: { position: 'absolute', width: 3, height: 22, right: -1, borderRadius: 3, backgroundColor: colors.primaryBright, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 9 },
  sideFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  workspaceIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  workspaceInitial: { color: colors.text, fontWeight: '800' },
  workspaceCopy: { flex: 1 },
  workspaceName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  workspaceRole: { color: colors.textDim, fontSize: 9, marginTop: 3 },
  chevron: { color: colors.textDim, fontSize: 20 },
  main: { flex: 1, minWidth: 0 },
  topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'rgba(5, 11, 24, 0.88)' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  commandButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright },
  commandGlyph: { color: colors.text, fontSize: 17, fontWeight: '700' },
  content: { flex: 1, minWidth: 0 },
  bottomNav: { position: 'absolute', left: 12, right: 12, bottom: 16, height: 64, borderRadius: 23, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 7, shadowColor: '#000000', shadowOpacity: 0.48, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  bottomItem: { flex: 1, minWidth: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3 },
  bottomItemActive: { backgroundColor: colors.glow },
  bottomGlyph: { color: colors.textDim, fontSize: 18, height: 22 },
  bottomGlyphActive: { color: colors.primaryBright },
  bottomLabel: { color: colors.textDim, fontSize: 8, fontWeight: '600' },
  bottomLabelActive: { color: colors.text },
  pressed: { opacity: 0.7 }
});


