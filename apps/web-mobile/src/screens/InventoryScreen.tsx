import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Card, SectionTitle, StatusPill } from '../components/ui';
import { ChoiceRow, FormField, FormModal } from '../components/FormModal';
import type { AuthSession } from '../services/auth.client';
import { adjustProductStock, createProduct, getProductPage, updateProduct, type NewProduct, type ProductRecord } from '../services/erp.client';
import { colors } from '../theme';
import { Feedback, messageFrom, MiniButton, money, ScreenHeading, screenStyles } from './shared';

const emptyProduct = { sku: '', barcode: '', name: '', imageUrl: '', costo: '', precio: '', stockMinimo: '', initialStock: '' };
type ProductForm = typeof emptyProduct;

export function InventoryScreen({ session }: { session: AuthSession }) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Bajo stock' | 'Sin stock'>('Todos');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ProductRecord | null | undefined>(undefined);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [adjusting, setAdjusting] = useState<ProductRecord | null>(null);
  const [adjustment, setAdjustment] = useState({ quantity: '', reason: '' });
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await getProductPage(session, page, appliedSearch); setProducts(result.items); setTotal(result.total); setTotalPages(result.totalPages); } catch (cause) { setError(messageFrom(cause)); }
    finally { setLoading(false); }
  }, [appliedSearch, page, session]);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => products.filter((product) => filter === 'Todos' || (filter === 'Sin stock' ? product.currentStock <= 0 : product.currentStock > 0 && product.currentStock <= product.stockMinimo)), [filter, products]);
  const inventoryValue = products.reduce((sum, product) => sum + product.costo * product.currentStock, 0);

  function openProduct(product: ProductRecord | null) {
    setEditing(product); setModalError('');
    setForm(product ? { sku: product.sku, barcode: product.barcode, name: product.name, imageUrl: product.imageUrl, costo: String(product.costo), precio: String(product.precio), stockMinimo: String(product.stockMinimo), initialStock: '0' } : emptyProduct);
  }

  async function saveProduct() {
    const parsed: NewProduct = { sku: form.sku.trim(), barcode: form.barcode.trim(), name: form.name.trim(), imageUrl: form.imageUrl.trim(), costo: Number(form.costo), precio: Number(form.precio), stockMinimo: Number(form.stockMinimo), initialStock: Number(form.initialStock || 0) };
    if (!parsed.sku || !parsed.barcode || !parsed.name || Object.values(parsed).some((value) => typeof value === 'number' && (!Number.isFinite(value) || value < 0))) { setModalError('Completa los datos y usa cantidades válidas.'); return; }
    setBusy(true); setModalError('');
    try {
      if (editing) await updateProduct(session, editing.id, { sku: parsed.sku, barcode: parsed.barcode, name: parsed.name, imageUrl: parsed.imageUrl, costo: parsed.costo, precio: parsed.precio, stockMinimo: parsed.stockMinimo });
      else await createProduct(session, parsed);
      setEditing(undefined); await load();
    } catch (cause) { setModalError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  async function saveAdjustment() {
    const quantity = Number(adjustment.quantity);
    if (!adjusting || !Number.isFinite(quantity) || quantity === 0 || adjustment.reason.trim().length < 3) { setModalError('Indica una cantidad distinta de cero y un motivo.'); return; }
    setBusy(true); setModalError('');
    try { await adjustProductStock(session, adjusting.id, quantity, adjustment.reason.trim()); setAdjusting(null); await load(); }
    catch (cause) { setModalError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeading eyebrow="CATÁLOGO Y EXISTENCIAS" title="Inventario" subtitle="Productos, precios y existencias sincronizados en Android y web." action="Nuevo producto" onAction={() => openProduct(null)} />
        <Feedback loading={loading} error={error} />
        <View style={screenStyles.grid}>
          <Card style={styles.stat}><Text style={styles.statLabel}>Productos totales</Text><Text style={styles.statValue}>{total}</Text></Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Unidades en esta página</Text><Text style={styles.statValue}>{products.reduce((sum, item) => sum + item.currentStock, 0)}</Text></Card>
          <Card style={styles.stat}><Text style={styles.statLabel}>Valor en esta página</Text><Text style={styles.statValue}>{money(inventoryValue)}</Text></Card>
        </View>
        <View style={styles.searchRow}><TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => { setPage(1); setAppliedSearch(search.trim()); }} placeholder="Buscar por nombre, SKU o código" placeholderTextColor={colors.textDim} style={styles.searchInput} /><MiniButton label="Buscar" onPress={() => { setPage(1); setAppliedSearch(search.trim()); }} /></View>
        <View style={styles.filters}>{(['Todos', 'Bajo stock', 'Sin stock'] as const).map((label) => <MiniButton key={label} label={label} onPress={() => setFilter(label)} tone={filter === label ? 'success' : 'normal'} />)}</View>
        <Card>
          <SectionTitle title="Productos" action={`${visible.length} resultados`} />
          {!loading && visible.length === 0 ? <Feedback empty="No hay productos en esta categoría." /> : visible.map((product, index) => {
            const status = product.currentStock <= 0 ? ['Agotado', 'danger'] as const : product.currentStock <= product.stockMinimo ? ['Bajo stock', 'warning'] as const : ['Disponible', 'success'] as const;
            return <View key={product.id} style={[screenStyles.row, index === visible.length - 1 && screenStyles.rowLast]}>
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              <View style={screenStyles.rowCopy}><Text style={screenStyles.rowTitle}>{product.name}</Text><Text style={screenStyles.rowDetail}>{product.sku} · {money(product.precio)}</Text></View>
              <View><Text style={screenStyles.value}>{product.currentStock}</Text><Text style={screenStyles.label}>unidades</Text></View>
              <StatusPill label={status[0]} tone={status[1]} />
              <View style={screenStyles.actions}><MiniButton label="Ajustar" onPress={() => { setAdjusting(product); setAdjustment({ quantity: '', reason: '' }); setModalError(''); }} /><MiniButton label="Editar" onPress={() => openProduct(product)} /></View>
            </View>;
          })}
          <View style={styles.pagination}><MiniButton label="Anterior" disabled={page <= 1 || loading} onPress={() => setPage((value) => Math.max(1, value - 1))} /><Text style={styles.pageLabel}>Página {page} de {totalPages} · {total} productos</Text><MiniButton label="Siguiente" disabled={page >= totalPages || loading} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} /></View>
        </Card>
      </ScrollView>
      <FormModal visible={editing !== undefined} title={editing ? 'Editar producto' : 'Nuevo producto'} description="Los cambios se reflejan en la aplicación y en la web." busy={busy} error={modalError} onClose={() => setEditing(undefined)} onSubmit={() => void saveProduct()}>
        <FormField label="Nombre" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <FormField label="SKU" autoCapitalize="characters" value={form.sku} onChangeText={(sku) => setForm({ ...form, sku })} />
        <FormField label="Código de barras" value={form.barcode} onChangeText={(barcode) => setForm({ ...form, barcode })} />
        <FormField label="URL de imagen (opcional)" autoCapitalize="none" value={form.imageUrl} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} />
        <FormField label="Costo" keyboardType="decimal-pad" value={form.costo} onChangeText={(costo) => setForm({ ...form, costo })} />
        <FormField label="Precio de venta" keyboardType="decimal-pad" value={form.precio} onChangeText={(precio) => setForm({ ...form, precio })} />
        <FormField label="Stock mínimo" keyboardType="decimal-pad" value={form.stockMinimo} onChangeText={(stockMinimo) => setForm({ ...form, stockMinimo })} />
        {!editing ? <FormField label="Existencia inicial" keyboardType="decimal-pad" value={form.initialStock} onChangeText={(initialStock) => setForm({ ...form, initialStock })} /> : null}
      </FormModal>
      <FormModal visible={Boolean(adjusting)} title="Ajustar existencias" description={`${adjusting?.name ?? ''}. Usa un número negativo para una salida.`} submitLabel="Aplicar ajuste" busy={busy} error={modalError} onClose={() => setAdjusting(null)} onSubmit={() => void saveAdjustment()}>
        <FormField label="Cantidad (+ entrada / - salida)" keyboardType="numbers-and-punctuation" value={adjustment.quantity} onChangeText={(quantity) => setAdjustment({ ...adjustment, quantity })} />
        <FormField label="Motivo" value={adjustment.reason} onChangeText={(reason) => setAdjustment({ ...adjustment, reason })} />
      </FormModal>
    </>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 190 }, statLabel: { color: colors.textMuted, fontSize: 11 }, statValue: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 9 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productImage: { width: 58, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minWidth: 180, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 13 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 16 },
  pageLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }
});
