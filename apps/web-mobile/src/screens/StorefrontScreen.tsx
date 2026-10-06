import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Brand } from '../components/ui';
import { createStoreOrder, getStoreInfo, getStoreProducts, type StoreInfo, type StoreProduct } from '../services/erp.client';
import { Feedback, messageFrom, money } from './shared';

type Cart = Record<string, number>;

const storefront = {
  navy: '#071426', navySoft: '#10233E', blue: '#2563EB', blueDark: '#1D4ED8', sky: '#EAF2FF',
  yellow: '#FFD814', yellowPressed: '#F7CA00', background: '#F4F6F8', card: '#FFFFFF',
  text: '#172033', muted: '#667085', border: '#E2E7EE', green: '#12834A', red: '#D92D20'
} as const;

const categories = ['Todos', 'Cómputo', 'Accesorios', 'Oficina', 'Redes', 'Audio', 'Movilidad'];

export function StorefrontScreen({ tenantId }: { tenantId: string }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState<Cart>({});
  const [cartProducts, setCartProducts] = useState<Record<string, StoreProduct>>({});
  const [cartOpen, setCartOpen] = useState(false);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const visibleCart = useMemo(() => Object.values(cartProducts).filter((product) => cart[product.id]), [cart, cartProducts]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages]);
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = visibleCart.reduce((sum, product) => sum + product.precio * (cart[product.id] ?? 0), 0);
  const checkoutTotal = subtotal * 1.16;
  const horizontalPadding = isMobile ? 12 : 24;
  const cardWidth = width < 360 ? '100%' : isMobile ? (width - horizontalPadding * 2 - 10) / 2 : width < 980 ? '31%' : 232;

  function submitSearch(value = query) {
    const normalized = value.trim();
    setPage(1); setSearch(normalized);
  }

  function changeSearch(value: string) {
    setQuery(value);
    setActiveCategory(value.trim() ? '' : 'Todos');
  }

  function clearSearch() {
    setQuery(''); setSearch(''); setPage(1); setActiveCategory('Todos');
  }

  function selectCategory(category: string) {
    const value = category === 'Todos' ? '' : category;
    setActiveCategory(category); setQuery(value); setPage(1); setSearch(value);
  }

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
      const order = await createStoreOrder(tenantId, { customer, items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })) });
      setCart({}); setCartProducts({}); setCartOpen(false);
      setSuccess(`Pedido ${order.number} confirmado por ${money(order.total)}. La compra fue simulada y ya aparece en Ventas de Orbit ERP.`);
      await load();
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.page}>
      <View style={styles.promoBar}><Text style={styles.promoText}>ENVÍO GRATIS SIMULADO EN PEDIDOS MAYORES A $999</Text></View>
      <View style={[styles.navbar, { paddingHorizontal: horizontalPadding }]}>
        <Brand />
        {!isMobile ? <View style={styles.deliveryCopy}><Text style={styles.deliveryLabel}>Tienda oficial</Text><Text numberOfLines={1} style={styles.deliveryName}>{store?.name ?? 'Orbit ERP'}</Text></View> : null}
        {!isMobile ? <View style={styles.navSearch}>
          <TextInput value={query} onChangeText={changeSearch} onSubmitEditing={() => submitSearch()} returnKeyType="search" placeholder="¿Qué estás buscando?" placeholderTextColor="#8A94A6" style={styles.searchInput} />
          {query ? <Pressable accessibilityLabel="Limpiar búsqueda" onPress={clearSearch} style={styles.clearSearch}><Text style={styles.clearSearchText}>×</Text></Pressable> : null}
          <Pressable accessibilityLabel="Buscar productos" onPress={() => submitSearch()} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}><Text style={styles.searchIcon}>⌕</Text></Pressable>
        </View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir carrito con ${itemCount} artículos`} onPress={() => setCartOpen(true)} style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}>
          <Text style={styles.cartIcon}>🛒</Text>{!isMobile ? <Text style={styles.cartButtonText}>Carrito</Text> : null}
          {itemCount > 0 ? <View style={styles.cartCount}><Text style={styles.cartCountText}>{itemCount > 99 ? '99+' : itemCount}</Text></View> : null}
        </Pressable>
        {isMobile ? <View style={[styles.navSearch, styles.navSearchMobile]}>
          <TextInput value={query} onChangeText={changeSearch} onSubmitEditing={() => submitSearch()} returnKeyType="search" placeholder="¿Qué estás buscando?" placeholderTextColor="#8A94A6" style={styles.searchInput} />
          {query ? <Pressable accessibilityLabel="Limpiar búsqueda" onPress={clearSearch} style={styles.clearSearch}><Text style={styles.clearSearchText}>×</Text></Pressable> : null}
          <Pressable accessibilityLabel="Buscar productos" onPress={() => submitSearch()} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}><Text style={styles.searchIcon}>⌕</Text></Pressable>
        </View> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={[styles.categoryContent, { paddingHorizontal: horizontalPadding }]}>
        {categories.map((category) => <Pressable key={category} onPress={() => selectCategory(category)} style={[styles.categoryChip, activeCategory === category && styles.categoryChipActive]}><Text style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>{category}</Text></Pressable>)}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, isMobile && styles.heroMobile]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>CATÁLOGO EN LÍNEA</Text>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>Todo lo que necesitas,{isMobile ? '\n' : ' '}en un solo lugar</Text>
            <Text style={styles.heroText}>Productos con existencias sincronizadas directamente con {store?.name ?? 'Orbit ERP'}.</Text>
            <View style={styles.heroBenefits}><Text style={styles.heroBenefit}>✓ Compra segura de demostración</Text><Text style={styles.heroBenefit}>✓ Inventario actualizado</Text></View>
          </View>
          {!isMobile ? <View style={styles.heroOffer}><Text style={styles.heroOfferTop}>HASTA</Text><Text style={styles.heroOfferNumber}>24</Text><Text style={styles.heroOfferBottom}>productos por página</Text></View> : null}
        </View>
        {success ? <View style={styles.successBanner}><Text style={styles.successIcon}>✓</Text><Text style={styles.successText}>{success}</Text></View> : null}
        <Feedback loading={loading} error={error} />
        <View style={styles.catalogHeader}>
          <View><Text style={styles.catalogTitle}>{search ? `Resultados para “${search}”` : 'Productos destacados'}</Text><Text style={styles.catalogCount}>{total.toLocaleString('es-MX')} productos disponibles</Text></View>
          <Text style={styles.pageLabel}>Página {page} de {totalPages}</Text>
        </View>
        <View style={styles.catalog}>
          {products.map((product) => {
            const quantity = cart[product.id] ?? 0;
            const lowStock = product.currentStock > 0 && product.currentStock <= 5;
            return <View key={product.id} style={[styles.productCard, { width: cardWidth }]}>
              <View style={styles.imageWrap}>{lowStock ? <View style={styles.offerBadge}><Text style={styles.offerBadgeText}>ÚLTIMOS</Text></View> : null}<Image source={product.imageUrl} contentFit="contain" transition={180} style={styles.productImage} /></View>
              <View style={styles.productBody}>
                <Text style={styles.sku}>{product.sku}</Text><Text numberOfLines={2} style={styles.productName}>{product.name}</Text><Text style={styles.price}>{money(product.precio)}</Text>
                <Text style={[styles.stock, product.currentStock <= 0 && styles.out]}>{product.currentStock <= 0 ? 'Temporalmente agotado' : lowStock ? `¡Solo ${product.currentStock} disponibles!` : 'Disponible'}</Text>
                {quantity > 0 ? <View style={styles.quantityRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${product.name}`} hitSlop={8} onPress={() => changeQuantity(product, -1)} style={({ pressed }) => [styles.quantityButton, pressed && styles.stepperPressed]}><Text style={styles.quantityText}>−</Text></Pressable><View style={styles.quantityCopy}><Text style={styles.quantity}>{quantity}</Text><Text style={styles.quantityLabel}>en carrito</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Agregar otro ${product.name}`} accessibilityState={{ disabled: quantity >= product.currentStock }} disabled={quantity >= product.currentStock} hitSlop={8} onPress={() => changeQuantity(product, 1)} style={({ pressed }) => [styles.quantityButton, pressed && styles.stepperPressed, quantity >= product.currentStock && styles.disabled]}><Text style={styles.quantityText}>+</Text></Pressable>
                </View> : <Pressable disabled={product.currentStock <= 0} onPress={() => changeQuantity(product, 1)} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed, product.currentStock <= 0 && styles.disabled]}><Text style={styles.addButtonText}>{product.currentStock > 0 ? 'Agregar al carrito' : 'Agotado'}</Text></Pressable>}
              </View>
            </View>;
          })}
          {!loading && products.length === 0 ? <View style={styles.emptyResults}><Text style={styles.emptyResultsIcon}>⌕</Text><Text style={styles.emptyResultsTitle}>No encontramos productos</Text><Text style={styles.emptyResultsText}>Prueba con otra palabra, una categoría o una parte del nombre del producto.</Text><Pressable onPress={clearSearch} style={styles.emptyResultsButton}><Text style={styles.emptyResultsButtonText}>Ver todos los productos</Text></Pressable></View> : null}
        </View>
        {totalPages > 1 ? <View style={styles.paginationWrap}>
          <View style={styles.pagination}>
            <Pressable accessibilityLabel="Página anterior" disabled={page <= 1 || loading} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.pageButton, (page <= 1 || loading) && styles.disabled]}><Text style={styles.pageButtonText}>‹ Anterior</Text></Pressable>
            {pageNumbers.map((pageNumber) => <Pressable key={pageNumber} accessibilityRole="button" accessibilityLabel={`Ir a la página ${pageNumber}`} accessibilityState={{ selected: page === pageNumber }} disabled={loading} onPress={() => setPage(pageNumber)} style={[styles.pageNumberButton, page === pageNumber && styles.pageNumberButtonActive]}><Text style={[styles.pageNumberText, page === pageNumber && styles.pageNumberTextActive]}>{pageNumber}</Text></Pressable>)}
            <Pressable accessibilityLabel="Página siguiente" disabled={page >= totalPages || loading} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} style={[styles.pageButton, (page >= totalPages || loading) && styles.disabled]}><Text style={styles.pageButtonText}>Siguiente ›</Text></Pressable>
          </View>
          <Text style={styles.paginationHint}>Página {page} de {totalPages} · Todas las páginas están disponibles</Text>
        </View> : null}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}><Text style={styles.trustIcon}>✓</Text><View><Text style={styles.trustTitle}>Compra simulada</Text><Text style={styles.trustText}>No se realizan cargos reales</Text></View></View>
          <View style={styles.trustItem}><Text style={styles.trustIcon}>↻</Text><View><Text style={styles.trustTitle}>Inventario conectado</Text><Text style={styles.trustText}>Cambios reflejados en el ERP</Text></View></View>
          <View style={styles.trustItem}><Text style={styles.trustIcon}>▣</Text><View><Text style={styles.trustTitle}>Pedido registrado</Text><Text style={styles.trustText}>Visible en el módulo de Ventas</Text></View></View>
        </View>
      </ScrollView>

      {itemCount > 0 && isMobile ? <Pressable onPress={() => setCartOpen(true)} style={styles.mobileCartBar}><View style={styles.mobileCartCount}><Text style={styles.mobileCartCountText}>{itemCount}</Text></View><Text style={styles.mobileCartText}>Ver carrito</Text><Text style={styles.mobileCartTotal}>{money(checkoutTotal)}</Text></Pressable> : null}

      <Modal visible={cartOpen} transparent animationType="fade" onRequestClose={() => setCartOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCartOpen(false)} />
          <View style={[styles.cartPanel, isMobile && styles.cartPanelMobile]}>
            <View style={styles.cartHeader}><View><Text style={styles.cartTitle}>Tu carrito</Text><Text style={styles.cartSubtitle}>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</Text></View><Pressable accessibilityLabel="Cerrar carrito" onPress={() => setCartOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
            <ScrollView style={styles.cartList} contentContainerStyle={styles.cartListContent}>
              {visibleCart.length === 0 ? <View style={styles.emptyCart}><Text style={styles.emptyCartIcon}>🛒</Text><Text style={styles.emptyCartTitle}>Tu carrito está vacío</Text><Text style={styles.emptyCartText}>Agrega productos para comenzar tu compra simulada.</Text></View> : null}
              {visibleCart.map((product) => <View key={product.id} style={styles.cartLine}><Image source={product.imageUrl} contentFit="contain" style={styles.cartImage} /><View style={styles.cartLineCopy}><Text numberOfLines={2} style={styles.cartLineName}>{product.name}</Text><Text style={styles.cartLinePrice}>{money(product.precio)}</Text><View style={styles.cartQuantity}><Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${product.name}`} hitSlop={8} onPress={() => changeQuantity(product, -1)} style={({ pressed }) => [styles.cartQuantityButton, pressed && styles.stepperPressed]}><Text style={styles.cartQuantityGlyph}>−</Text></Pressable><Text style={styles.cartQuantityText}>{cart[product.id]}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Agregar otro ${product.name}`} accessibilityState={{ disabled: (cart[product.id] ?? 0) >= product.currentStock }} disabled={(cart[product.id] ?? 0) >= product.currentStock} hitSlop={8} onPress={() => changeQuantity(product, 1)} style={({ pressed }) => [styles.cartQuantityButton, pressed && styles.stepperPressed, (cart[product.id] ?? 0) >= product.currentStock && styles.disabled]}><Text style={styles.cartQuantityGlyph}>+</Text></Pressable></View></View></View>)}
            </ScrollView>
            {itemCount > 0 ? <View style={styles.checkoutArea}>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{money(subtotal)}</Text></View><View style={styles.totalRow}><Text style={styles.totalLabel}>IVA</Text><Text style={styles.totalValue}>{money(subtotal * 0.16)}</Text></View><View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>Total</Text><Text style={styles.grandTotal}>{money(checkoutTotal)}</Text></View>
              <Text style={styles.formTitle}>Datos para registrar el pedido</Text>
              <TextInput value={customer.name} onChangeText={(name) => setCustomer({ ...customer, name })} placeholder="Nombre completo" placeholderTextColor="#8A94A6" style={styles.input} />
              <TextInput value={customer.email} onChangeText={(email) => setCustomer({ ...customer, email })} autoCapitalize="none" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor="#8A94A6" style={styles.input} />
              <TextInput value={customer.phone} onChangeText={(phone) => setCustomer({ ...customer, phone })} keyboardType="phone-pad" placeholder="Teléfono" placeholderTextColor="#8A94A6" style={styles.input} />
              {error ? <Text style={styles.modalError}>{error}</Text> : null}
              <Pressable disabled={busy} onPress={() => void checkout()} style={({ pressed }) => [styles.checkoutButton, (pressed || busy) && styles.disabled]}><Text style={styles.checkoutButtonText}>{busy ? 'Registrando pedido…' : 'Confirmar compra simulada'}</Text></Pressable><Text style={styles.disclaimer}>No se solicitarán datos bancarios ni se realizará ningún cobro.</Text>
            </View> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: storefront.background },
  promoBar: { minHeight: 28, backgroundColor: storefront.blueDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, promoText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.7, textAlign: 'center' },
  navbar: { minHeight: 72, width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingVertical: 10, backgroundColor: storefront.navy }, deliveryCopy: { maxWidth: 160 }, deliveryLabel: { color: '#A9B7CA', fontSize: 9 }, deliveryName: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginTop: 2 },
  navSearch: { flex: 1, minWidth: 260, maxWidth: 720, height: 44, flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 9, overflow: 'hidden' }, navSearchMobile: { flexBasis: '100%', minWidth: '100%' }, searchInput: { flex: 1, color: storefront.text, fontSize: 13, paddingHorizontal: 14 }, clearSearch: { width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, clearSearchText: { color: storefront.muted, fontSize: 22, lineHeight: 24, fontWeight: '500' }, searchButton: { width: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: storefront.yellow }, searchIcon: { color: storefront.navy, fontSize: 24, fontWeight: '900' },
  cartButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, position: 'relative' }, cartIcon: { fontSize: 21 }, cartButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, cartCount: { position: 'absolute', top: -3, right: 0, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: storefront.yellow }, cartCountText: { color: storefront.navy, fontSize: 9, fontWeight: '900' },
  categoryBar: { flexGrow: 0, height: 48, minHeight: 48, backgroundColor: storefront.navySoft }, categoryContent: { minHeight: 48, gap: 4, alignItems: 'stretch' }, categoryChip: { height: 48, minWidth: 78, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, categoryChipActive: { borderBottomColor: storefront.yellow, backgroundColor: 'rgba(255,255,255,0.06)' }, categoryText: { color: '#CBD5E1', fontSize: 11, lineHeight: 15, fontWeight: '600' }, categoryTextActive: { color: '#FFFFFF', fontWeight: '900' },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingTop: 18, paddingBottom: 110, gap: 20 },
  hero: { minHeight: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, paddingHorizontal: 40, paddingVertical: 30, borderRadius: 18, backgroundColor: '#DDEBFF', overflow: 'hidden' }, heroMobile: { minHeight: 230, paddingHorizontal: 22, paddingVertical: 26, borderRadius: 14 }, heroCopy: { flex: 1, maxWidth: 680 }, heroEyebrow: { color: storefront.blueDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 }, heroTitle: { color: storefront.navy, fontSize: 34, lineHeight: 41, fontWeight: '900', marginTop: 8 }, heroTitleMobile: { fontSize: 26, lineHeight: 32 }, heroText: { color: '#40526B', fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 580 }, heroBenefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }, heroBenefit: { color: storefront.green, fontSize: 10, fontWeight: '800' }, heroOffer: { width: 168, height: 168, borderRadius: 84, backgroundColor: storefront.yellow, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] }, heroOfferTop: { color: storefront.navy, fontSize: 11, fontWeight: '900' }, heroOfferNumber: { color: storefront.navy, fontSize: 55, lineHeight: 58, fontWeight: '900' }, heroOfferBottom: { color: storefront.navy, fontSize: 9, fontWeight: '800', textAlign: 'center', maxWidth: 100 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: '#A6E7C5', borderRadius: 12, backgroundColor: '#ECFDF3' }, successIcon: { color: storefront.green, fontSize: 18, fontWeight: '900' }, successText: { flex: 1, color: '#086C3C', fontSize: 11, lineHeight: 17, fontWeight: '600' },
  catalogHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, catalogTitle: { color: storefront.text, fontSize: 21, fontWeight: '900' }, catalogCount: { color: storefront.muted, fontSize: 10, marginTop: 4 }, pageLabel: { color: storefront.muted, fontSize: 10, fontWeight: '600' }, catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { minWidth: 150, flexGrow: 1, maxWidth: 286, borderWidth: 1, borderColor: storefront.border, borderRadius: 12, backgroundColor: storefront.card, overflow: 'hidden', shadowColor: '#101828', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, imageWrap: { width: '100%', aspectRatio: 1.15, padding: 10, backgroundColor: '#FFFFFF', position: 'relative' }, productImage: { width: '100%', height: '100%' }, offerBadge: { position: 'absolute', zIndex: 2, top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, backgroundColor: storefront.red }, offerBadgeText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  productBody: { flex: 1, padding: 12 }, sku: { color: '#98A2B3', fontSize: 8, fontWeight: '700', textTransform: 'uppercase' }, productName: { minHeight: 38, color: storefront.text, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 4 }, price: { color: storefront.text, fontSize: 18, fontWeight: '900', marginTop: 8 }, stock: { minHeight: 16, color: storefront.green, fontSize: 8, fontWeight: '800', marginTop: 3 }, out: { color: storefront.red },
  addButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 20, backgroundColor: storefront.yellow }, addButtonPressed: { backgroundColor: storefront.yellowPressed }, addButtonText: { color: storefront.navy, fontSize: 10, fontWeight: '800' }, quantityRow: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderWidth: 1, borderColor: '#A9C4F5', borderRadius: 21, overflow: 'hidden', backgroundColor: '#FFFFFF' }, quantityButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: storefront.sky }, stepperPressed: { backgroundColor: '#CFE0FF' }, quantityText: { color: storefront.blueDark, fontSize: 20, lineHeight: 24, fontWeight: '900' }, quantityCopy: { flex: 1, alignItems: 'center', justifyContent: 'center' }, quantity: { color: storefront.text, fontSize: 12, lineHeight: 14, fontWeight: '900' }, quantityLabel: { color: storefront.muted, fontSize: 7, lineHeight: 9, fontWeight: '600' },
  emptyResults: { width: '100%', alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20, borderWidth: 1, borderColor: storefront.border, borderRadius: 14, backgroundColor: '#FFFFFF' }, emptyResultsIcon: { color: storefront.blueDark, fontSize: 38, fontWeight: '900' }, emptyResultsTitle: { color: storefront.text, fontSize: 18, fontWeight: '900', marginTop: 10 }, emptyResultsText: { maxWidth: 440, color: storefront.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 }, emptyResultsButton: { minHeight: 40, justifyContent: 'center', marginTop: 16, paddingHorizontal: 18, borderRadius: 20, backgroundColor: storefront.yellow }, emptyResultsButtonText: { color: storefront.navy, fontSize: 10, fontWeight: '900' },
  paginationWrap: { width: '100%', alignItems: 'center', gap: 8, marginVertical: 8 }, pagination: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 2, paddingVertical: 2 }, pageButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: storefront.border, borderRadius: 9, backgroundColor: '#FFFFFF' }, pageButtonText: { color: storefront.blueDark, fontSize: 10, fontWeight: '800' }, pageNumberButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: storefront.border, borderRadius: 9, backgroundColor: '#FFFFFF' }, pageNumberButtonActive: { borderColor: storefront.blue, backgroundColor: storefront.blue }, pageNumberText: { color: storefront.blueDark, fontSize: 11, fontWeight: '800' }, pageNumberTextActive: { color: '#FFFFFF', fontWeight: '900' }, paginationHint: { color: storefront.muted, fontSize: 9, fontWeight: '600', textAlign: 'center' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 18, padding: 22, borderRadius: 14, backgroundColor: '#FFFFFF' }, trustItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 210 }, trustIcon: { width: 34, height: 34, lineHeight: 34, textAlign: 'center', borderRadius: 17, overflow: 'hidden', color: storefront.blueDark, backgroundColor: storefront.sky, fontSize: 16, fontWeight: '900' }, trustTitle: { color: storefront.text, fontSize: 11, fontWeight: '800' }, trustText: { color: storefront.muted, fontSize: 9, marginTop: 2 }, pressed: { opacity: 0.78 }, disabled: { opacity: 0.45 },
  mobileCartBar: { position: 'absolute', left: 12, right: 12, bottom: 12, height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 16, backgroundColor: storefront.blue, shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } }, mobileCartCount: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, mobileCartCountText: { color: storefront.blueDark, fontSize: 11, fontWeight: '900' }, mobileCartText: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginLeft: 10 }, mobileCartTotal: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  modalBackdrop: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(7,20,38,0.58)' }, cartPanel: { width: 440, maxWidth: '92%', height: '100%', backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: -8, height: 0 } }, cartPanelMobile: { width: '100%', maxWidth: '100%' }, cartHeader: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: storefront.border }, cartTitle: { color: storefront.text, fontSize: 21, fontWeight: '900' }, cartSubtitle: { color: storefront.muted, fontSize: 10, marginTop: 3 }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: storefront.background }, closeText: { color: storefront.text, fontSize: 25, lineHeight: 28 },
  cartList: { flex: 1 }, cartListContent: { padding: 18 }, cartLine: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: storefront.border }, cartImage: { width: 78, height: 78, borderRadius: 9, backgroundColor: storefront.background }, cartLineCopy: { flex: 1 }, cartLineName: { color: storefront.text, fontSize: 12, lineHeight: 17, fontWeight: '700' }, cartLinePrice: { color: storefront.text, fontSize: 13, fontWeight: '900', marginTop: 4 }, cartQuantity: { alignSelf: 'flex-start', height: 36, flexDirection: 'row', alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#C8D8F3', borderRadius: 10, overflow: 'hidden' }, cartQuantityButton: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: storefront.sky }, cartQuantityGlyph: { color: storefront.blueDark, fontSize: 18, lineHeight: 22, fontWeight: '900' }, cartQuantityText: { minWidth: 38, color: storefront.text, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  emptyCart: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 20 }, emptyCartIcon: { fontSize: 42 }, emptyCartTitle: { color: storefront.text, fontSize: 17, fontWeight: '900', marginTop: 14 }, emptyCartText: { color: storefront.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 }, checkoutArea: { padding: 18, paddingBottom: 24, borderTopWidth: 1, borderTopColor: storefront.border, backgroundColor: '#FFFFFF', gap: 9 }, totalRow: { flexDirection: 'row', justifyContent: 'space-between' }, totalLabel: { color: storefront.muted, fontSize: 10 }, totalValue: { color: storefront.text, fontSize: 10, fontWeight: '700' }, grandTotalRow: { marginTop: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: storefront.border }, grandTotalLabel: { color: storefront.text, fontSize: 14, fontWeight: '900' }, grandTotal: { color: storefront.text, fontSize: 18, fontWeight: '900' },
  formTitle: { color: storefront.text, fontSize: 11, fontWeight: '900', marginTop: 7 }, input: { minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#CFD6DF', borderRadius: 9, color: storefront.text, backgroundColor: '#FFFFFF', fontSize: 11 }, modalError: { color: storefront.red, fontSize: 9, lineHeight: 14 }, checkoutButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: storefront.blue }, checkoutButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, disclaimer: { color: storefront.muted, fontSize: 8, textAlign: 'center' }
});
