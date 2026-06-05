import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../constants/theme';
import type { Venue } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCATION_TYPES = ['All', 'Indoor', 'Outdoor'] as const;
type LocationType = (typeof LOCATION_TYPES)[number];

const SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price_asc',  icon: 'trending-up-outline' },
  { label: 'Price: High to Low', value: 'price_desc', icon: 'trending-down-outline' },
  { label: 'Largest Capacity',   value: 'capacity',   icon: 'people-outline' },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const CAPACITY_OPTIONS = [
  { label: 'Any',       min: 0,   max: 99999 },
  { label: 'Up to 100', min: 0,   max: 100 },
  { label: '100 – 300', min: 100, max: 300 },
  { label: '300 – 500', min: 300, max: 500 },
  { label: '500+',      min: 500, max: 99999 },
];

const AREAS = [
  'Any', 'Downtown', 'Maadi', 'Zamalek', 'Mohandessin',
  'Heliopolis', 'October', 'Alexandria', 'New Cairo',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Build a simple calendar: current month + next month days
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

export default function VenuesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [venues, setVenues]                   = useState<Venue[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState('');
  const [locationType, setLocationType]       = useState<LocationType>('All');

  // Applied filters
  const [sortBy, setSortBy]       = useState<SortValue>('price_asc');
  const [capacityIdx, setCapacityIdx] = useState(0);
  const [selectedArea, setSelectedArea] = useState('Any');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Temp (inside sheet before Apply)
  const [tempSort, setTempSort]             = useState<SortValue>('price_asc');
  const [tempCapacityIdx, setTempCapacityIdx] = useState(0);
  const [tempArea, setTempArea]             = useState('Any');
  const [tempDate, setTempDate]             = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const calendarDays = buildCalendarDays();

  useEffect(() => {
    fetchVenues();
  }, [locationType, sortBy, capacityIdx, selectedArea]);

  async function fetchVenues() {
    setLoading(true);

    let query = supabase
      .from('venues')
      .select('*')
      .eq('is_available', true);

    if (locationType !== 'All') {
      query = query.ilike('type', locationType);
    }

    if (selectedArea !== 'Any') {
      query = query.ilike('area', selectedArea);
    }

    const cap = CAPACITY_OPTIONS[capacityIdx];
    if (cap.min > 0)     query = query.gte('capacity', cap.min);
    if (cap.max < 99999) query = query.lte('capacity', cap.max);

    if (sortBy === 'price_asc')  query = query.order('price_per_day', { ascending: true });
    if (sortBy === 'price_desc') query = query.order('price_per_day', { ascending: false });
    if (sortBy === 'capacity')   query = query.order('capacity',      { ascending: false });

    const { data } = await query;
    setVenues(data ?? []);
    setLoading(false);
  }

  // Filter by date client-side (available_dates is an array)
  const filtered = venues.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.city?.toLowerCase().includes(search.toLowerCase()) ||
      v.area?.toLowerCase().includes(search.toLowerCase());

    const matchesDate = selectedDate
      ? Array.isArray(v.available_dates) &&
        v.available_dates.some((d) => d.startsWith(selectedDate))
      : true;

    return matchesSearch && matchesDate;
  });

  const activeFilterCount =
    (sortBy !== 'price_asc' ? 1 : 0) +
    (capacityIdx !== 0 ? 1 : 0) +
    (selectedArea !== 'Any' ? 1 : 0) +
    (selectedDate ? 1 : 0);

  // ── Sheet ────────────────────────────────────────────────────────────────

  function openSheet() {
    setTempSort(sortBy);
    setTempCapacityIdx(capacityIdx);
    setTempArea(selectedArea);
    setTempDate(selectedDate);
    setFilterOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }

  function closeSheet() {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setFilterOpen(false));
  }

  function applyFilters() {
    setSortBy(tempSort);
    setCapacityIdx(tempCapacityIdx);
    setSelectedArea(tempArea);
    setSelectedDate(tempDate);
    closeSheet();
  }

  function resetFilters() {
    setTempSort('price_asc');
    setTempCapacityIdx(0);
    setTempArea('Any');
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
        <Text style={styles.headerTitle}>Venues</Text>
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
          placeholder="Search by name, city or area..."
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

      {/* ── Indoor / Outdoor chips + active filter pills ── */}
      <View style={styles.chipRow}>
        {LOCATION_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, locationType === type && styles.chipActive]}
            onPress={() => setLocationType(type)}
            activeOpacity={0.8}>
            {type === 'Indoor' ? (
              <Ionicons
                name="home-outline"
                size={14}
                color={locationType === type ? colors.white : colors.charcoalLight}
              />
            ) : type === 'Outdoor' ? (
              <Ionicons
                name="leaf-outline"
                size={14}
                color={locationType === type ? colors.white : colors.charcoalLight}
              />
            ) : null}
            <Text style={[styles.chipText, locationType === type && styles.chipTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.resultPill}>
          <Text style={styles.resultPillText}>{`${filtered.length} found`}</Text>
        </View>
      </View>

      {/* ── Active filter pills ── */}
      {(selectedArea !== 'Any' || selectedDate) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activePills}
          style={styles.activePillsWrapper}>
          {selectedArea !== 'Any' ? (
            <TouchableOpacity
              style={styles.activePill}
              onPress={() => setSelectedArea('Any')}>
              <Ionicons name="location" size={12} color={colors.coral} />
              <Text style={styles.activePillText}>{selectedArea}</Text>
              <Ionicons name="close" size={12} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
          {selectedDate ? (
            <TouchableOpacity
              style={styles.activePill}
              onPress={() => setSelectedDate(null)}>
              <Ionicons name="calendar" size={12} color={colors.coral} />
              <Text style={styles.activePillText}>{formatDisplayDate(selectedDate)}</Text>
              <Ionicons name="close" size={12} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="business-outline" size={48} color={colors.mutedFg} />
          <Text style={styles.emptyTitle}>No venues found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              colors={colors}
              onPress={() => router.push(`/services/venues/${item.id}` as any)}
            />
          )}
        />
      )}

      {/* ── Filter sheet ── */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sort & Filter</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── Sort ── */}
            <Text style={styles.sheetSection}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sheetOption,
                  tempSort === opt.value && styles.sheetOptionActive,
                ]}
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

            {/* ── Capacity ── */}
            <Text style={styles.sheetSection}>Guest Capacity</Text>
            <View style={styles.wrapChips}>
              {CAPACITY_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.wrapChip,
                    tempCapacityIdx === idx && styles.wrapChipActive,
                  ]}
                  onPress={() => setTempCapacityIdx(idx)}
                  activeOpacity={0.8}>
                  <Text style={[
                    styles.wrapChipText,
                    tempCapacityIdx === idx && styles.wrapChipTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Area ── */}
            <Text style={styles.sheetSection}>Area</Text>
            <View style={styles.wrapChips}>
              {AREAS.map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.wrapChip,
                    tempArea === area && styles.wrapChipActive,
                  ]}
                  onPress={() => setTempArea(area)}
                  activeOpacity={0.8}>
                  <Text style={[
                    styles.wrapChipText,
                    tempArea === area && styles.wrapChipTextActive,
                  ]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Date picker ── */}
            <Text style={styles.sheetSection}>Available Date</Text>
            {tempDate ? (
              <View style={styles.selectedDateRow}>
                <Ionicons name="calendar" size={16} color={colors.coral} />
                <Text style={styles.selectedDateText}>
                  {formatDisplayDate(tempDate)}
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

          <TouchableOpacity
            style={styles.applyBtn}
            onPress={applyFilters}
            activeOpacity={0.85}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>

        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Venue Card ───────────────────────────────────────────────────────────────

function VenueCard({ venue, colors, onPress }: { venue: Venue; colors: AppColors; onPress: () => void }) {
  const styles = makeStyles(colors);
  const amenities = Array.isArray(venue.amenities) ? venue.amenities : [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardImageWrap}>
        {venue.images?.[0] ? (
          <Image source={{ uri: venue.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="business" size={40} color={colors.mutedFg} />
          </View>
        )}
        {venue.type ? (
          <View style={[
            styles.typeBadge,
            {
              backgroundColor:
                venue.type.toLowerCase() === 'outdoor'
                  ? `${colors.sage}DD`
                  : `${colors.charcoal}CC`,
            },
          ]}>
            <Ionicons
              name={venue.type.toLowerCase() === 'outdoor' ? 'leaf' : 'home'}
              size={11}
              color={colors.white}
            />
            <Text style={styles.typeBadgeText}>{venue.type}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{venue.name ?? '—'}</Text>

        <View style={styles.cardMetas}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="location-outline" size={13} color={colors.mutedFg} />
            <Text style={styles.cardMeta}>
              {[venue.area, venue.city].filter(Boolean).join(', ') || '—'}
            </Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="people-outline" size={13} color={colors.mutedFg} />
            <Text style={styles.cardMeta}>{`Up to ${venue.capacity ?? 0} guests`}</Text>
          </View>
        </View>

        {amenities.length > 0 ? (
          <View style={styles.amenitiesRow}>
            {amenities.slice(0, 3).map((a) => (
              <View key={a} style={styles.amenityTag}>
                <Text style={styles.amenityText}>{a}</Text>
              </View>
            ))}
            {amenities.length > 3 ? (
              <Text style={styles.amenityMore}>{`+${amenities.length - 3}`}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.priceWrap}>
            <Text style={styles.cardPrice}>
              {venue.price_per_day?.toLocaleString() ?? '—'}
            </Text>
            <Text style={styles.cardPriceSub}>{' EGP / day'}</Text>
          </View>
          <View style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>View</Text>
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
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },

  // Search
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

  // Chips row
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.charcoalLight,
  },
  chipTextActive: { color: colors.white },
  resultPill: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
  },
  resultPillText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.mutedFg,
  },

  // Active filter pills
  activePillsWrapper: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  activePills: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: `${colors.coral}15`,
    borderWidth: 1,
    borderColor: `${colors.coral}30`,
  },
  activePillText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.coral,
  },

  // List
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.charcoal,
  },
  emptySubtitle: { fontSize: fontSizes.sm, color: colors.mutedFg },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardImageWrap: { height: 180, backgroundColor: colors.muted },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardInfo: { padding: spacing.lg, gap: spacing.sm },
  cardName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.charcoal },
  cardMetas: { gap: spacing.xs },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardMeta: { fontSize: fontSizes.sm, color: colors.mutedFg, flex: 1 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  amenityTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  amenityText: { fontSize: fontSizes.xs, color: colors.charcoalLight, fontWeight: '500' },
  amenityMore: { fontSize: fontSizes.xs, color: colors.mutedFg, alignSelf: 'center' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline' },
  cardPrice: { fontSize: fontSizes.md, fontWeight: '800', color: colors.coral },
  cardPriceSub: { fontSize: fontSizes.xs, fontWeight: '400', color: colors.mutedFg },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.coral}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  detailBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },

  // Sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
    ...shadows.lg,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sheetTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
  resetText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },
  sheetSection: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.cream,
  },
  sheetOptionActive: { backgroundColor: `${colors.coral}12` },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetOptionText: { fontSize: fontSizes.base, fontWeight: '500', color: colors.charcoal },
  sheetOptionTextActive: { color: colors.coral, fontWeight: '700' },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },

  // Wrap chips (capacity + area)
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  wrapChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrapChipActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  wrapChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoalLight },
  wrapChipTextActive: { color: colors.white },

  // Date picker
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.coral}12`,
    borderRadius: radius.lg,
  },
  selectedDateText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.coral,
  },
  calendarRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dayBtn: {
    width: 56,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  dayBtnActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  dayName: { fontSize: 10, fontWeight: '600', color: colors.mutedFg },
  dayNum: { fontSize: fontSizes.md, fontWeight: '800', color: colors.charcoal },
  dayMonth: { fontSize: 10, color: colors.mutedFg },
  dayTextActive: { color: colors.white },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.coral,
    marginTop: 2,
  },

  // Apply
  applyBtn: {
    backgroundColor: colors.coral,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  applyBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}