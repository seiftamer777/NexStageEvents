import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../constants/theme';
import type { AppColors } from '../constants/theme';
import type { Order, OrderItem } from '../types';

const STATUS_META: Record<string, {
  label: string; color: string; bg: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  pending:   { label: 'Pending',   color: '#B45309',  bg: '#F5C41820', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#639E6F',  bg: '#639E6F20', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#4CAF50',  bg: '#4CAF5020', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#E8714A',  bg: '#E8714A20', icon: 'close-circle-outline' },
};

const SERVICE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  venue: 'business-outline', catering: 'restaurant-outline',
  photographer: 'camera-outline', av: 'volume-high-outline', printing: 'print-outline',
};
const SERVICE_COLORS: Record<string, string> = {
  venue: '#E8714A', catering: '#C2773F', photographer: '#639E6F', av: '#7B68C8', printing: '#F5C418',
};

type OrderWithItems = Order & { order_items: OrderItem[] };
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
const FILTERS: StatusFilter[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function OrdersScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [orders,       setOrders]       = useState<OrderWithItems[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  function onRefresh() { setRefreshing(true); fetchOrders(); }

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter);

  return (
    <View style={s.screen}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>My Orders</Text>
          {orders.length > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{orders.length}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersWrap} contentContainerStyle={s.filters}>
        {FILTERS.map(f => {
          const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
          const active = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.pill, active && s.pillActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}>
              <Text style={[s.pillTxt, active && s.pillTxtActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {count > 0 && (
                <View style={[s.pillBadge, active && s.pillBadgeActive]}>
                  <Text style={[s.pillBadgeTxt, active && s.pillBadgeTxtActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}>
        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={colors.coral} /></View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={40} color={colors.mutedFg} />
            </View>
            <Text style={s.emptyTitle}>
              {activeFilter === 'all' ? 'No orders yet' : `No ${activeFilter} orders`}
            </Text>
            <Text style={s.emptySub}>
              {activeFilter === 'all'
                ? 'Start planning your event and your orders will appear here.'
                : 'Try a different filter above.'}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity style={s.planBtn} onPress={() => router.push('/(tabs)' as any)} activeOpacity={0.85}>
                <Text style={s.planBtnTxt}>Start Planning</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(order => (
            <OrderCard key={order.id} order={order} colors={colors} onPress={() => router.push(`/order/${order.id}` as any)} />
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, colors, onPress }: { order: OrderWithItems; colors: AppColors; onPress: () => void }) {
  const s = makeStyles(colors);
  const status   = STATUS_META[order.status] ?? STATUS_META.pending;
  const orderId  = order.id.slice(0, 8).toUpperCase();
  const items    = order.order_items ?? [];
  const services = [...new Set(items.map(i => i.service_type).filter(Boolean))];

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      <View style={s.cardTop}>
        <View>
          <Text style={s.cardId}>{`#${orderId}`}</Text>
          <Text style={s.cardDate}>
            {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={11} color={status.color} />
          <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      {services.length > 0 && (
        <View style={s.services}>
          {services.map(type => (
            <View key={type} style={[s.serviceIcon, { backgroundColor: `${SERVICE_COLORS[type] ?? colors.coral}18` }]}>
              <Ionicons name={SERVICE_ICONS[type] ?? 'cube-outline'} size={13} color={SERVICE_COLORS[type] ?? colors.coral} />
            </View>
          ))}
          <Text style={s.itemCount}>{`${items.length} item${items.length !== 1 ? 's' : ''}`}</Text>
        </View>
      )}
      {order.event_date && (
        <View style={s.eventRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedFg} />
          <Text style={s.eventTxt}>{`Event: ${order.event_date}`}</Text>
        </View>
      )}
      <View style={s.cardFooter}>
        <Text style={s.total}>{`${(order.total_egp ?? 0).toLocaleString()} EGP`}</Text>
        <View style={s.viewBtn}>
          <Text style={s.viewBtnTxt}>View Details</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.coral} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.cream },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingBottom: spacing.lg,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: radius.full,
      backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    headerMid: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.charcoal },
    headerBadge: {
      backgroundColor: colors.coral, borderRadius: radius.full,
      minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    },
    headerBadgeTxt: { color: colors.white, fontSize: 11, fontWeight: '700' },

    filtersWrap: { flexGrow: 0, marginBottom: spacing.lg },
    filters: { paddingHorizontal: spacing['2xl'], gap: spacing.sm },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderRadius: radius.full, backgroundColor: colors.white,
      borderWidth: 1, borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.coral, borderColor: colors.coral },
    pillTxt: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
    pillTxtActive: { color: colors.white },
    pillBadge: {
      minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.muted,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    pillBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    pillBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.charcoalLight },
    pillBadgeTxtActive: { color: colors.white },

    list: { paddingHorizontal: spacing['2xl'], gap: spacing.lg },
    center: { paddingTop: 80, alignItems: 'center' },

    empty: { alignItems: 'center', paddingTop: spacing['4xl'], paddingHorizontal: spacing['3xl'], gap: spacing.lg },
    emptyIcon: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal, textAlign: 'center' },
    emptySub: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 22 },
    planBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.coral,
      paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
      borderRadius: radius.lg, marginTop: spacing.sm,
    },
    planBtnTxt: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },

    card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, ...shadows.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardId: { fontSize: fontSizes.md, fontWeight: '800', color: colors.charcoal },
    cardDate: { fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 2 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    statusTxt: { fontSize: fontSizes.xs, fontWeight: '700' },
    services: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    serviceIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    itemCount: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
    eventRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      backgroundColor: colors.muted, paddingHorizontal: spacing.sm, paddingVertical: 4,
      borderRadius: radius.sm, alignSelf: 'flex-start',
    },
    eventTxt: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    total: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },
    viewBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: `${colors.coral}15`, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full,
    },
    viewBtnTxt: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },
  });
}
