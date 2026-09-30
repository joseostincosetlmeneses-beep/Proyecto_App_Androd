import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activityBars, contacts, inventory, invoices, metrics, recentActivity } from '../data/demo';
import { Card, MetricCard, ProgressBar, SectionTitle, StatusPill } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { AuthUser } from '../services/auth.client';

function ScreenHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function ActivityChart() {
  return (
    <Card style={styles.chartCard}>
      <SectionTitle title="Actividad reciente" action="Esta semana⌄" />
      <View style={styles.chartSummary}>
        <View>
          <Text style={styles.chartValue}>126</Text>
          <Text style={styles.chartLabel}>eventos registrados</Text>
        </View>
        <StatusPill label="+18.2%" tone="success" />
      </View>
      <View accessibilityLabel="Gráfica de actividad semanal" style={styles.chart}>
        {activityBars.map((height, index) => (
          <View key={`${height}-${index}`} style={styles.barSlot}>
            <View style={[styles.barGlow, { height: `${height}%` }]} />
            <View style={[styles.bar, { height: `${Math.max(16, height - 10)}%` }]} />
          </View>
        ))}
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisText}>Lun</Text><Text style={styles.axisText}>Mié</Text><Text style={styles.axisText}>Vie</Text><Text style={styles.axisText}>Hoy</Text>
      </View>
    </Card>
  );
}

