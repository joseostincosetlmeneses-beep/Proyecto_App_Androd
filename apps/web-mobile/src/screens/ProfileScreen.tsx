import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, StatusPill } from '../components/ui';
import type { AuthUser } from '../services/auth.client';
import { colors, radius, spacing } from '../theme';
import { ScreenHeading, screenStyles } from './shared';

export function ProfileScreen({ apiOnline, apiUrl, user, onLogout }: { apiOnline: boolean | null; apiUrl: string; user: AuthUser; onLogout: () => void }) {
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  return (
    <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="CUENTA Y CONFIGURACIÓN" title="Perfil" subtitle="Tu cuenta y el estado de los servicios de Orbit ERP." />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <View style={styles.copy}><Text style={styles.name}>{user.name}</Text><Text style={styles.detail}>{user.email}</Text></View>
        <StatusPill label={user.roles.includes('admin') ? 'Administrador' : 'Usuario'} tone="info" />
      </Card>
      <Card>
        <SectionTitle title="Estado del sistema" />
        <View style={styles.setting}><View style={styles.copy}><Text style={styles.settingTitle}>API de Orbit ERP</Text><Text numberOfLines={1} style={styles.detail}>{apiUrl}</Text></View><StatusPill label={apiOnline === null ? 'Comprobando' : apiOnline ? 'En línea' : 'Sin conexión'} tone={apiOnline ? 'success' : apiOnline === false ? 'danger' : 'info'} /></View>
        <View style={[styles.setting, styles.last]}><View style={styles.copy}><Text style={styles.settingTitle}>Sincronización</Text><Text style={styles.detail}>La aplicación Android y la web utilizan la misma cuenta y datos.</Text></View><StatusPill label="Activa" tone="success" /></View>
      </Card>
      <Pressable accessibilityRole="button" onPress={onLogout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Text style={styles.logoutText}>Cerrar sesión</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.text, fontSize: 19, fontWeight: '900' }, copy: { flex: 1, minWidth: 100 }, name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  detail: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, last: { borderBottomWidth: 0 }, settingTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  logout: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,90,107,0.4)', backgroundColor: 'rgba(255,90,107,0.08)' }, logoutText: { color: colors.danger, fontSize: 12, fontWeight: '800' }, pressed: { opacity: 0.7 }
});
