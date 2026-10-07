import React, { type PropsWithChildren } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { StatusTone } from '../data/demo';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandHalo}>
        <Image
          accessibilityLabel="Logo de Orbit ERP"
          source={require('../../assets/logo.png')}
          style={[styles.logo, compact && styles.logoCompact] as StyleProp<ImageStyle>}
        />
      </View>
      {!compact && (
        <View>
          <Text style={styles.brandName}>Orbit ERP</Text>
          <Text style={styles.brandTag}>Control empresarial</Text>
        </View>
      )}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text numberOfLines={1} style={styles.sectionTitle}>{title}</Text>
      {action ? <Text numberOfLines={1} style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

const toneColor: Record<StatusTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.primaryBright
};

export function StatusPill({ label, tone = 'info' }: { label: string; tone?: StatusTone }) {
  const color = toneColor[tone];
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
  tone = 'info'
}: {
  label: string;
  value: string;
  delta: string;
  icon: string;
  tone?: StatusTone;
}) {
  const color = toneColor[tone];
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { borderColor: `${color}45`, backgroundColor: `${color}16` }]}>
          <Text style={[styles.metricIconText, { color }]}>{icon}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.metricDelta, { color }]}>{delta}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.58} style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

export function SearchField({ label = 'Buscar en el ERP' }: { label?: string }) {
  return (
    <View accessibilityRole="search" style={styles.search}>
      <Text style={styles.searchIcon}>⌕</Text>
      <Text style={styles.searchPlaceholder}>{label}</Text>
      <View style={styles.shortcut}><Text style={styles.shortcutText}>⌘ K</Text></View>
    </View>
  );
}

export function IconButton({ label, glyph }: { label: string; glyph: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Text style={styles.iconButtonText}>{glyph}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View accessibilityLabel={`${value}%`} accessibilityRole="progressbar" style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card style={styles.emptyState}>
      <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>◇</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandHalo: {
    borderRadius: 15,
    padding: 2,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  logo: { width: 46, height: 46, borderRadius: 12 },
  logoCompact: { width: 38, height: 38, borderRadius: 10 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  brandTag: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  sectionAction: { color: colors.primaryBright, fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 10 },
  pill: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  metricCard: { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 150, height: 154, maxHeight: 154, justifyContent: 'space-between', overflow: 'hidden' },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metricIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metricIconText: { fontSize: 18, fontWeight: '700' },
  metricDelta: { flex: 1, textAlign: 'right', fontSize: 10, fontWeight: '600' },
  metricValue: { width: '100%', color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: '700', marginTop: 12 },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 13, flex: 1, maxWidth: 440 },
  searchIcon: { color: colors.textMuted, fontSize: 20 },
  searchPlaceholder: { color: colors.textMuted, fontSize: 13, flex: 1 },
  shortcut: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  shortcutText: { color: colors.textDim, fontSize: 9, fontWeight: '700' },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { color: colors.textMuted, fontSize: 18 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: colors.backgroundSoft, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.glow, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.primaryBright, fontSize: 24 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 14 },
  emptyDescription: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6, maxWidth: 300, lineHeight: 18 }
});