function RecentList() {
  return (
    <Card style={styles.recentCard}>
      <SectionTitle title="Últimos movimientos" action="Ver todos" />
      {recentActivity.map((item, index) => (
        <View key={item.title} style={[styles.activityRow, index === recentActivity.length - 1 && styles.rowLast]}>
          <View style={styles.activityIcon}><Text style={styles.activityGlyph}>{index % 2 ? '◫' : '↗'}</Text></View>
          <View style={styles.activityCopy}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text numberOfLines={1} style={styles.rowDetail}>{item.detail}</Text>
          </View>
          <View style={styles.activityMeta}>
            <StatusPill label={item.status} tone={item.tone} />
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function DashboardScreen({ userName }: { userName: string }) {
  const firstName = userName.trim().split(/\s+/)[0] || 'usuario';
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="RESUMEN GENERAL" title={`Buenos días, ${firstName}`} subtitle="Tu operación está estable. Hay 3 alertas que requieren atención." />
      <View style={styles.metricGrid}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </View>
      <View style={styles.dashboardSplit}>
        <ActivityChart />
        <Card style={styles.healthCard}>
          <SectionTitle title="Salud operativa" action="97/100" />
          <View style={styles.healthOrb}>
            <View style={styles.healthRingOuter}><View style={styles.healthRingInner}><Text style={styles.healthScore}>97</Text><Text style={styles.healthUnit}>/100</Text></View></View>
          </View>
          <Text style={styles.healthStrong}>Operación sólida</Text>
          <Text style={styles.healthDescription}>Inventario, ventas y contabilidad sincronizados.</Text>
          <ProgressBar value={97} color={colors.primaryBright} />
        </Card>
      </View>
      <RecentList />
    </ScrollView>
  );
}

const filterLabels = ['Todos', 'Bajo stock', 'Sin stock', 'Activos'];

export function InventoryScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="CATÁLOGO Y EXISTENCIAS" title="Inventario" subtitle="Consulta existencias, precios y productos que necesitan reposición." />
      <View style={styles.inventoryHero}>
        <Card style={styles.inventoryStat}>
          <Text style={styles.statLabel}>Total productos</Text><Text style={styles.statValue}>1,284</Text><Text style={styles.statHint}>+24 este mes</Text>
        </Card>
        <Card style={styles.inventoryStat}>
          <Text style={styles.statLabel}>Stock saludable</Text><Text style={styles.statValue}>97%</Text><ProgressBar value={97} />
        </Card>
        <Card style={styles.inventoryStat}>
          <Text style={styles.statLabel}>Valor de inventario</Text><Text style={styles.statValue}>$1.8M</Text><Text style={styles.statHint}>Costo consolidado</Text>
        </Card>
      </View>
      <View style={styles.filters}>{filterLabels.map((label, index) => <Pressable key={label} style={[styles.filter, index === 0 && styles.filterActive]}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{label}</Text></Pressable>)}</View>
      <Card>
        <SectionTitle title="Productos" action="Ordenar por stock⌄" />
        {inventory.map((item, index) => (
          <View key={item.id} style={[styles.productRow, index === inventory.length - 1 && styles.rowLast]}>
            <View style={styles.productIcon}><Text style={styles.productGlyph}>◇</Text></View>
            <View style={styles.productCopy}><Text numberOfLines={1} style={styles.rowTitle}>{item.name}</Text><Text numberOfLines={1} style={styles.rowDetail}>{item.sku} · {item.price}</Text></View>
            <View style={styles.rowMeta}>
              <View style={styles.stockBlock}><Text style={styles.stockValue}>{item.stock}</Text><Text style={styles.stockLabel}>unidades</Text></View>
              <StatusPill label={item.status} tone={item.tone} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

export function SalesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="VENTAS Y FACTURACIÓN" title="Ventas" subtitle="Seguimiento de facturas, cobros y actividad comercial." />
      <View style={styles.salesSummary}>
        <Card style={styles.salesMain}><Text style={styles.statLabel}>Ingresos del mes</Text><Text style={styles.salesValue}>$684,290</Text><Text style={styles.positive}>↗ 14.8% frente al mes anterior</Text></Card>
        <Card style={styles.salesSmall}><Text style={styles.statLabel}>Por cobrar</Text><Text style={styles.statValue}>$92,400</Text><Text style={styles.statHint}>18 facturas</Text></Card>
      </View>
      <View style={styles.filters}>{['Todas', 'Pendientes', 'Pagadas', 'Canceladas'].map((label, index) => <Pressable key={label} style={[styles.filter, index === 0 && styles.filterActive]}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{label}</Text></Pressable>)}</View>
      <Card>
        <SectionTitle title="Facturas recientes" action="Nueva factura +" />
        {invoices.map((invoice, index) => (
          <View key={invoice.number} style={[styles.invoiceRow, index === invoices.length - 1 && styles.rowLast]}>
            <View style={styles.invoiceIcon}><Text style={styles.invoiceGlyph}>▤</Text></View>
            <View style={styles.invoiceCopy}><Text numberOfLines={1} style={styles.rowTitle}>{invoice.number}</Text><Text numberOfLines={1} style={styles.rowDetail}>{invoice.customer} · {invoice.date}</Text></View>
            <View style={styles.rowMeta}>
              <Text style={styles.amount}>{invoice.amount}</Text>
              <StatusPill label={invoice.status} tone={invoice.tone} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

export function ContactsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="RELACIONES COMERCIALES" title="Contactos" subtitle="Clientes y proveedores centralizados en una sola vista." />
      <View style={styles.contactStats}>
        <Card style={styles.contactStat}><Text style={styles.statValue}>428</Text><Text style={styles.statLabel}>Clientes activos</Text></Card>
        <Card style={styles.contactStat}><Text style={styles.statValue}>76</Text><Text style={styles.statLabel}>Proveedores</Text></Card>
      </View>
      <Card>
        <SectionTitle title="Directorio" action="Nuevo contacto +" />
        {contacts.map((contact, index) => (
          <View key={contact.name} style={[styles.contactRow, index === contacts.length - 1 && styles.rowLast]}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{contact.initials}</Text></View>
            <View style={styles.contactCopy}><Text style={styles.rowTitle}>{contact.name}</Text><Text style={styles.rowDetail}>{contact.detail}</Text></View>
            <View style={styles.contactMeta}><StatusPill label={contact.type} tone={contact.type === 'Proveedor' ? 'warning' : 'info'} /><Text style={styles.time}>{contact.activity}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

export function ProfileScreen({ apiOnline, apiUrl, user, onLogout }: { apiOnline: boolean | null; apiUrl: string; user: AuthUser; onLogout: () => void }) {
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeading eyebrow="CUENTA Y CONFIGURACIÓN" title="Perfil" subtitle="Identidad, preferencias y estado de conexión." />
      <Card style={styles.profileCard}>
        <View style={styles.profileAvatar}><Text style={styles.profileInitials}>{initials}</Text></View>
        <View style={styles.profileCopy}><Text style={styles.profileName}>{user.name}</Text><Text style={styles.rowDetail}>{user.email}</Text></View>
        <StatusPill label={user.roles.includes('admin') ? 'Administrador' : 'Usuario'} tone="info" />
      </Card>
      <Pressable accessibilityRole="button" onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <Card>
        <SectionTitle title="Estado del sistema" />
        <View style={styles.settingRow}><View><Text style={styles.rowTitle}>API del ERP</Text><Text numberOfLines={1} style={styles.rowDetail}>{apiUrl}</Text></View><StatusPill label={apiOnline === null ? 'Comprobando' : apiOnline ? 'En línea' : 'Modo demostración'} tone={apiOnline ? 'success' : apiOnline === false ? 'warning' : 'info'} /></View>
        <View style={styles.settingRow}><View><Text style={styles.rowTitle}>Aplicación móvil</Text><Text style={styles.rowDetail}>Expo SDK 57 · Android preparado</Text></View><StatusPill label="Lista" tone="success" /></View>
        <View style={[styles.settingRow, styles.rowLast]}><View><Text style={styles.rowTitle}>Sincronización</Text><Text style={styles.rowDetail}>Los datos de muestra se usan si la API no responde</Text></View><Text style={styles.chevron}>›</Text></View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: spacing.lg, paddingBottom: 110, maxWidth: 1220, width: '100%', alignSelf: 'center' },
  heading: { marginBottom: spacing.xl },
  eyebrow: { color: colors.primaryBright, fontSize: 10, letterSpacing: 1.7, fontWeight: '800', marginBottom: 8 },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 620 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  dashboardSplit: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  chartCard: { flex: 2, minWidth: 300 },
  recentCard: { marginBottom: spacing.xl },
  chartSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartValue: { color: colors.text, fontSize: 30, fontWeight: '700' },
  chartLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingTop: 24 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  barGlow: { width: '68%', backgroundColor: colors.glow, borderRadius: 7, position: 'absolute', bottom: 0 },
  bar: { width: '28%', backgroundColor: colors.primaryBright, borderRadius: 7 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  axisText: { color: colors.textDim, fontSize: 9 },
  healthCard: { minWidth: 250, flex: 1 },
  healthOrb: { alignItems: 'center', justifyContent: 'center', marginVertical: 11 },
  healthRingOuter: { width: 118, height: 118, borderRadius: 59, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glow, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 24 },
  healthRingInner: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSoft },
  healthScore: { color: colors.text, fontSize: 29, fontWeight: '700' },
  healthUnit: { color: colors.textMuted, fontSize: 10 },
  healthStrong: { color: colors.success, textAlign: 'center', fontWeight: '700', fontSize: 13 },
  healthDescription: { color: colors.textMuted, textAlign: 'center', fontSize: 10, lineHeight: 16, marginVertical: 9 },
  activityRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 11 },
  activityIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  activityGlyph: { color: colors.primaryBright, fontSize: 16, fontWeight: '700' },
  activityCopy: { flex: 1, minWidth: 100 },
  activityMeta: { alignItems: 'flex-end', gap: 5 },
  rowTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  rowDetail: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  time: { color: colors.textDim, fontSize: 9 },
  rowLast: { borderBottomWidth: 0 },
  inventoryHero: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  inventoryStat: { flex: 1, minWidth: 190, gap: 8 },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 25, fontWeight: '700' },
  statHint: { color: colors.primaryBright, fontSize: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  filter: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryBright },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: colors.text },
  productRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  productIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: colors.border },
  productGlyph: { color: colors.primaryBright, fontSize: 18 },
  productCopy: { flex: 1, minWidth: 0 },
  rowMeta: { width: 92, flexShrink: 0, alignItems: 'flex-end', gap: 7 },
  stockBlock: { alignItems: 'flex-end' },
  stockValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  stockLabel: { color: colors.textDim, fontSize: 8, marginTop: 2 },
  chevron: { color: colors.textDim, fontSize: 23, marginLeft: 2 },
  salesSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  salesMain: { flex: 2, minWidth: 260 },
  salesSmall: { flex: 1, minWidth: 190 },
  salesValue: { color: colors.text, fontSize: 32, fontWeight: '700', marginVertical: 9 },
  positive: { color: colors.success, fontSize: 10 },
  invoiceRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  invoiceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glow, borderWidth: 1, borderColor: colors.borderStrong },
  invoiceGlyph: { color: colors.primaryBright, fontSize: 17 },
  invoiceCopy: { flex: 1, minWidth: 0 },
  amount: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  contactStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  contactStat: { flex: 1, minWidth: 180 },
  contactRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 11 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright },
  avatarText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  contactCopy: { flex: 1, minWidth: 120 },
  contactMeta: { alignItems: 'flex-end', gap: 5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.md },
  profileAvatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: colors.text, fontSize: 17, fontWeight: '800' },
  profileCopy: { flex: 1 },
  profileName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  settingRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 },
  logoutButton: { minHeight: 48, marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255, 90, 107, 0.35)', backgroundColor: 'rgba(255, 90, 107, 0.08)', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  logoutPressed: { opacity: 0.7 }
});


