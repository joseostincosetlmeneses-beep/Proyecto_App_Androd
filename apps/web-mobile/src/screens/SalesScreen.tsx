import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, SectionTitle, StatusPill } from '../components/ui';
import { FormField, FormModal } from '../components/FormModal';
import type { AuthSession } from '../services/auth.client';
import { createInvoice, getContacts, getInvoiceDocumentLink, getInvoices, getProducts, setInvoiceStatus, type ContactRecord, type InvoiceRecord, type ProductRecord } from '../services/erp.client';
import { colors, radius } from '../theme';
import { Feedback, messageFrom, MiniButton, money, ScreenHeading, screenStyles, shortDate } from './shared';

type DraftLine = { productId: string; quantity: string };

export function SalesScreen({ session }: { session: AuthSession }) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([{ productId: '', quantity: '1' }]);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');

  const loadInvoices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try { setInvoices(await getInvoices(session)); }
    catch (cause) { setError(messageFrom(cause)); }
    finally { if (showLoading) setLoading(false); }
  }, [session]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [invoiceData, productData, contactData] = await Promise.all([getInvoices(session), getProducts(session), getContacts(session)]);
      setInvoices(invoiceData); setProducts(productData); setContacts(contactData.filter((contact) => contact.type === 'Cliente'));
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => { void loadInvoices(false); }, 10_000);
    return () => clearInterval(timer);
  }, [load, loadInvoices]);

  function openCreate() { setCustomerId(''); setLines([{ productId: '', quantity: '1' }]); setCustomerQuery(''); setProductQuery(''); setModalError(''); setCreating(true); }

  async function saveInvoice() {
    const customer = contacts.find((item) => item.id === customerId);
    const selected = lines.map((line) => ({ line, product: products.find((item) => item.id === line.productId), quantity: Number(line.quantity) }));
    if (!customer || selected.length === 0 || selected.some(({ product, quantity }) => !product || !Number.isFinite(quantity) || quantity <= 0)) { setModalError('Selecciona un cliente, productos y cantidades válidas.'); return; }
    setBusy(true); setModalError('');
    try {
      await createInvoice(session, {
        number: `F-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        customer: { id: customer.id, name: customer.name, taxId: customer.taxId || undefined },
        items: selected.map(({ product, quantity }) => ({ productId: product!.id, sku: product!.sku, quantity, taxRate: 0.16 })),
        issuedAt: new Date().toISOString()
      });
      setCreating(false); await load();
    } catch (cause) { setModalError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  async function changeStatus(invoice: InvoiceRecord, status: 'paid' | 'cancelled') {
    setError('');
    try { await setInvoiceStatus(session, invoice.id, status); await loadInvoices(); } catch (cause) { setError(messageFrom(cause)); }
  }

  async function openDocument(invoice: InvoiceRecord) {
    setError('');
    try { const { url } = await getInvoiceDocumentLink(session, invoice.id); await Linking.openURL(url); } catch (cause) { setError(messageFrom(cause)); }
  }

  const sales = invoices.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + item.total, 0);
  const receivables = invoices.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.total, 0);
  const visibleContacts = contacts.filter((contact) => `${contact.name} ${contact.email ?? ''}`.toLowerCase().includes(customerQuery.trim().toLowerCase())).slice(0, 40);
  const visibleProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(productQuery.trim().toLowerCase())).slice(0, 40);

  return (
    <>
      <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeading eyebrow="VENTAS Y DOCUMENTOS" title="Facturas" subtitle="Registra ventas, actualiza pagos y genera documentos PDF." action="Nueva factura" onAction={openCreate} />
        <View style={styles.refreshRow}><Text style={styles.refreshHint}>Las compras simuladas aparecen automáticamente en un máximo de 10 segundos.</Text><MiniButton label="Actualizar ventas" onPress={() => void loadInvoices()} /></View>
        <Feedback loading={loading} error={error} />
        <View style={screenStyles.grid}>
          <Card style={styles.stat}><Text style={styles.statLabel}>Ventas registradas</Text><Text style={styles.statValue}>{money(sales)}</Text></Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Por cobrar</Text><Text style={styles.statValue}>{money(receivables)}</Text></Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Documentos</Text><Text style={styles.statValue}>{invoices.length}</Text></Card>
        </View>
        <Card>
          <SectionTitle title="Facturas" action={`${invoices.length} registros`} />
          {!loading && invoices.length === 0 ? <Feedback empty="Aún no hay facturas. Registra productos y clientes para emitir la primera." /> : invoices.map((invoice, index) => (
            <View key={invoice.id} style={[screenStyles.row, index === invoices.length - 1 && screenStyles.rowLast]}>
              <View style={screenStyles.rowCopy}><Text style={screenStyles.rowTitle}>{invoice.number}</Text><Text style={screenStyles.rowDetail}>{invoice.customer.name} · {shortDate(invoice.issuedAt)}{invoice.number.startsWith('SIM-WEB-') ? ' · Compra web simulada' : ''}</Text></View>
              <Text style={screenStyles.value}>{money(invoice.total)}</Text>
              <StatusPill label={invoice.status === 'paid' ? 'Pagada' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendiente'} tone={invoice.status === 'paid' ? 'success' : invoice.status === 'cancelled' ? 'danger' : 'warning'} />
              <View style={screenStyles.actions}>
                <MiniButton label="PDF" onPress={() => void openDocument(invoice)} />
                {invoice.status === 'pending' ? <MiniButton label="Marcar pagada" tone="success" onPress={() => void changeStatus(invoice, 'paid')} /> : null}
                {invoice.status !== 'cancelled' ? <MiniButton label="Cancelar" tone="danger" onPress={() => void changeStatus(invoice, 'cancelled')} /> : null}
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
      <FormModal visible={creating} title="Nueva factura" description="El precio se toma del catálogo y el stock se descuenta automáticamente." submitLabel="Emitir factura" busy={busy} error={modalError} onClose={() => setCreating(false)} onSubmit={() => void saveInvoice()}>
        <Text style={styles.formLabel}>Cliente</Text>
        <TextInput style={styles.search} placeholder="Buscar cliente por nombre o correo" placeholderTextColor={colors.textMuted} value={customerQuery} onChangeText={setCustomerQuery} />
        <View style={styles.options}>{visibleContacts.map((contact) => <Pressable key={contact.id} onPress={() => setCustomerId(contact.id)} style={[styles.option, customerId === contact.id && styles.optionActive]}><Text style={[styles.optionText, customerId === contact.id && styles.optionTextActive]}>{contact.name}</Text></Pressable>)}</View>
        {contacts.length === 0 ? <Feedback empty="Primero agrega un cliente en Contactos." /> : null}
        <Text style={styles.formLabel}>Productos</Text>
        <TextInput style={styles.search} placeholder="Buscar producto por nombre o SKU" placeholderTextColor={colors.textMuted} value={productQuery} onChangeText={setProductQuery} />
        {lines.map((line, lineIndex) => (
          <View key={lineIndex} style={styles.lineEditor}>
            <View style={styles.options}>{visibleProducts.map((product) => <Pressable key={product.id} onPress={() => setLines(lines.map((item, index) => index === lineIndex ? { ...item, productId: product.id } : item))} style={[styles.option, line.productId === product.id && styles.optionActive]}><Text numberOfLines={1} style={[styles.optionText, line.productId === product.id && styles.optionTextActive]}>{product.name} ({product.currentStock})</Text></Pressable>)}</View>
            <FormField label="Cantidad" keyboardType="decimal-pad" value={line.quantity} onChangeText={(quantity) => setLines(lines.map((item, index) => index === lineIndex ? { ...item, quantity } : item))} />
            {lines.length > 1 ? <MiniButton label="Quitar línea" tone="danger" onPress={() => setLines(lines.filter((_, index) => index !== lineIndex))} /> : null}
          </View>
        ))}
        <MiniButton label="+ Agregar producto" onPress={() => setLines([...lines, { productId: '', quantity: '1' }])} />
      </FormModal>
    </>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 190 }, statLabel: { color: colors.textMuted, fontSize: 11 }, statValue: { color: colors.text, fontSize: 23, fontWeight: '800', marginTop: 8 },
  formLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, refreshHint: { color: colors.textMuted, fontSize: 10, flex: 1, minWidth: 190 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { maxWidth: 210, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 9 },
  optionActive: { borderColor: colors.primaryBright, backgroundColor: colors.primaryDark }, optionText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' }, optionTextActive: { color: colors.text },
  lineEditor: { gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.backgroundSoft }
});
