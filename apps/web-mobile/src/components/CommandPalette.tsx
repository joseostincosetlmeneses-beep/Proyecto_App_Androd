import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScreenKey } from './AppShell';
import { colors, radius, spacing } from '../theme';

const commands: Array<{ label: string; hint: string; screen: ScreenKey; glyph: string }> = [
  { label: 'Abrir dashboard', hint: 'Resumen de la operación', screen: 'dashboard', glyph: '⌂' },
  { label: 'Consultar ventas', hint: 'Facturas y cobros', screen: 'sales', glyph: '↗' },
  { label: 'Revisar inventario', hint: 'Existencias y alertas', screen: 'inventory', glyph: '◫' },
  { label: 'Buscar contactos', hint: 'Clientes y proveedores', screen: 'contacts', glyph: '◎' },
  { label: 'Consultar reportes', hint: 'Indicadores, PDF y Excel', screen: 'reports', glyph: '▤' },
  { label: 'Estado del sistema', hint: 'Perfil y conexión', screen: 'profile', glyph: '○' }
];

export function CommandPalette({
  visible,
  onClose,
  onSelect
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (screen: ScreenKey) => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!visible) setQuery(''); }, [visible]);
  const filtered = useMemo(() => commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar comandos" style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <View style={styles.inputWrap}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              accessibilityLabel="Buscar comandos"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar acciones o módulos"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            <View style={styles.escape}><Text style={styles.escapeText}>ESC</Text></View>
          </View>
          <Text style={styles.groupLabel}>NAVEGACIÓN RÁPIDA</Text>
          {filtered.map((command) => (
            <Pressable key={command.screen} onPress={() => onSelect(command.screen)} style={({ pressed }) => [styles.command, pressed && styles.pressed]}>
              <View style={styles.commandIcon}><Text style={styles.commandGlyph}>{command.glyph}</Text></View>
              <View style={styles.commandCopy}><Text style={styles.commandLabel}>{command.label}</Text><Text style={styles.commandHint}>{command.hint}</Text></View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(1, 5, 14, 0.82)', alignItems: 'center', paddingTop: 86, paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 580, backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 34 },
  inputWrap: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.backgroundSoft, borderRadius: radius.md, paddingHorizontal: 13 },
  searchGlyph: { color: colors.primaryBright, fontSize: 20 },
  input: { flex: 1, color: colors.text, fontSize: 14, outlineStyle: 'none' } as never,
  escape: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  escapeText: { color: colors.textDim, fontSize: 8, fontWeight: '700' },
  groupLabel: { color: colors.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: 6 },
  command: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  commandIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.glow },
  commandGlyph: { color: colors.primaryBright, fontSize: 17 },
  commandCopy: { flex: 1 },
  commandLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  commandHint: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  arrow: { color: colors.textDim, fontSize: 21 },
  pressed: { opacity: 0.65 }
});
