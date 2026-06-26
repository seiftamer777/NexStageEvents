import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Image, Platform, ActivityIndicator,
  Modal, Animated, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../constants/theme';
import type { Photographer } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES = ['All', 'Individual', 'Company'] as const;
type PhotographerType = (typeof TYPES)[number];

const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price_asc',  icon: 'trending-up-outline' },
  { label: 'Price: High to Low', value: 'price_desc', icon: 'trending-down-outline' },
  { label: 'Top Rated',          value: 'rating',     icon: 'star-outline' },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const PRICE_OPTIONS = [
  { label: 'Any',         min: 0,     max: 999999 },
  { label: 'Up to 3k',   min: 0,     max: 3000 },
  { label: '3k – 6k',    min: 3000,  max: 6000 },
  { label: '6k – 9k',    min: 6000,  max: 9000 },
  { label: '9k+',        min: 9000,  max: 999999 },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildCalendarDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PhotographersScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [type, setType]                   = useState<PhotographerType>('All');

  // Applied filters
  const [sortBy, setSortBy]       = useState<SortValue>('rating');
  const [priceIdx, setPriceIdx]   = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Temp filters (inside sheet)
  const [tempSort, setTempSort]         = useState<SortValue>('rating');
  const [tempPriceIdx, setTempPriceIdx] = useState(0);
  const [tempDate, setTempDate]         = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const calendarDays = buildCalendarDays();

  useEffect(() => {
    fetchPhotographers();
  }, [type, sortBy, priceIdx]);

  async function fetchPhotographers() {
    setLoading(true);

    let query = supabase.from('photographers').select('*');

    if (type !== 'All') {
      query = query.ilike('type', type);
    }

    const price = PRICE_OPTIONS[priceIdx];
    if (price.min > 0)      query = query.gte('price_per_day', price.min);
    if (price.max < 999999) query = query.lte('price_per_day', price.max);

    if (sortBy === 'price_asc')  query = query.order('price_per_day', { ascending: true });
    if (sortBy === 'price_desc') query = query.order('price_per_day', { ascending: false });
    if (sortBy === 'rating')     query = query.order('rating',        { ascending: false });

    const { data } = await query;
    setPhotographers(data ?? []);
    setLoading(false);
  }

  const filtered = photographers.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeFilterCount =
    (sortBy !== 'rating' ? 1 : 0) +
    (priceIdx !== 0 ? 1 : 0) +
    (selectedDate ? 1 : 0);

  // ── Sheet ────────────────────────────────────────────────────────────────

  function openSheet() {
    setTempSort(sortBy);
    setTempPriceIdx(priceIdx);
    setTempDate(selectedDate);
    setFilterOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200,
    }).start();
  }

  function closeSheet() {
    Animated.timing(sheetAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => setFilterOpen(false));
  }

  function applyFilters() {
    setSortBy(tempSort);
    setPriceIdx(tempPriceIdx);
    setSelectedDate(tempDate);
    closeSheet();
  }

  function resetFilters() {
    setTempSort('rating');
    setTempPriceIdx(0);
    setTempDate(null);
  }

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Photography</Text>
          <Text style={styles.headerSub}>{`${filtered.length} available`}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={openSheet}>
          <Ionicons name="options-outline" size={22} color={colors.charcoal} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{`${activeFilterCount}`}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search photographers..."
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

      {/* ── Type chips ── */}
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => setType(t)}
            activeOpacity={0.8}>
            <Ionicons
              name={
                t === 'Individual' ? 'person-outline'
                : t === 'Company'  ? 'business-outline'
                : 'apps-outline'
              }
              size={14}
              color={type === t ? colors.white : colors.charcoalLight}
            />
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}

        {/* Active date pill */}
        {selectedDate ? (
          <TouchableOpacity style={styles.activePill} onPress={() => setSelectedDate(null)}>
            <Ionicons name="calendar" size={12} color={colors.coral} />
            <Text style={styles.activePillText}>
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Ionicons name="close" size={12} color={colors.coral} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={48} color={colors.mutedFg} />
          <Text style={styles.emptyTitle}>No photographers found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PhotographerCard
              photographer={item}
              colors={colors}
              onPress={() => router.push(`/services/photographers/${item.id}` as any)}
            />
          )}
        />
      )}

      {/* ── Filter sheet ── */}
      <Modal visible={filterOpen} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sort & Filter</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Sort */}
            <Text style={styles.sheetSection}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sheetOption, tempSort === opt.value && styles.sheetOptionActive]}
                onPress={() => setTempSort(opt.value)}
                activeOpacity={0.8}>
                <View style={styles.sheetOptionLeft}>
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={tempSort === opt.value ? colors.coral : colors.charcoalLight}
                  />
                  <Text style={[
                    styles.sheetOptionText,
                    tempSort === opt.value && styles.sheetOptionTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </View>
                {tempSort === opt.value ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.coral} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
            ))}

            {/* Price */}
            <Text style={styles.sheetSection}>Price per Day</Text>
            <View style={styles.wrapChips}>
              {PRICE_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.wrapChip, tempPriceIdx === idx && styles.wrapChipActive]}
                  onPress={() => setTempPriceIdx(idx)}
                  activeOpacity={0.8}>
                  <Text style={[
                    styles.wrapChipText,
                    tempPriceIdx === idx && styles.wrapChipTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={styles.sheetSection}>Available Date</Text>
            {tempDate ? (
              <View style={styles.selectedDateRow}>
                <Ionicons name="calendar" size={16} color={colors.coral} />
                <Text style={styles.selectedDateText}>
                  {new Date(tempDate).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity onPress={() => setTempDate(null)}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
                </TouchableOpacity>
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarRow}>
              {calendarDays.map((day) => {
                const dateStr = formatDate(day);
                const isSelected = tempDate === dateStr;
                const isToday = formatDate(new Date()) === dateStr;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                    onPress={() => setTempDate(isSelected ? null : dateStr)}
                    activeOpacity={0.8}>
                    <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>
                      {day.getDate()}
                    </Text>
                    <Text style={[styles.dayMonth, isSelected && styles.dayTextActive]}>
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                    {isToday ? <View style={styles.todayDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ height: spacing.xl }} />
          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.85}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>

        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Photographer Card ────────────────────────────────────────────────────────

function PhotographerCard({
  photographer,
  colors,
  onPress,
}: {
  photographer: Photographer;
  colors: AppColors;
  onPress: () => void;
}) {
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardImageWrap}>
        {photographer.images?.[0] ? (
          <Image source={{ uri: photographer.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="camera" size={40} color={colors.mutedFg} />
          </View>
        )}
        <View style={[
          styles.typeBadge,
          { backgroundColor: photographer.type === 'company' ? `${colors.sage}DD` : `${colors.coral}DD` },
        ]}>
          <Ionicons
            name={photographer.type === 'company' ? 'business' : 'person'}
            size={11}
            color={colors.white}
          />
          <Text style={styles.typeBadgeText}>
            {photographer.type === 'company' ? 'Company' : 'Individual'}
          </Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{photographer.name}</Text>
          {photographer.rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={styles.ratingText}>{photographer.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardBio} numberOfLines={2}>{photographer.bio ?? ''}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.priceWrap}>
            <Text style={styles.cardPrice}>
              {photographer.price_per_day?.toLocaleString() ?? '—'}
            </Text>
            <Text style={styles.cardPriceSub}>{' EGP / day'}</Text>
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
    width: 40, height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal, textAlign: 'center' },
  headerSub: { fontSize: fontSizes.xs, color: colors.mutedFg, textAlign: 'center', marginTop: 2 },
  filterBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.coral,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },

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

  chipRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm, marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
  chipTextActive: { color: colors.white },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: `${colors.coral}15`,
    borderWidth: 1, borderColor: `${colors.coral}30`,
  },
  activePillText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.coral },

  list: { paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.lg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  emptySubtitle: { fontSize: fontSizes.sm, color: colors.mutedFg },

  card: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
  cardImageWrap: { height: 200, backgroundColor: colors.muted },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute', top: spacing.md, left: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm,
  },
  typeBadgeText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardInfo: { padding: spacing.lg, gap: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal, flex: 1 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.sm,
  },
  ratingText: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.charcoal },
  cardBio: { fontSize: fontSizes.sm, color: colors.mutedFg, lineHeight: 20 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline' },
  cardPrice: { fontSize: fontSizes.md, fontWeight: '800', color: colors.coral },
  cardPriceSub: { fontSize: fontSizes.xs, fontWeight: '400', color: colors.mutedFg },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.coral}15`,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  viewBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },

  // Sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%', ...shadows.lg,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sheetTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
  resetText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },
  sheetSection: {
    fontSize: fontSizes.xs, fontWeight: '700', color: colors.mutedFg,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.md, marginTop: spacing.lg,
  },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.lg, marginBottom: spacing.sm,
    backgroundColor: colors.cream,
  },
  sheetOptionActive: { backgroundColor: `${colors.coral}12` },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetOptionText: { fontSize: fontSizes.base, fontWeight: '500', color: colors.charcoal },
  sheetOptionTextActive: { color: colors.coral, fontWeight: '700' },
  radioEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  wrapChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.cream,
    borderWidth: 1, borderColor: colors.border,
  },
  wrapChipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  wrapChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
  wrapChipTextActive: { color: colors.white },
  selectedDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: `${colors.coral}12`, borderRadius: radius.lg,
  },
  selectedDateText: { flex: 1, fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },
  calendarRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  dayBtn: {
    width: 56, paddingVertical: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 2,
  },
  dayBtnActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  dayName: { fontSize: 10, fontWeight: '600', color: colors.mutedFg },
  dayNum: { fontSize: fontSizes.md, fontWeight: '800', color: colors.charcoal },
  dayMonth: { fontSize: 10, color: colors.mutedFg },
  dayTextActive: { color: colors.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.coral, marginTop: 2 },
  applyBtn: {
    backgroundColor: colors.coral, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md,
  },
  applyBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}