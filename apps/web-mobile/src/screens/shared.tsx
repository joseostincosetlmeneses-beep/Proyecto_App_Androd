import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

export function ScreenHeading({ eyebrow, title, subtitle, action, onAction }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {action && onAction ? <PrimaryButton label={action} onPress={onAction} /> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, compact = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, compact && styles.compact, (pressed || disabled) && styles.dim]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function MiniButton({ label, onPress, tone = 'normal', disabled = false }: {
  label: string;
  onPress: () => void;
  tone?: 'normal' | 'danger' | 'success';
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.mini, tone === 'danger' && styles.miniDanger, tone === 'success' && styles.miniSuccess, disabled && styles.dim]}>
      <Text style={[styles.miniText, tone === 'danger' && styles.dangerText, tone === 'success' && styles.successText]}>{label}</Text>
    </Pressable>
  );
}

export function Feedback({ loading, error, empty }: { loading?: boolean; error?: string; empty?: string }) {
  if (!loading && !error && !empty) return null;
  return (
    <View style={[styles.feedback, error ? styles.feedbackError : undefined]}>
      <Text style={[styles.feedbackText, error ? styles.dangerText : undefined]}>{loading ? 'Cargando información…' : error ?? empty}</Text>
    </View>
  );
}

export const screenStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: spacing.md, paddingBottom: 110, gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowCopy: { flex: 1, minWidth: 120 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowDetail: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7 },
  value: { color: colors.text, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  label: { color: colors.textMuted, fontSize: 10, marginTop: 3, textAlign: 'right' }
});

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  headingCopy: { flex: 1, minWidth: 210 },
  eyebrow: { color: colors.primaryBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 7 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 720 },
  primary: { minHeight: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 20 },
  compact: { minHeight: 38, paddingHorizontal: 14 },
  primaryText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  mini: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: 11, backgroundColor: colors.surface },
  miniDanger: { borderColor: 'rgba(255,90,107,0.38)', backgroundColor: 'rgba(255,90,107,0.08)' },
  miniSuccess: { borderColor: 'rgba(53,208,127,0.38)', backgroundColor: 'rgba(53,208,127,0.08)' },
  miniText: { color: colors.primaryBright, fontSize: 10, fontWeight: '800' },
  dangerText: { color: colors.danger },
  successText: { color: colors.success },
  dim: { opacity: 0.55 },
  feedback: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  feedbackError: { borderColor: 'rgba(255,90,107,0.35)', backgroundColor: 'rgba(255,90,107,0.08)' },
  feedbackText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' }
});
