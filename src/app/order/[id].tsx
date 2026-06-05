import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors as staticColors, spacing, radius, shadows, fontSizes } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { AppColors } from '../../constants/theme';
import type { Order, OrderItem } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  venue:        'business-outline',
  catering:     'restaurant-outline',
  photographer: 'camera-outline',
  av:           'volume-high-outline',
  printing:     'print-outline',
};

const SERVICE_COLORS: Record<string, string> = {
  venue:        staticColors.coral,
  catering:     '#C2773F',
  photographer: staticColors.sage,
  av:           '#7B68C8',
  printing:     staticColors.gold,
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending:   { label: 'Pending',    color: staticColors.gold,        icon: 'time-outline' },
  confirmed: { label: 'Confirmed',  color: staticColors.sage,        icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed',  color: '#4CAF50',          icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled',  color: staticColors.coral,       icon: 'close-circle-outline' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder]       = useState<Order | null>(null);
  const [items, setItems]       = useState<OrderItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isNew, setIsNew]       = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
    // If coming from checkout it's a fresh order
    setIsNew(true);
  }, [id]);

  async function fetchOrder() {
    setLoading(true);
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
    ]);
    setOrder(orderData);
    setItems(itemsData ?? []);
    setLoading(false);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.mutedFg }}>Order not found.</Text>
      </View>
    );
  }

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending;
  const orderId    = order.id.slice(0, 8).toUpperCase();

  // Group items by service type
  const grouped = items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    const key = item.service_type ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Confirmation hero ── */}
        {isNew ? (
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="checkmark-circle" size={64} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Order Placed!</Text>
            <Text style={styles.heroSub}>
              Our team will contact you within 24 hours to confirm your booking.
            </Text>
          </View>
        ) : null}

        {/* ── Order ID + status ── */}
        <View style={styles.card}>
          <View style={styles.orderIdRow}>
            <View>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderIdValue}>{`#${orderId}`}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}18` }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
              <Text style={[styles.statusLabel, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.coral} />
              <View>
                <Text style={styles.metaLabel}>Placed on</Text>
                <Text style={styles.metaValue}>
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            {order.event_date ? (
              <View style={styles.metaItem}>
                <Ionicons name="sparkles-outline" size={16} color={colors.coral} />
                <View>
                  <Text style={styles.metaLabel}>Event Date</Text>
                  <Text style={styles.metaValue}>{order.event_date}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {order.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={14} color={colors.mutedFg} />
              <Text style={styles.notesTxt}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Services booked ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services Booked</Text>

          {Object.entries(grouped).map(([type, groupItems]) => {
            const color = SERVICE_COLORS[type] ?? colors.coral;
            const icon  = SERVICE_ICONS[type]  ?? 'cube-outline';
            const groupTotal = groupItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);

            return (
              <View key={type} style={styles.serviceGroup}>
                {/* Group header */}
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIconWrap, { backgroundColor: `${color}18` }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <Text style={styles.groupLabel}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <Text style={[styles.groupTotal, { color }]}>
                    {`${groupTotal.toLocaleString()} EGP`}
                  </Text>
                </View>

                {/* Items */}
                {groupItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={[styles.itemAccent, { backgroundColor: color }]} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.service_name}
                      </Text>
                      {item.quantity > 1 ? (
                        <Text style={styles.itemMeta}>{`Qty: ${item.quantity}`}</Text>
                      ) : null}
                      {item.metadata?.guestCount ? (
                        <Text style={styles.itemMeta}>{`${item.metadata.guestCount} guests`}</Text>
                      ) : null}
                      {item.metadata?.eventDate ? (
                        <Text style={styles.itemMeta}>{`Date: ${item.metadata.eventDate}`}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>
                      {`${(item.subtotal ?? 0).toLocaleString()} EGP`}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          <View style={styles.divider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {`${(order.total_egp ?? 0).toLocaleString()} EGP`}
            </Text>
          </View>
        </View>

        {/* ── What happens next ── */}
        {isNew ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What happens next?</Text>
            {[
              { icon: 'call-outline',     text: 'Our team will call you within 24 hours to confirm all details.' },
              { icon: 'document-outline', text: 'You\'ll receive a full contract and breakdown for each service.' },
              { icon: 'checkmark-done-outline', text: 'Once confirmed, your event date is officially reserved.' },
            ].map((step, i) => (
              <View key={i} style={styles.nextStep}>
                <View style={styles.nextStepNum}>
                  <Text style={styles.nextStepNumTxt}>{i + 1}</Text>
                </View>
                <View style={[styles.nextStepIcon, { backgroundColor: `${colors.coral}12` }]}>
                  <Ionicons name={step.icon as any} size={18} color={colors.coral} />
                </View>
                <Text style={styles.nextStepTxt}>{step.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)' as any)}
          activeOpacity={0.85}>
          <Ionicons name="home-outline" size={18} color={colors.coral} />
          <Text style={styles.homeBtnTxt}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ordersBtn}
          onPress={() => router.replace('/(tabs)/notifications' as any)}
          activeOpacity={0.85}>
          <Ionicons name="receipt-outline" size={18} color={colors.white} />
          <Text style={styles.ordersBtnTxt}>My Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },

  scroll: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.md },

  // Hero (fresh order)
  hero: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.xl,
    padding: spacing['3xl'],
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroIconWrap: {
    width: 96, height: 96,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.white },
  heroSub: { fontSize: fontSizes.sm, color: `${colors.white}CC`, textAlign: 'center', lineHeight: 22 },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.border },

  // Order ID
  orderIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdLabel: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
  orderIdValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  statusLabel: { fontSize: fontSizes.sm, fontWeight: '700' },

  // Meta
  metaGrid: { flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaLabel: { fontSize: fontSizes.xs, color: colors.mutedFg },
  metaValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal, marginTop: 2 },
  notesBox: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  notesTxt: { flex: 1, fontSize: fontSizes.sm, color: colors.charcoalLight, lineHeight: 20 },

  // Service groups
  serviceGroup: { gap: spacing.sm, marginBottom: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupIconWrap: {
    width: 30, height: 30, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  groupLabel: { flex: 1, fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal },
  groupTotal: { fontSize: fontSizes.sm, fontWeight: '800' },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  itemAccent: { width: 3, height: '100%', borderRadius: 2, marginRight: spacing.md, minHeight: 32 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: fontSizes.sm, fontWeight: '500', color: colors.charcoal },
  itemMeta: { fontSize: fontSizes.xs, color: colors.mutedFg },
  itemPrice: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal, marginLeft: spacing.sm },

  // Grand total
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
  grandTotalValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },

  // Next steps
  nextStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  nextStepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center', justifyContent: 'center',
  },
  nextStepNumTxt: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '800' },
  nextStepIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  nextStepTxt: { flex: 1, fontSize: fontSizes.sm, color: colors.charcoalLight, lineHeight: 20 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
  homeBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.coral,
  },
  homeBtnTxt: { color: colors.coral, fontSize: fontSizes.base, fontWeight: '700' },
  ordersBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  ordersBtnTxt: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}