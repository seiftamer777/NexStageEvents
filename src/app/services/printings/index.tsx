import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TextInput,
  TouchableOpacity, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useCart } from '../../../context/CartContext';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../constants/theme';
import type { PrintingItem } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

type CategoryKey = 'all' | 'invitations' | 'menus' | 'banners' | 'table' | 'signage' | 'favors';

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'all',         label: 'All',         icon: 'apps-outline' },
  { key: 'invitations', label: 'Invitations', icon: 'mail-outline' },
  { key: 'menus',       label: 'Menus',       icon: 'reader-outline' },
  { key: 'banners',     label: 'Banners',     icon: 'flag-outline' },
  { key: 'table',       label: 'Table',       icon: 'grid-outline' },
  { key: 'signage',     label: 'Signage',     icon: 'map-outline' },
  { key: 'favors',      label: 'Favors',      icon: 'gift-outline' },
];

const CATEGORY_LABELS: Record<string, string> = {
  invitations: 'Invitations',
  menus:       'Menus',
  banners:     'Banners',
  table:       'Table Items',
  signage:     'Signage',
  favors:      'Favors & Extras',
};

type QuantityMap = Record<string, number>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrintingsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { addItem } = useCart();

  const [items, setItems]           = useState<PrintingItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<CategoryKey>('all');
  const [quantities, setQuantities] = useState<QuantityMap>({});

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from('printing_items')
      .select('*')
      .order('category')
      .order('price_per_unit', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }

  // ── Quantity helpers ─────────────────────────────────────────────────────

  function setQty(id: string, qty: number) {
    setQuantities((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: qty };
    });
  }

  function increment(id: string, step = 1) {
    setQty(id, (quantities[id] ?? 0) + step);
  }

  function decrement(id: string, step = 1) {
    setQty(id, Math.max(0, (quantities[id] ?? 0) - step));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedItems = items.filter((i) => (quantities[i.id] ?? 0) > 0);

  const totalPrice = selectedItems.reduce(
    (sum, i) => sum + i.price_per_unit * (quantities[i.id] ?? 0),
    0
  );

  const totalQty = selectedItems.reduce(
    (sum, i) => sum + (quantities[i.id] ?? 0),
    0
  );

  const filtered = items.filter((i) => {
    const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'all' || i.category === category;
    return matchSearch && matchCat;
  });

  const grouped = filtered.reduce<Record<string, PrintingItem[]>>((acc, item) => {
    const key = item.category ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([cat, data]) => ({
    title: CATEGORY_LABELS[cat] ?? cat,
    key: cat,
    data,
  }));

  // ── Add to cart ──────────────────────────────────────────────────────────

  function handleAddToCart() {
    selectedItems.forEach((item) => {
      const qty = quantities[item.id] ?? 0;
      if (qty > 0) {
        addItem({
          serviceType: 'printing',
          serviceId:   item.id,
          serviceName: item.name,
          quantity:    qty,
          unitPrice:   item.price_per_unit,
          subtotal:    item.price_per_unit * qty,
          metadata:    { category: item.category },
        });
      }
    });
    router.push('/(tabs)/cart' as any);
  }

  // ────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Printings</Text>
          <Text style={styles.headerSub}>
            {totalQty > 0
              ? `${totalQty} item${totalQty !== 1 ? 's' : ''} selected`
              : 'Choose printed materials'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={colors.mutedFg}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── List ── */}
      <SectionList
        ListHeaderComponent={
          <View style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.chip, category === cat.key && styles.chipActive]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.8}>
                <Ionicons
                  name={cat.icon as any}
                  size={13}
                  color={category === cat.key ? colors.white : colors.charcoalLight}
                />
                <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        sections={loading ? [] : sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>
              {`${section.data.length} item${section.data.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <PrintingCard
            item={item}
            colors={colors}
            quantity={quantities[item.id] ?? 0}
            onIncrement={() => increment(item.id)}
            onDecrement={() => decrement(item.id)}
            onIncrementTen={() => increment(item.id, 10)}
            onDecrementTen={() => decrement(item.id, 10)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="print-outline" size={48} color={colors.mutedFg} />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptySubtitle}>Try a different category</Text>
            </View>
          ) : (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.coral} />
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: totalQty > 0 ? 120 : 40 }} />}
      />

      {/* ── Sticky bottom bar ── */}
      {totalQty > 0 ? (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>
              {`${selectedItems.length} type${selectedItems.length !== 1 ? 's' : ''} · ${totalQty} pcs`}
            </Text>
            <Text style={styles.bottomTotal}>
              {`${totalPrice.toLocaleString()} EGP`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddToCart}
            activeOpacity={0.85}>
            <Ionicons name="bag-add-outline" size={20} color={colors.white} />
            <Text style={styles.addBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      ) : null}

    </View>
  );
}

// ─── Printing Card ────────────────────────────────────────────────────────────

function PrintingCard({
  item,
  colors,
  quantity,
  onIncrement,
  onDecrement,
  onIncrementTen,
  onDecrementTen,
}: {
  item: PrintingItem;
  colors: AppColors;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onIncrementTen: () => void;
  onDecrementTen: () => void;
}) {
  const styles = makeStyles(colors);
  const isSelected = quantity > 0;

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>

      {/* Image */}
      <View style={styles.cardImageWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="print-outline" size={28} color={colors.mutedFg} />
          </View>
        )}
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{`×${quantity}`}</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>

        <View>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.cardPrice}>
              {`${item.price_per_unit?.toLocaleString() ?? '—'} EGP`}
            </Text>
            <Text style={styles.cardPriceSub}>{' / piece'}</Text>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description ?? ''}</Text>
        </View>

        {/* Controls */}
        <View style={styles.cardFooter}>
          {isSelected ? (
            <Text style={styles.subtotalText}>
              {`${(item.price_per_unit * quantity).toLocaleString()} EGP`}
            </Text>
          ) : (
            <Text style={styles.tapToAdd}>Tap + to add</Text>
          )}

          <View style={styles.qtyRow}>
            {/* −10 */}
            <TouchableOpacity
              style={[styles.qtyBtnSm, !isSelected && styles.qtyBtnDisabled]}
              onPress={onDecrementTen}
              disabled={!isSelected}
              activeOpacity={0.7}>
              <Text style={[styles.qtyBtnSmText, !isSelected && { color: colors.border }]}>
                −10
              </Text>
            </TouchableOpacity>

            {/* − */}
            <TouchableOpacity
              style={[styles.qtyBtn, !isSelected && styles.qtyBtnDisabled]}
              onPress={onDecrement}
              disabled={!isSelected}
              activeOpacity={0.7}>
              <Ionicons name="remove" size={15} color={isSelected ? colors.coral : colors.border} />
            </TouchableOpacity>

            <View style={[styles.qtyDisplay, isSelected && styles.qtyDisplayActive]}>
              <Text style={[styles.qtyValue, isSelected && styles.qtyValueActive]}>
                {quantity}
              </Text>
            </View>

            {/* + */}
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={onIncrement}
              activeOpacity={0.7}>
              <Ionicons name="add" size={15} color={colors.coral} />
            </TouchableOpacity>

            {/* +10 */}
            <TouchableOpacity
              style={styles.qtyBtnSm}
              onPress={onIncrementTen}
              activeOpacity={0.7}>
              <Text style={styles.qtyBtnSmText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg, fontWeight: '700',
    color: colors.charcoal, textAlign: 'center',
  },
  headerSub: {
    fontSize: fontSizes.xs, color: colors.mutedFg,
    textAlign: 'center', marginTop: 2,
  },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.sm, marginBottom: spacing.lg,
    ...shadows.sm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.charcoal, padding: 0 },

  // Category chips
  categoryScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.charcoalLight },
  chipTextActive: { color: colors.white },

  // List
  list: { paddingBottom: spacing['4xl'] },
  loader: { paddingTop: 60, alignItems: 'center' },
  empty: {
    alignItems: 'center', paddingTop: 60, gap: spacing.sm,
    paddingHorizontal: spacing['2xl'],
  },
  emptyTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  emptySubtitle: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  sectionCount: { fontSize: fontSizes.xs, color: colors.mutedFg },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: { borderColor: colors.coral },
  cardImageWrap: {
    width: 110,
    height: 160,
    backgroundColor: colors.muted,
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectedBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.sm,
  },
  selectedBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },

  // Card body
  cardBody: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardName: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal, marginBottom: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  cardPrice: { fontSize: fontSizes.base, fontWeight: '800', color: colors.coral },
  cardPriceSub: { fontSize: fontSizes.xs, color: colors.mutedFg },
  cardDesc: { fontSize: fontSizes.xs, color: colors.mutedFg, lineHeight: 17 },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  subtotalText: { fontSize: fontSizes.xs, color: colors.sage, fontWeight: '600' },
  tapToAdd: { fontSize: fontSizes.xs, color: colors.mutedFg },

  // Quantity
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: radius.full,
    backgroundColor: `${colors.coral}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { backgroundColor: colors.muted },
  qtyBtnSm: {
    height: 26,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: `${colors.coral}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnSmText: { fontSize: 10, fontWeight: '700', color: colors.coral },
  qtyDisplay: {
    width: 30, height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyDisplayActive: { backgroundColor: `${colors.coral}20` },
  qtyValue: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.charcoalLight },
  qtyValueActive: { color: colors.coral },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
  bottomLabel: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
  bottomTotal: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  addBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}