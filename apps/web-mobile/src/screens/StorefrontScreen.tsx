import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Brand, Card } from '../components/ui';
import { createStoreOrder, getStoreInfo, getStoreProducts, type StoreInfo, type StoreProduct } from '../services/erp.client';
import { colors, radius, spacing } from '../theme';
import { Feedback, messageFrom, MiniButton, money } from './shared';

type Cart = Record<string, number>;

export function StorefrontScreen({ tenantId }: { tenantId: string }) {
  const { width } = useWindowDimensions();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Cart>({});
  const [cartProducts, setCartProducts] = useState<Record<string, StoreProduct>>({});
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [info, catalog] = await Promise.all([getStoreInfo(tenantId), getStoreProducts(tenantId, page, search)]);
      setStore(info); setProducts(catalog.items); setTotal(catalog.total); setTotalPages(catalog.totalPages);
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setLoading(false); }
  }, [page, search, tenantId]);
  useEffect(() => { void load(); }, [load]);

  const visibleCart = useMemo(() => Object.values(cartProducts).filter((product) => cart[product.id]), [cart, cartProducts]);
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = visibleCart.reduce((sum, product) => sum + product.precio * (cart[product.id] ?? 0), 0);
  const checkoutTotal = subtotal * 1.16;
  const cardWidth = width < 560 ? '100%' : width < 940 ? '47%' : 230;

  function changeQuantity(product: StoreProduct, delta: number) {
    setSuccess('');
    setCartProducts((current) => ({ ...current, [product.id]: product }));
    setCart((current) => {
      const next = Math.max(0, Math.min(product.currentStock, (current[product.id] ?? 0) + delta));
      if (next === 0) { const copy = { ...current }; delete copy[product.id]; return copy; }
      return { ...current, [product.id]: next };
    });
  }

  async function checkout() {
    if (customer.name.trim().length < 2 || !customer.email.includes('@') || customer.phone.trim().length < 7 || itemCount === 0) {
      setError('Completa nombre, correo, teléfono y agrega al menos un producto.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      const order = await createStoreOrder(tenantId, {
        customer,
        items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
      });
      setCart({});
      setCartProducts({});
      setSuccess(`Pedido ${order.number} recibido por ${money(order.total)}. Ya aparece en Ventas de Orbit ERP.`);
      await load();
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Brand />
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>TIENDA CONECTADA</Text><Text style={styles.title}>{store?.name ?? 'Catálogo empresarial'}</Text><Text style={styles.subtitle}>Compra productos con existencias sincronizadas en tiempo real con Orbit ERP.</Text></View>
          <View style={styles.cartBadge}><Text style={styles.cartNumber}>{itemCount}</Text><Text style={styles.cartLabel}>en carrito</Text></View>
        </View>
        <Feedback loading={loading} error={error} empty={success} />
        <View style={styles.searchRow}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => { setPage(1); setSearch(query.trim()); }} placeholder="Buscar productos" placeholderTextColor={colors.textDim} style={styles.searchInput} /><MiniButton label="Buscar" onPress={() => { setPage(1); setSearch(query.trim()); }} /></View>
        <Text style={styles.catalogCount}>{total} productos disponibles en el catálogo</Text>
        <View style={styles.catalog}>
          {products.map((product) => {
            const quantity = cart[product.id] ?? 0;
            return <Card key={product.id} style={[styles.productCard, { width: cardWidth }]}>
              <Image source={product.imageUrl} contentFit="cover" transition={180} style={styles.productImage} />
              <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
              <Text style={styles.sku}>{product.sku}</Text>
              <View style={styles.priceRow}><Text style={styles.price}>{money(product.precio)}</Text><Text style={[styles.stock, product.currentStock <= 0 && styles.out]}>Stock {product.currentStock}</Text></View>
              {quantity > 0 ? <View style={styles.quantityRow}><Pressable onPress={() => changeQuantity(product, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantity}>{quantity}</Text><Pressable onPress={() => changeQuantity(product, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View> : <MiniButton label={product.currentStock > 0 ? 'Agregar al carrito' : 'Agotado'} disabled={product.currentStock <= 0} onPress={() => changeQuantity(product, 1)} />}
            </Card>;
          })}
        </View>
        <View style={styles.pagination}><MiniButton label="Anterior" disabled={page <= 1 || loading} onPress={() => setPage((value) => Math.max(1, value - 1))} /><Text style={styles.pageLabel}>Página {page} de {totalPages}</Text><MiniButton label="Siguiente" disabled={page >= totalPages || loading} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} /></View>

        <Card style={styles.checkout}>
          <View style={styles.checkoutCopy}><Text style={styles.checkoutTitle}>Finalizar pedido</Text><Text style={styles.checkoutDetail}>{itemCount} artículos · subtotal {money(subtotal)} · total con IVA {money(checkoutTotal)}</Text>
            {visibleCart.map((product) => <Text key={product.id} style={styles.cartLine}>{cart[product.id]} × {product.name}</Text>)}
          </View>
          <View style={styles.customerForm}>
            <TextInput value={customer.name} onChangeText={(name) => setCustomer({ ...customer, name })} placeholder="Nombre completo" placeholderTextColor={colors.textDim} style={styles.input} />
            <TextInput value={customer.email} onChangeText={(email) => setCustomer({ ...customer, email })} autoCapitalize="none" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor={colors.textDim} style={styles.input} />
            <TextInput value={customer.phone} onChangeText={(phone) => setCustomer({ ...customer, phone })} keyboardType="phone-pad" placeholder="Teléfono" placeholderTextColor={colors.textDim} style={styles.input} />
            <MiniButton label={busy ? 'Procesando…' : 'Confirmar compra'} disabled={busy || itemCount === 0} tone="success" onPress={() => void checkout()} />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: spacing.lg, paddingBottom: 100, gap: spacing.lg },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  headerCopy: { flex: 1, minWidth: 240 }, eyebrow: { color: colors.primaryBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 7 }, subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 20 },
  cartBadge: { minWidth: 92, padding: 12, borderRadius: radius.md, backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright, alignItems: 'center' },
  cartNumber: { color: colors.text, fontSize: 23, fontWeight: '900' }, cartLabel: { color: colors.textMuted, fontSize: 9 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14 },
  catalogCount: { color: colors.textMuted, fontSize: 11 }, catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  productCard: { minWidth: 210, flexGrow: 1, maxWidth: 285, gap: 8 }, productImage: { width: '100%', height: 145, borderRadius: radius.md, backgroundColor: colors.surface },
  productName: { color: colors.text, fontSize: 14, fontWeight: '800', minHeight: 38 }, sku: { color: colors.textDim, fontSize: 9 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, price: { color: colors.text, fontSize: 18, fontWeight: '900' }, stock: { color: colors.success, fontSize: 9, fontWeight: '800' }, out: { color: colors.danger },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 }, quantityButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.primaryBright }, quantityText: { color: colors.text, fontSize: 20, fontWeight: '800' }, quantity: { color: colors.text, fontWeight: '900' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }, pageLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  checkout: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, checkoutCopy: { flex: 1, minWidth: 240 }, checkoutTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, checkoutDetail: { color: colors.textMuted, fontSize: 11, marginTop: 7, marginBottom: 10 }, cartLine: { color: colors.text, fontSize: 10, marginTop: 4 },
  customerForm: { flex: 1, minWidth: 260, gap: 9 }, input: { height: 43, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSoft, borderRadius: 12, color: colors.text, paddingHorizontal: 12 }
});
