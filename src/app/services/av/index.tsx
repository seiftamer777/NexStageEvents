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
import type { AVEquipment } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

type CategoryKey = 'all' | 'stage' | 'led' | 'projector' | 'audio' | 'monitors' | 'lights';

const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'all',       label: 'All',       icon: 'apps-outline' },
  { key: 'stage',     label: 'Stage',     icon: 'podium-outline' },
  { key: 'led',       label: 'LED',       icon: 'tv-outline' },
  { key: 'projector', label: 'Projector', icon: 'film-outline' },
  { key: 'audio',     label: 'Audio',     icon: 'volume-high-outline' },
  { key: 'monitors',  label: 'Monitors',  icon: 'headset-outline' },
  { key: 'lights',    label: 'Lights',    icon: 'flashlight-outline' },
];

const CATEGORY_LABELS: Record<string, string> = {
  stage:     'Stage',
  led:       'LED Screens',
  projector: 'Projectors',
  audio:     'Audio & Microphones',
  monitors:  'Stage Monitors',
  lights:    'Lighting',
};

type QuantityMap = Record<string, number>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AVScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { addItem, removeItem, isInCart } = useCart();

  const [equipment, setEquipment]     = useState<AVEquipment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<CategoryKey>('all');
  const [quantities, setQuantities]   = useState<QuantityMap>({});

  useEffect(() => {
    fetchEquipment();
  }, []);

  async function fetchEquipment() {
    setLoading(true);
    const { data } = await supabase
      .from('av_equipment')
      .select('*')
      .order('category')
      .order('price_per_day', { ascending: false });
    setEquipment(data ?? []);
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

  function increment(id: string) {
    setQty(id, (quantities[id] ?? 0) + 1);
  }

  function decrement(id: string) {
    setQty(id, (quantities[id] ?? 0) - 1);
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const selectedItems = equipment.filter((e) => (quantities[e.id] ?? 0) > 0);

  const totalPrice = selectedItems.reduce(
    (sum, e) => sum + e.price_per_day * (quantities[e.id] ?? 0),
    0
  );

  const totalItems = selectedItems.reduce(
    (sum, e) => sum + (quantities[e.id] ?? 0),
    0
  );

  // Filter + group into sections
  const filtered = equipment.filter((e) => {
    const matchesSearch = e.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'all' || e.category === category;
    return matchesSearch && matchesCat;
  });

  const grouped = filtered.reduce<Record<string, AVEquipment[]>>((acc, item) => {
    const key = item.category ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([cat, items]) => ({
    title: CATEGORY_LABELS[cat] ?? cat,
    data: items,
  }));

  // ── Add to cart ──────────────────────────────────────────────────────────

  function handleAddToCart() {
    selectedItems.forEach((item) => {
      const qty = quantities[item.id] ?? 0;
      if (qty > 0) {
        addItem({
          serviceType: 'av',
          serviceId: item.id,
          serviceName: item.name,
          quantity: qty,
          unitPrice: item.price_per_day,
          subtotal: item.price_per_day * qty,
          metadata: { category: item.category },
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
          <Text style={styles.headerTitle}>Audio & Visuals</Text>
          <Text style={styles.headerSub}>
            {totalItems > 0
              ? `${totalItems} item${totalItems !== 1 ? 's' : ''} selected`
              : 'Select equipment for your event'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search equipment..."
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

      {/* ── Category tabs ── */}
      <SectionList
        ListHeaderComponent={
          <View>
            {/* Category chips */}
            <View style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, category === cat.key && styles.chipActive]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.8}>
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={category === cat.key ? colors.white : colors.charcoalLight}
                  />
                  <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Loading */}
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.coral} />
              </View>
            ) : null}
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
          <EquipmentCard
            item={item}
            colors={colors}
            quantity={quantities[item.id] ?? 0}
            onIncrement={() => increment(item.id)}
            onDecrement={() => decrement(item.id)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="volume-high-outline" size={48} color={colors.mutedFg} />
              <Text style={styles.emptyTitle}>No equipment found</Text>
              <Text style={styles.emptySubtitle}>Try a different search or category</Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: totalItems > 0 ? 120 : 40 }} />}
      />

      {/* ── Sticky bottom bar ── */}
      {totalItems > 0 ? (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>
              {`${totalItems} item${totalItems !== 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.bottomTotal}>
              {`${totalPrice.toLocaleString()} EGP / day`}
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

// ─── Equipment Card ───────────────────────────────────────────────────────────

function EquipmentCard({
  item,
  colors,
  quantity,
  onIncrement,
  onDecrement,
}: {
  item: AVEquipment;
  colors: AppColors;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const styles = makeStyles(colors);
  const isSelected = quantity > 0;

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>

      {/* Image — fixed size */}
      <View style={styles.cardImageWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="volume-high-outline" size={28} color={colors.mutedFg} />
          </View>
        )}
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
            <Text style={styles.selectedBadgeText}>{`×${quantity}`}</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>
            {`${item.price_per_day?.toLocaleString() ?? '—'} EGP`}
          </Text>
          <Text style={styles.cardPriceSub}>{' / day'}</Text>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>{item.description ?? ''}</Text>

        {/* Quantity + subtotal */}
        <View style={styles.cardFooter}>
          {isSelected ? (
            <Text style={styles.subtotalText}>
              {`${(item.price_per_day * quantity).toLocaleString()} EGP`}
            </Text>
          ) : (
            <Text style={styles.tapToAdd}>Tap + to add</Text>
          )}

          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, !isSelected && styles.qtyBtnDisabled]}
              onPress={onDecrement}
              disabled={!isSelected}
              activeOpacity={0.7}>
              <Ionicons name="remove" size={16} color={isSelected ? colors.coral : colors.border} />
            </TouchableOpacity>

            <View style={[styles.qtyDisplay, isSelected && styles.qtyDisplayActive]}>
              <Text style={[styles.qtyValue, isSelected && styles.qtyValueActive]}>
                {quantity}
              </Text>
            </View>

            <TouchableOpacity style={styles.qtyBtn} onPress={onIncrement} activeOpacity={0.7}>
              <Ionicons name="add" size={16} color={colors.coral} />
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
  chipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
  chipTextActive: { color: colors.white },

  list: { paddingBottom: spacing['4xl'] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty: {
    alignItems: 'center', paddingTop: 60, gap: spacing.sm,
    paddingHorizontal: spacing['2xl'],
  },
  emptyTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  emptySubtitle: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center' },

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
cardSelected: {
  borderColor: colors.coral,
},
cardImageWrap: {
  width: 110,                  // ← fixed width
  height: 160,                 // ← fixed height — key fix
  backgroundColor: colors.muted,
},
cardImage: {
  width: '100%',
  height: '100%',
  resizeMode: 'cover',
},
cardImagePlaceholder: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
selectedBadge: {
  position: 'absolute', top: spacing.sm, left: spacing.sm,
  flexDirection: 'row', alignItems: 'center', gap: 2,
  backgroundColor: colors.coral,
  paddingHorizontal: spacing.xs, paddingVertical: 2,
  borderRadius: radius.sm,
},
selectedBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },

cardBody: {
  flex: 1,
  padding: spacing.md,
  gap: spacing.sm,          // ← natural stacking, no space-between
},
cardName: {
  fontSize: fontSizes.sm,
  fontWeight: '700',
  color: colors.charcoal,
},
priceRow: {
  flexDirection: 'row',
  alignItems: 'baseline',
},
cardPrice: {
  fontSize: fontSizes.base,
  fontWeight: '800',
  color: colors.coral,
},
cardPriceSub: {
  fontSize: fontSizes.xs,
  color: colors.mutedFg,
},
cardDesc: {
  fontSize: fontSizes.xs,
  color: colors.mutedFg,
  lineHeight: 18,
  flex: 1,                  // ← takes remaining space, pushes footer down
},
cardFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
subtotalText: { fontSize: fontSizes.xs, color: colors.sage, fontWeight: '600' },
tapToAdd: { fontSize: fontSizes.xs, color: colors.mutedFg },
qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
qtyBtn: {
  width: 28, height: 28, borderRadius: radius.full,
  backgroundColor: `${colors.coral}15`,
  alignItems: 'center', justifyContent: 'center',
},
qtyBtnDisabled: { backgroundColor: colors.muted },
qtyDisplay: {
  width: 28, height: 28, borderRadius: radius.sm,
  backgroundColor: colors.muted,
  alignItems: 'center', justifyContent: 'center',
},
qtyDisplayActive: { backgroundColor: `${colors.coral}20` },
qtyValue: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoalLight },
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
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