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
import type { Notification } from '../types';

const TYPE_META: Record<Notification['type'], {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
}> = {
  order:  { icon: 'receipt-outline',             color: '#E8714A', bg: '#E8714A15' },
  system: { icon: 'information-circle-outline',  color: '#7B68C8', bg: '#7B68C815' },
  promo:  { icon: 'gift-outline',                color: '#F5C418', bg: '#F5C41815' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  function onRefresh() { setRefreshing(true); fetch(); }

  async function markAllRead() {
    if (!user || unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handlePress(n: Notification) {
    // mark read
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    if (n.type === 'order') router.push('/orders' as any);
  }

  // Group by date
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  function groupLabel(dateStr: string): string {
    const d = new Date(dateStr).toDateString();
    if (d === today)     return 'Today';
    if (d === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  const grouped = notifications.reduce<{ label: string; items: Notification[] }[]>((acc, n) => {
    const label = groupLabel(n.created_at);
    const existing = acc.find(g => g.label === label);
    if (existing) existing.items.push(n);
    else acc.push({ label, items: [n] });
    return acc;
  }, []);

  return (
    <View style={s.screen}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeTxt}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="notifications-outline" size={40} color={colors.mutedFg} />
          </View>
          <Text style={s.emptyTitle}>No notifications yet</Text>
          <Text style={s.emptySub}>
            Order updates, confirmations, and alerts will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}>

          {grouped.map(group => (
            <View key={group.label}>
              <Text style={s.groupLabel}>{group.label}</Text>
              {group.items.map(n => {
                const meta = TYPE_META[n.type] ?? TYPE_META.system;
                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[s.card, !n.is_read && s.cardUnread]}
                    onPress={() => handlePress(n)}
                    activeOpacity={0.85}>
                    <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                    <View style={s.body}>
                      <View style={s.topRow}>
                        <Text style={[s.title, !n.is_read && s.titleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={s.time}>{timeAgo(n.created_at)}</Text>
                      </View>
                      <Text style={s.bodyTxt} numberOfLines={2}>{n.body}</Text>
                    </View>
                    {!n.is_read && <View style={[s.dot, { backgroundColor: meta.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.cream },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingBottom: spacing.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: radius.full,
      backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    headerMid: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal },
    unreadBadge: {
      backgroundColor: colors.coral, borderRadius: radius.full,
      minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    },
    unreadBadgeTxt: { color: colors.white, fontSize: 11, fontWeight: '700' },
    markAllBtn: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.lg, backgroundColor: `${colors.coral}12`,
    },
    markAllTxt: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.coral },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: spacing.lg, paddingHorizontal: spacing['3xl'],
    },
    emptyIcon: {
      width: 80, height: 80, borderRadius: radius.full,
      backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
    emptySub: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 22 },
    list: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.sm },
    groupLabel: {
      fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: 0.8, color: colors.mutedFg,
      marginTop: spacing.lg, marginBottom: spacing.sm,
    },
    card: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: colors.white, borderRadius: radius.xl,
      padding: spacing.md, gap: spacing.md,
      marginBottom: spacing.sm, ...shadows.sm,
    },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.coral },
    iconWrap: {
      width: 44, height: 44, borderRadius: radius.lg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    body: { flex: 1, gap: 4 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { flex: 1, fontSize: fontSizes.sm, fontWeight: '500', color: colors.charcoalLight, marginRight: spacing.sm },
    titleUnread: { fontWeight: '700', color: colors.charcoal },
    bodyTxt: { fontSize: fontSizes.xs, color: colors.mutedFg, lineHeight: 18 },
    time: { fontSize: 10, color: colors.mutedFg, flexShrink: 0 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  });
}
