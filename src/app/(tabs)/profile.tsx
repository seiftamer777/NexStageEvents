import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import type { Order } from '../../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const s = makeStyles(colors);

  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fullName = user?.user_metadata?.full_name ?? 'User';
  const email    = user?.email ?? '';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('orders').select('id, status, total_egp').eq('user_id', user.id);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  function onRefresh() { setRefreshing(true); fetchStats(); }

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const totalOrders  = orders.length;
  const totalSpent   = orders.reduce((s, o) => s + ((o as any).total_egp ?? 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const doneCount    = orders.filter(o => o.status === 'completed').length;

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}>

        {/* ── Hero header ── */}
        <View style={s.hero}>
          <View style={s.avatarRing}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={s.heroName}>{fullName}</Text>
          <Text style={s.heroEmail}>{email}</Text>
          <TouchableOpacity style={s.signOutPill} onPress={confirmSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={14} color={colors.coral} />
            <Text style={s.signOutPillTxt}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        {loading ? (
          <View style={s.statsLoader}><ActivityIndicator color={colors.coral} /></View>
        ) : (
          <View style={s.statsRow}>
            <StatCard colors={colors} value={String(totalOrders)} label="Total Orders" />
            <StatCard colors={colors} value={String(pendingCount)} label="Pending" divider />
            <StatCard colors={colors} value={totalSpent > 0 ? `${(totalSpent / 1000).toFixed(1)}K` : '0'} label="EGP Spent" divider />
            <StatCard colors={colors} value={String(doneCount)} label="Completed" divider />
          </View>
        )}

        {/* ── Activity ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Activity</Text>
          <View style={s.menuCard}>
            <MenuItem colors={colors} icon="receipt-outline" label="My Orders" sub="View all your event orders" onPress={() => router.push('/(tabs)/notifications' as any)} />
            <Divider colors={colors} />
            <MenuItem colors={colors} icon="bag-outline" label="Cart" sub="Review items before checkout" onPress={() => router.push('/(tabs)/cart' as any)} />
          </View>
        </View>

        {/* ── Account ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.menuCard}>
            <MenuItem colors={colors} icon="person-outline" label="Edit Profile" sub="Update your name and details" onPress={() => Alert.alert('Coming soon', 'Profile editing is coming soon.')} />
            <Divider colors={colors} />
            <MenuItem colors={colors} icon="lock-closed-outline" label="Change Password" sub="Update your account password" onPress={() => Alert.alert('Coming soon', 'Password change is coming soon.')} />
          </View>
        </View>

        {/* ── Preferences ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferences</Text>
          <View style={s.menuCard}>
            {/* Dark mode toggle row */}
            <View style={s.menuItem}>
              <View style={[s.menuIconWrap, { backgroundColor: `${colors.coral}12` }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={colors.coral} />
              </View>
              <View style={s.menuText}>
                <Text style={s.menuLabel}>Dark Mode</Text>
                <Text style={s.menuSub}>{isDark ? 'Dark theme is on' : 'Light theme is on'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: `${colors.coral}60` }}
                thumbColor={isDark ? colors.coral : colors.white}
              />
            </View>
            <Divider colors={colors} />
            <MenuItem colors={colors} icon="notifications-outline" label="Notifications" sub="Manage push notifications" onPress={() => Alert.alert('Coming soon', 'Notification settings are coming soon.')} />
          </View>
        </View>

        {/* ── Support ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Support</Text>
          <View style={s.menuCard}>
            <MenuItem colors={colors} icon="help-circle-outline" label="Help & Support" sub="Get help or report an issue" onPress={() => Alert.alert('Coming soon', 'Support is coming soon.')} />
            <Divider colors={colors} />
            <MenuItem colors={colors} icon="shield-checkmark-outline" label="Privacy Policy" sub="How we handle your data" onPress={() => Alert.alert('Coming soon', 'Privacy policy is coming soon.')} />
            <Divider colors={colors} />
            <MenuItem colors={colors} icon="document-text-outline" label="Terms of Service" sub="Our terms and conditions" onPress={() => Alert.alert('Coming soon', 'Terms are coming soon.')} />
          </View>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={s.signOutBtn} onPress={confirmSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>NexStage v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, divider, colors }: { value: string; label: string; divider?: boolean; colors: AppColors }) {
  const s = makeStyles(colors);
  return (
    <View style={[s.statCard, divider && s.statDivider]}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

function MenuItem({ icon, label, sub, onPress, iconColor, colors }: {
  icon: IconName; label: string; sub: string;
  onPress: () => void; iconColor?: string; colors: AppColors;
}) {
  const s = makeStyles(colors);
  const ic = iconColor ?? colors.coral;
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIconWrap, { backgroundColor: `${ic}12` }]}>
        <Ionicons name={icon} size={18} color={ic} />
      </View>
      <View style={s.menuText}>
        <Text style={s.menuLabel}>{label}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: AppColors }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 70 }} />;
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.cream },
    scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 48 },

    hero: { alignItems: 'center', paddingHorizontal: spacing['2xl'], paddingBottom: spacing['2xl'], gap: spacing.sm },
    avatarRing: { padding: 3, borderRadius: radius.full, borderWidth: 2, borderColor: colors.coral, marginBottom: spacing.xs },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.white },
    heroName: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal },
    heroEmail: { fontSize: fontSizes.sm, color: colors.mutedFg },
    signOutPill: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
      borderRadius: radius.full, borderWidth: 1, borderColor: `${colors.coral}40`,
      backgroundColor: `${colors.coral}08`,
    },
    signOutPillTxt: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },

    statsLoader: { paddingVertical: spacing['2xl'], alignItems: 'center' },
    statsRow: {
      flexDirection: 'row', marginHorizontal: spacing['2xl'], marginBottom: spacing['2xl'],
      backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadows.sm,
    },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
    statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
    statValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },
    statLabel: { fontSize: 10, color: colors.mutedFg, fontWeight: '500', textAlign: 'center' },

    section: { marginBottom: spacing.lg },
    sectionTitle: {
      fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: 0.8, color: colors.mutedFg,
      marginHorizontal: spacing['2xl'], marginBottom: spacing.sm,
    },
    menuCard: {
      marginHorizontal: spacing['2xl'], backgroundColor: colors.white,
      borderRadius: radius.xl, overflow: 'hidden', ...shadows.sm,
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
    },
    menuIconWrap: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    menuText: { flex: 1, gap: 2 },
    menuLabel: { fontSize: fontSizes.base, fontWeight: '600', color: colors.charcoal },
    menuSub: { fontSize: fontSizes.xs, color: colors.mutedFg },

    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
      marginHorizontal: spacing['2xl'], marginTop: spacing.sm,
      paddingVertical: spacing.lg, borderRadius: radius.xl,
      borderWidth: 1, borderColor: `${colors.coral}40`, backgroundColor: `${colors.coral}08`,
    },
    signOutTxt: { fontSize: fontSizes.base, fontWeight: '700', color: colors.coral },

    version: { textAlign: 'center', marginTop: spacing.xl, fontSize: fontSizes.xs, color: colors.mutedFg },
  });
}
