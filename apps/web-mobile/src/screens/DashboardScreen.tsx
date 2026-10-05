import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, MetricCard, SectionTitle, StatusPill } from '../components/ui';
import type { AuthSession } from '../services/auth.client';
import { getDashboard, type DashboardSummary } from '../services/erp.client';
import { colors, spacing } from '../theme';
import { Feedback, money, ScreenHeading, screenStyles, shortDate } from './shared';

export function DashboardScreen({ session }: { session: AuthSession }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstName = session.user.name.trim().split(/\s+/)[0] || 'usuario';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await getDashboard(session)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero.'); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="RESUMEN GENERAL" title={`Hola, ${firstName}`} subtitle="Información real de ventas, inventario y contactos de tu empresa." action="Actualizar" onAction={() => void load()} />
      <Feedback loading={loading} error={error} />
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
  retry: { color: colors.primaryBright, fontWeight: '700', textAlign: 'center', padding: spacing.sm }
});
