import { router } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import type { CartItem } from '../../types';

const SERVICE_META: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  venue:        { label: 'Venue',          icon: 'business-outline',    color: '#E8714A' },
  catering:     { label: 'Catering',       icon: 'restaurant-outline',  color: '#C2773F' },
  photographer: { label: 'Photography',    icon: 'camera-outline',      color: '#639E6F' },
  av:           { label: 'Audio & Visual', icon: 'volume-high-outline', color: '#7B68C8' },
  printing:     { label: 'Printings',      icon: 'print-outline',       color: '#F5C418' },
};

const SERVICE_ORDER = ['venue', 'catering', 'photographer', 'av', 'printing'];

function getItemSubtitle(item: CartItem): string {
  const m = item.metadata ?? {};
  switch (item.serviceType) {
    case 'catering':     return m.guestCount ? `${m.guestCount} guests · ${m.pricePerPerson} EGP/person` : '';
    case 'photographer': return m.eventDate ? `Date: ${new Date(m.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No date selected';
    case 'av':           return item.quantity > 1 ? `Quantity: ${item.quantity}` : '';
    case 'printing':     return `${item.quantity} piece${item.quantity !== 1 ? 's' : ''}`;
    default:             return '';
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const { items, totalPrice, totalItems, removeItem, clearCart } = useCart();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const grouped = SERVICE_ORDER.reduce<Record<string, CartItem[]>>((acc, type) => {
    const group = items.filter((i) => i.serviceType === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  const serviceCount = Object.keys(grouped).length;

  if (items.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Cart</Text>
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="bag-outline" size={48} color={colors.mutedFg} />
          </View>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySubtitle}>
            Add venues, catering, photography and more to plan your perfect event.
          </Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/services/package' as any)} activeOpacity={0.85}>
            <Text style={s.browseBtnText}>Start Planning</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function confirmClear() {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  }

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={confirmClear} style={s.clearBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.coral} />
          <Text style={s.clearBtnText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Summary pill */}
        <View style={s.summaryPill}>
          <Ionicons name="sparkles-outline" size={16} color={colors.coral} />
          <Text style={s.summaryPillText}>
            {`${serviceCount} service${serviceCount !== 1 ? 's' : ''} · ${totalItems} item${totalItems !== 1 ? 's' : ''} selected`}
          </Text>
        </View>

        {/* Service groups */}
        {Object.entries(grouped).map(([type, groupItems]) => {
          const meta = SERVICE_META[type];
          const groupTotal = groupItems.reduce((sum, i) => sum + i.subtotal, 0);
          return (
            <View key={type} style={s.group}>
              <View style={s.groupHeader}>
                <View style={[s.groupIconWrap, { backgroundColor: `${meta.color}18` }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <Text style={s.groupTitle}>{meta.label}</Text>
                <Text style={s.groupTotal}>{`${groupTotal.toLocaleString()} EGP`}</Text>
              </View>
              {groupItems.map((item) => (
                <CartItemRow
                  key={item.serviceId}
                  item={item}
                  accentColor={meta.color}
                  colors={colors}
                  onRemove={() => removeItem(item.serviceId)}
                />
              ))}
            </View>
          );
        })}

        {/* Order summary */}
        <View style={s.orderSummary}>
          <Text style={s.orderSummaryTitle}>Order Summary</Text>
          {Object.entries(grouped).map(([type, groupItems]) => {
            const meta = SERVICE_META[type];
            const groupTotal = groupItems.reduce((sum, i) => sum + i.subtotal, 0);
            return (
              <View key={type} style={s.summaryRow}>
                <View style={s.summaryRowLeft}>
                  <Ionicons name={meta.icon} size={14} color={colors.mutedFg} />
                  <Text style={s.summaryRowLabel}>{meta.label}</Text>
                </View>
                <Text style={s.summaryRowValue}>{`${groupTotal.toLocaleString()} EGP`}</Text>
              </View>
            );
          })}
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{`${totalPrice.toLocaleString()} EGP`}</Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Checkout bar */}
      <View style={s.checkoutBar}>
        <View>
          <Text style={s.checkoutTotal}>{`${totalPrice.toLocaleString()} EGP`}</Text>
          <Text style={s.checkoutSub}>{`${totalItems} item${totalItems !== 1 ? 's' : ''}`}</Text>
        </View>
        <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout' as any)} activeOpacity={0.85}>
          <Text style={s.checkoutBtnText}>Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartItemRow({
  item, accentColor, colors, onRemove,
}: { item: CartItem; accentColor: string; colors: AppColors; onRemove: () => void }) {
  const s = makeStyles(colors);
  const subtitle = getItemSubtitle(item);
  return (
    <View style={s.itemRow}>
      <View style={[s.itemAccent, { backgroundColor: accentColor }]} />
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>{item.serviceName}</Text>
        {subtitle ? <Text style={s.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.itemRight}>
        <Text style={s.itemPrice}>{`${item.subtotal.toLocaleString()} EGP`}</Text>
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={20} color={colors.mutedFg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.cream },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: spacing.lg,
      backgroundColor: colors.cream,
    },
    headerTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.charcoal },
    clearBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.full, backgroundColor: `${colors.coral}12`,
    },
    clearBtnText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },

    scroll: { paddingTop: spacing.md },

    summaryPill: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing['2xl'], marginBottom: spacing.xl,
      backgroundColor: `${colors.coral}12`,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderRadius: radius.full, alignSelf: 'flex-start',
    },
    summaryPillText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },

    group: {
      backgroundColor: colors.white, marginHorizontal: spacing['2xl'],
      marginBottom: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', ...shadows.sm,
    },
    groupHeader: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    groupIconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    groupTitle: { flex: 1, fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
    groupTotal: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },

    itemRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md, paddingRight: spacing.lg,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    itemAccent: { width: 3, height: '70%', borderRadius: 2, marginHorizontal: spacing.md },
    itemInfo: { flex: 1, gap: 3 },
    itemName: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal },
    itemSubtitle: { fontSize: fontSizes.xs, color: colors.mutedFg },
    itemRight: { alignItems: 'flex-end', gap: spacing.xs, marginLeft: spacing.md },
    itemPrice: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },
    removeBtn: { padding: 2 },

    orderSummary: {
      backgroundColor: colors.white, marginHorizontal: spacing['2xl'],
      marginBottom: spacing.lg, borderRadius: radius.xl,
      padding: spacing.xl, gap: spacing.md, ...shadows.sm,
    },
    orderSummaryTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal, marginBottom: spacing.xs },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    summaryRowLabel: { fontSize: fontSizes.sm, color: colors.mutedFg },
    summaryRowValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
    totalValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },

    emptyWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: spacing['3xl'], gap: spacing.lg,
    },
    emptyIconWrap: {
      width: 96, height: 96, borderRadius: radius.full,
      backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal, textAlign: 'center' },
    emptySubtitle: { fontSize: fontSizes.base, color: colors.mutedFg, textAlign: 'center', lineHeight: 24 },
    browseBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.coral,
      paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg,
      borderRadius: radius.lg, marginTop: spacing.md,
    },
    browseBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },

    checkoutBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.white,
      paddingHorizontal: spacing['2xl'],
      paddingTop: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? 36 : 20,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderTopWidth: 1, borderTopColor: colors.border,
      ...shadows.lg,
    },
    checkoutTotal: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal },
    checkoutSub: { fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 2 },
    checkoutBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.coral,
      paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg,
      borderRadius: radius.lg,
    },
    checkoutBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}
