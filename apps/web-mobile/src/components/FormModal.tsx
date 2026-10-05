import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from 'react-native';
import { colors, radius, spacing } from '../theme';

export function FormModal({
  visible,
  title,
  description,
  submitLabel = 'Guardar',
  busy = false,
  error,
  onClose,
  onSubmit,
  children
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
}>) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable accessibilityLabel="Cerrar formulario" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
            <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable disabled={busy} onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
            <Pressable disabled={busy} onPress={onSubmit} style={[styles.primaryButton, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Procesando…' : submitLabel}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
    </View>
  );
}

export function ChoiceRow<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, option === value && styles.choiceActive]}>
            <Text style={[styles.choiceText, option === value && styles.choiceTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(1, 5, 14, 0.78)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  close: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  closeText: { color: colors.textMuted, fontSize: 24, lineHeight: 26 },
  body: { padding: spacing.lg, gap: spacing.md },
  fieldWrap: { gap: 7 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.backgroundSoft, color: colors.text, paddingHorizontal: 14, fontSize: 13 },
  multiline: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.primaryBright, backgroundColor: colors.primaryDark },
  choiceText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  choiceTextActive: { color: colors.text },
  error: { color: colors.danger, borderWidth: 1, borderColor: 'rgba(255,90,107,0.35)', backgroundColor: 'rgba(255,90,107,0.08)', borderRadius: radius.md, padding: 12, fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  secondaryButton: { minHeight: 44, minWidth: 100, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  primaryButton: { minHeight: 44, minWidth: 130, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 }
});
