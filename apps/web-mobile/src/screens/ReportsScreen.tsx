import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/ui';
import type { AuthSession } from '../services/auth.client';
import { getDashboard, getDataExportLink, type DashboardSummary } from '../services/erp.client';
import { colors } from '../theme';
import { Feedback, messageFrom, MiniButton, money, ScreenHeading, screenStyles } from './shared';

export function ReportsScreen({ session }: { session: AuthSession }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSummary(await getDashboard(session)); } catch (cause) { setError(messageFrom(cause)); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => { void load(); }, [load]);

  async function download(format: 'pdf' | 'xlsx') {
    setBusy(true); setError('');
    try { const { url } = await getDataExportLink(session, format); await Linking.openURL(url); }
    catch (cause) { setError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeading eyebrow="ANÁLISIS Y ARCHIVOS" title="Reportes" subtitle="Indicadores consolidados y exportación completa de los datos de tu empresa." action="Actualizar" onAction={() => void load()} />
    <Feedback loading={loading} error={error} />
    {summary ? <View style={screenStyles.grid}>
      <Card style={styles.metric}><Text style={styles.label}>Ventas del mes</Text><Text style={styles.value}>{money(summary.salesThisMonth)}</Text></Card>
      <Card style={styles.metric}><Text style={styles.label}>Por cobrar</Text><Text style={styles.value}>{money(summary.receivables)}</Text></Card>
      <Card style={styles.metric}><Text style={styles.label}>Productos</Text><Text style={styles.value}>{summary.products}</Text></Card>
      <Card style={styles.metric}><Text style={styles.label}>Clientes</Text><Text style={styles.value}>{summary.customers}</Text></Card>
    </View> : null}
    <Card style={styles.exportCard}><View style={styles.copy}><Text style={styles.title}>Exportar información</Text><Text style={styles.detail}>Incluye resumen, productos, existencias, contactos y facturas. Los archivos se generan desde la información actual de la base de datos.</Text></View><View style={screenStyles.actions}><MiniButton label="Descargar PDF" disabled={busy} onPress={() => void download('pdf')} /><MiniButton label="Descargar Excel" disabled={busy} tone="success" onPress={() => void download('xlsx')} /></View></Card>
  </ScrollView>;
}

const styles = StyleSheet.create({
  metric: { flex: 1, minWidth: 190 }, label: { color: colors.textMuted, fontSize: 11 }, value: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 8 },
  exportCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }, copy: { flex: 1, minWidth: 240 }, title: { color: colors.text, fontSize: 16, fontWeight: '900' }, detail: { color: colors.textMuted, fontSize: 11, lineHeight: 18, marginTop: 6 }
});
