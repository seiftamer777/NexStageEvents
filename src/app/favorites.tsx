import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../constants/theme';
import type { AppColors } from '../constants/theme';
import type { FavoriteItem, ServiceKind } from '../hooks/useFavorite';

// ─── Meta ──────────────────────────────────────────────────────────────────────

const KIND_META: Record<ServiceKind, {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: (id: string) => string;
}> = {
  venue:        { label: 'Venues',       icon: 'business-outline',    color: '#E8714A', route: id => `/services/venues/${id}` },
  restaurant:   { label: 'Catering',     icon: 'restaurant-outline',  color: '#C2773F', route: id => `/services/catering/${id}` },
  photographer: { label: 'Photography',  icon: 'camera-outline',      color: '#639E6F', route: id => `/services/photographers/${id}` },
  av:           { label: 'Audio & Visual',icon: 'volume-high-outline', color: '#7B68C8', route: () => '/services/av' },
  printing:     { label: 'Printings',    icon: 'print-outline',       color: '#F5C418', route: () => '/services/printings' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [favorites,  setFavorites]  = useState<FavoriteItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<ServiceKind | 'all'>('all');

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setFavorites((data as FavoriteItem[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  function onRefresh() { setRefreshing(true); fetch(); }

  async function removeFavorite(fav: FavoriteItem) {
    Alert.alert(
      'Remove from Favorites',
      `Remove "${fav.service_name}" from your saved items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await supabase.from('favorites').delete().eq('id', fav.id);
            setFavorites(prev => prev.filter(f => f.id !== fav.id));
          },
        },
      ]
    );
  }

  const filtered = filter === 'all' ? favorites : favorites.filter(f => f.service_type === filter);

  // Available kinds that have at least one favorite
  const kinds = (Object.keys(KIND_META) as ServiceKind[]).filter(k =>
    favorites.some(f => f.service_type === k)
  );

  return (
    <View style={s.screen}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Saved</Text>
          {favorites.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{favorites.length}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      {kinds.length > 1 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.filtersWrap} contentContainerStyle={s.filters}>
          {['all', ...kinds].map(k => {
            const meta = k === 'all' ? null : KIND_META[k as ServiceKind];
            const count = k === 'all' ? favorites.length : favorites.filter(f => f.service_type === k).length;
            const active = filter === k;
            return (
              <TouchableOpacity
                key={k}
                style={[s.pill, active && s.pillActive]}
                onPress={() => setFilter(k as any)}
                activeOpacity={0.8}>
                {meta && <Ionicons name={meta.icon} size={13} color={active ? colors.white : colors.charcoalLight} />}
                <Text style={[s.pillTxt, active && s.pillTxtActive]}>
                  {k === 'all' ? 'All' : meta?.label}
                </Text>
                <View style={[s.pillBadge, active && s.pillBadgeActive]}>
                  <Text style={[s.pillBadgeTxt, active && s.pillBadgeTxtActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.coral} /></View>
      ) : favorites.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={40} color={colors.mutedFg} />
          </View>
          <Text style={s.emptyTitle}>No saved items yet</Text>
          <Text style={s.emptySub}>
            Tap the heart icon on any venue, photographer, or service to save it here.
          </Text>
          <TouchableOpacity style={s.exploreBtn} onPress={() => router.push('/(tabs)' as any)} activeOpacity={0.85}>
            <Text style={s.exploreBtnTxt}>Explore Services</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral} />}>

          {filtered.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyTitle}>No {KIND_META[filter as ServiceKind]?.label} saved</Text>
            </View>
          ) : (
            filtered
              .filter(fav => !!KIND_META[fav.service_type])
              .map(fav => (
                <FavoriteCard
                  key={fav.id}
                  fav={fav}
                  colors={colors}
                  onRemove={() => removeFavorite(fav)}
                  onPress={() => router.push(KIND_META[fav.service_type].route(fav.service_id) as any)}
                />
              ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Favorite Card ────────────────────────────────────────────────────────────

function FavoriteCard({ fav, colors, onRemove, onPress }: {
  fav: FavoriteItem; colors: AppColors;
  onRemove: () => void; onPress: () => void;
}) {
  const s    = makeStyles(colors);
  const meta = KIND_META[fav.service_type] ?? KIND_META.venue;

  if (!KIND_META[fav.service_type]) return null;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={s.cardImg}>
        {fav.service_image ? (
          <Image source={{ uri: fav.service_image }} style={s.cardImgSrc} />
        ) : (
          <View style={[s.cardImgPlaceholder, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={28} color={meta.color} />
          </View>
        )}
        {/* Type badge */}
        <View style={[s.typeBadge, { backgroundColor: `${meta.color}EE` }]}>
          <Ionicons name={meta.icon} size={10} color="#fff" />
          <Text style={s.typeBadgeTxt}>{meta.label}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>{fav.service_name}</Text>
        {fav.service_price != null && (
          <Text style={s.cardPrice}>{`${fav.service_price.toLocaleString()} EGP`}</Text>
        )}
        <View style={s.cardFooter}>
          <TouchableOpacity style={s.viewBtn} onPress={onPress}>
            <Text style={s.viewBtnTxt}>View</Text>
            <Ionicons name="arrow-forward" size={12} color={meta.color} />
          </TouchableOpacity>
          <TouchableOpacity style={s.heartBtn} onPress={onRemove} hitSlop={8}>
            <Ionicons name="heart" size={20} color="#FF4B6E" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

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
    badge: {
      backgroundColor: '#FF4B6E', borderRadius: radius.full,
      minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
    },
    badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

    filtersWrap: { flexGrow: 0, marginBottom: spacing.md },
    filters: { paddingHorizontal: spacing['2xl'], gap: spacing.sm },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.full, backgroundColor: colors.white,
      borderWidth: 1, borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.coral, borderColor: colors.coral },
    pillTxt: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.charcoalLight },
    pillTxtActive: { color: colors.white },
    pillBadge: {
      minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.muted,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    pillBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    pillBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.charcoalLight },
    pillBadgeTxtActive: { color: colors.white },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing['3xl'] },
    emptyIcon: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal, textAlign: 'center' },
    emptySub: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 22 },
    exploreBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.coral,
      paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
      borderRadius: radius.lg, marginTop: spacing.sm,
    },
    exploreBtnTxt: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700' },

    list: { paddingHorizontal: spacing['2xl'], gap: spacing.md },

    card: {
      flexDirection: 'row', backgroundColor: colors.white,
      borderRadius: radius.xl, overflow: 'hidden', ...shadows.md,
    },
    cardImg: { width: 100, position: 'relative' },
    cardImgSrc: { width: '100%', height: '100%', resizeMode: 'cover' },
    cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    typeBadge: {
      position: 'absolute', bottom: spacing.xs, left: spacing.xs,
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm,
    },
    typeBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
    cardBody: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
    cardName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
    cardPrice: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral, marginTop: 2 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
    viewBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: `${colors.coral}12`,
      paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
    },
    viewBtnTxt: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.coral },
    heartBtn: { padding: 4 },
  });
}
