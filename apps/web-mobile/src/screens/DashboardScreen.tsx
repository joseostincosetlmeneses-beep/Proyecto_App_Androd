import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, MetricCard, SectionTitle, StatusPill } from '../components/ui';
import type { AuthSession } from '../services/auth.client';
import { getDashboard, getDataExportLink, seedSampleData, type DashboardSummary } from '../services/erp.client';
import { colors, spacing } from '../theme';
import { Feedback, messageFrom, MiniButton, money, ScreenHeading, screenStyles, shortDate } from './shared';

export function DashboardScreen({ session }: { session: AuthSession }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const firstName = session.user.name.trim().split(/\s+/)[0] || 'usuario';
  const customerPageUrl = Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}?store=${encodeURIComponent(session.user.tenantId)}`
    : `https://proyecto-app-androd.joseostincosetlmeneses.workers.dev?store=${encodeURIComponent(session.user.tenantId)}`;

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try { setData(await getDashboard(session)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero.'); }
    finally { if (showLoading) setLoading(false); }
  }, [session]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(false); }, 5_000);
    return () => clearInterval(timer);
  }, [load]);

  async function loadSamples() {
    setActionBusy(true); setActionMessage(''); setError('');
    try { const result = await seedSampleData(session); setActionMessage(`${result.message} ${result.products} productos, ${result.customers} clientes y ${result.invoices} facturas.`); await load(); }
    catch (cause) { setError(messageFrom(cause)); }
    finally { setActionBusy(false); }
  }

  async function exportData(format: 'pdf' | 'xlsx') {
    setActionBusy(true); setActionMessage(''); setError('');
    try { const { url } = await getDataExportLink(session, format); await Linking.openURL(url); setActionMessage(`Exportación ${format === 'pdf' ? 'PDF' : 'Excel'} generada.`); }
    catch (cause) { setError(messageFrom(cause)); }
    finally { setActionBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="RESUMEN GENERAL" title={`Hola, ${firstName}`} subtitle="Información real de ventas, inventario y contactos de tu empresa." action="Actualizar" onAction={() => void load()} />
      <Feedback loading={loading} error={error} />
      <Card style={styles.actionCard}>
        <View style={styles.actionCopy}><Text style={styles.actionTitle}>Datos y exportaciones</Text><Text style={styles.actionDetail}>Carga un catálogo inicial sin duplicados o descarga toda la información de tu empresa.</Text></View>
        <View style={screenStyles.actions}>
          <MiniButton label="Cargar datos iniciales" disabled={actionBusy} onPress={() => void loadSamples()} />
          <MiniButton label="Exportar PDF" disabled={actionBusy} onPress={() => void exportData('pdf')} />
          <MiniButton label="Exportar Excel" disabled={actionBusy} onPress={() => void exportData('xlsx')} />
        </View>
      </Card>
      {Platform.OS === 'web' ? <Card style={styles.actionCard}>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Página pública para clientes</Text>
          <Text style={styles.actionDetail}>Es independiente del ERP. Tus clientes pueden ver imágenes, consultar existencias, agregar productos al carrito y enviarte pedidos.</Text>
          <Text selectable style={styles.publicUrl}>{customerPageUrl}</Text>
        </View>
        <MiniButton label="Abrir página de clientes" onPress={() => void Linking.openURL(customerPageUrl)} />
      </Card> : null}
      {data && (data.products < 1000 || data.customers < 1000) ? (
        <Card style={styles.missingCard}>
          <View style={styles.actionCopy}><Text style={styles.missingTitle}>La base todavía no está completa</Text><Text style={styles.actionDetail}>Actualmente hay {data.products} productos y {data.customers} clientes. Completa los 1,000 de cada uno sin duplicar los existentes.</Text></View>
          <MiniButton label="Completar 1,000 + 1,000" disabled={actionBusy} tone="success" onPress={() => void loadSamples()} />
        </Card>
      ) : null}
      {actionMessage ? <Feedback empty={actionMessage} /> : null}
      {data ? (
        <>
          <View style={screenStyles.grid}>
            <MetricCard label="Ventas del mes" value={money(data.salesThisMonth)} delta={`${data.invoicesThisMonth} facturas`} icon="↗" tone="success" />
            <MetricCard label="Por cobrar" value={money(data.receivables)} delta={`${data.pendingInvoices} pendientes`} icon="$" tone="warning" />
            <MetricCard label="Valor de inventario" value={money(data.inventoryValue)} delta={`${data.products} productos`} icon="□" />
            <MetricCard label="Contactos" value={`${data.customers + data.suppliers}`} delta={`${data.customers} clientes`} icon="○" />
          </View>
          <View style={screenStyles.grid}>
            <Card style={styles.summaryCard}>
              <SectionTitle title="Operación de hoy" />
              <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Ventas</Text><Text style={styles.summaryValue}>{money(data.salesToday)}</Text></View>
              <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Facturas emitidas</Text><Text style={styles.summaryValue}>{data.invoicesToday}</Text></View>
              <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Stock bajo</Text><Text style={[styles.summaryValue, data.lowStock > 0 && styles.warning]}>{data.lowStock}</Text></View>
              <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Sin stock</Text><Text style={[styles.summaryValue, data.outOfStock > 0 && styles.danger]}>{data.outOfStock}</Text></View>
            </Card>
            <Card style={styles.recentCard}>
              <SectionTitle title="Facturas recientes" action={`${data.recentInvoices.length} registros`} />
              {data.recentInvoices.length === 0 ? <Feedback empty="Aún no hay facturas. Crea la primera desde Ventas." /> : data.recentInvoices.map((invoice, index) => (
                <View key={invoice.id} style={[screenStyles.row, index === data.recentInvoices.length - 1 && screenStyles.rowLast]}>
                  <View style={screenStyles.rowCopy}><Text style={screenStyles.rowTitle}>{invoice.number}</Text><Text style={screenStyles.rowDetail}>{invoice.customer} · {shortDate(invoice.issuedAt)}</Text></View>
                  <Text style={screenStyles.value}>{money(invoice.total)}</Text>
                  <StatusPill label={invoice.status === 'paid' ? 'Pagada' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendiente'} tone={invoice.status === 'paid' ? 'success' : invoice.status === 'cancelled' ? 'danger' : 'warning'} />
                </View>
              ))}
            </Card>
          </View>
        </>
      ) : null}
      {error ? <Pressable onPress={() => void load()}><Text style={styles.retry}>Reintentar</Text></Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flex: 1, minWidth: 260 },
  recentCard: { flex: 2, minWidth: 300 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { color: colors.textMuted, fontSize: 12 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  retry: { color: colors.primaryBright, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
  actionCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  actionCopy: { flex: 1, minWidth: 230 },
  actionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  actionDetail: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  publicUrl: { color: colors.primaryBright, fontSize: 10, marginTop: 8 },
  missingCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, borderColor: colors.warning },
  missingTitle: { color: colors.warning, fontSize: 15, fontWeight: '900' }
});
