import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { colors, spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import type { Restaurant } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Egyptian', 'Italian', 'BBQ', 'Seafood', 'Vegetarian', 'International'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CateringScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');

  useEffect(() => {
    fetchRestaurants();
  }, [category]);

  async function fetchRestaurants() {
    setLoading(true);
    let query = supabase.from('restaurants').select('*');
    if (category !== 'All') query = query.ilike('cuisine', category);
    const { data } = await query;
    setRestaurants(data ?? []);
    setLoading(false);
  }

  const filtered = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Catering</Text>
          <Text style={styles.headerSub}>{`${filtered.length} restaurants`}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants or cuisine..."
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

      {/* ── Category chips ── */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryListWrapper}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
            activeOpacity={0.8}>
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={48} color={colors.mutedFg} />
          <Text style={styles.emptyTitle}>No restaurants found</Text>
          <Text style={styles.emptySubtitle}>Try a different category</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => router.push(`/services/catering/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Restaurant Card ──────────────────────────────────────────────────────────

function RestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        {restaurant.images?.[0] ? (
          <Image source={{ uri: restaurant.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="restaurant" size={40} color={colors.mutedFg} />
          </View>
        )}
        <View style={styles.cuisineBadge}>
          <Text style={styles.cuisineBadgeText}>{restaurant.cuisine}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {restaurant.description ?? ''}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Ionicons name="fast-food-outline" size={14} color={colors.mutedFg} />
            <Text style={styles.cardFooterText}>Multiple packages available</Text>
          </View>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.coral} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.charcoal,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: fontSizes.xs,
    color: colors.mutedFg,
    textAlign: 'center',
    marginTop: 2,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.charcoal,
    padding: 0,
  },

  categoryListWrapper: { flexGrow: 0, marginBottom: spacing.lg },
  categoryList: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
  chipTextActive: { color: colors.white },

  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  emptySubtitle: { fontSize: fontSizes.sm, color: colors.mutedFg },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardImageWrap: { height: 160, backgroundColor: colors.muted },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cuisineBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: `${colors.charcoal}CC`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  cuisineBadgeText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  cardInfo: { padding: spacing.lg, gap: spacing.sm },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.charcoal,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.charcoal,
  },
  cardDesc: {
    fontSize: fontSizes.sm,
    color: colors.mutedFg,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  cardFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardFooterText: { fontSize: fontSizes.xs, color: colors.mutedFg },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.coral}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  viewBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },
});