import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, Modal, Animated,
  Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';
import { useFavorite } from '../../../hooks/useFavorite';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import type { AppColors } from '../../../constants/theme';
import type { Venue } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const calendarDays = buildCalendarDays();

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

const AMENITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  'parking':          'car-outline',
  'wifi':             'wifi-outline',
  'stage':            'podium-outline',
  'catering kitchen': 'restaurant-outline',
  'bridal suite':     'flower-outline',
  'sound system':     'volume-high-outline',
  'generator':        'flash-outline',
  'tent':             'umbrella-outline',
  'lighting rig':     'flashlight-outline',
  'bar':              'wine-outline',
  'open bar':         'wine-outline',
  'garden lighting':  'bulb-outline',
  'tent option':      'umbrella-outline',
  'city view':        'eye-outline',
  'lounge seating':   'bed-outline',
  'sea view terrace': 'binoculars-outline',
  'projector':        'film-outline',
  'breakout rooms':   'people-outline',
  'catering':         'fast-food-outline',
  'portable restrooms':'water-outline',
};

function getAmenityIcon(
  amenity: string
): React.ComponentProps<typeof Ionicons>['name'] {
  const key = amenity.toLowerCase();
  return AMENITY_ICONS[key] ?? 'checkmark-circle-outline';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VenueDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem, isInCart } = useCart();

  const [venue, setVenue]             = useState<Venue | null>(null);
  const [loading, setLoading]         = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const { isFavorite, toggle: toggleFavorite } = useFavorite(
    'venue', id,
    { name: venue?.name ?? '', image: venue?.images?.[0], price: venue?.price_per_day }
  );

  // Sheet
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [added, setAdded]               = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const alreadyInCart = venue ? isInCart(venue.id) : false;

  useEffect(() => {
    if (id) fetchVenue();
  }, [id]);

  async function fetchVenue() {
    setLoading(true);
    const { data } = await supabase.from('venues').select('*').eq('id', id).single();
    setVenue(data);
    setLoading(false);
  }

  // ── Sheet ────────────────────────────────────────────────────────────────

  function openSheet() {
    setAdded(false);
    setSheetOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200,
    }).start();
  }

  function closeSheet() {
    Animated.timing(sheetAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => setSheetOpen(false));
  }

  function handleAddToCart() {
  if (!venue || !selectedDate) return;
  addItem({
    serviceType: 'venue',
    serviceId:   venue.id,
    serviceName: venue.name,
    quantity:    1,
    unitPrice:   venue.price_per_day,
    subtotal:    venue.price_per_day,
    metadata: {
      eventDate: selectedDate,
      city:      venue.city,
      area:      venue.area,
      capacity:  venue.capacity,
    },
  });
  setAdded(true);
  setTimeout(() => {
    closeSheet();
  }, 1200);
}

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  // ────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.mutedFg }}>Venue not found.</Text>
      </View>
    );
  }

  const images    = venue.images ?? [];
  const amenities = Array.isArray(venue.amenities) ? venue.amenities : [];
  const availDates = Array.isArray(venue.available_dates) ? venue.available_dates : [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Image gallery ── */}
        <View style={styles.gallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImage(idx);
            }}
            scrollEventThrottle={16}>
            {images.length > 0 ? images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
            )) : (
              <View style={styles.galleryPlaceholder}>
                <Ionicons name="business" size={56} color={colors.mutedFg} />
              </View>
            )}
          </ScrollView>

          {/* Image dots */}
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          ) : null}

          {/* Top buttons */}
          <View style={styles.galleryActions}>
            <TouchableOpacity style={styles.galleryBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryBtn} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#FF4B6E' : colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Type + indoor/outdoor badge */}
          {venue.type ? (
            <View style={[
              styles.typeBadge,
              {
                backgroundColor: venue.type.toLowerCase() === 'outdoor'
                  ? `${colors.sage}EE`
                  : `${colors.charcoal}CC`,
              },
            ]}>
              <Ionicons
                name={venue.type.toLowerCase() === 'outdoor' ? 'leaf' : 'home'}
                size={12}
                color={colors.white}
              />
              <Text style={styles.typeBadgeText}>{venue.type}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Main info ── */}
        <View style={styles.infoSection}>
          <Text style={styles.venueName}>{venue.name}</Text>

          <View style={styles.metaGrid}>
            {/* Location */}
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="location-outline" size={16} color={colors.coral} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue}>
                  {[venue.area, venue.city].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
            </View>

            {/* Capacity */}
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="people-outline" size={16} color={colors.coral} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Capacity</Text>
                <Text style={styles.metaValue}>{`Up to ${venue.capacity ?? 0} guests`}</Text>
              </View>
            </View>

            {/* Price */}
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="cash-outline" size={16} color={colors.coral} />
              </View>
              <View>
                <Text style={styles.metaLabel}>Day Rate</Text>
                <Text style={styles.metaValue}>
                  {`${venue.price_per_day?.toLocaleString() ?? '—'} EGP`}
                </Text>
              </View>
            </View>

            {/* Address */}
            {venue.address ? (
              <View style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="map-outline" size={16} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Address</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>{venue.address}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Description ── */}
        {venue.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this venue</Text>
            <Text style={styles.descText}>{venue.description}</Text>
          </View>
        ) : null}

        {/* ── Amenities ── */}
        {amenities.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityItem}>
                  <View style={styles.amenityIconWrap}>
                    <Ionicons
                      name={getAmenityIcon(amenity)}
                      size={18}
                      color={colors.coral}
                    />
                  </View>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Available dates ── */}
        {/* ── Available dates ── */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Available Dates</Text>
  <Text style={styles.sectionSubtitle}>
    {availDates.length > 0
      ? 'Highlighted dates are available — tap to select'
      : 'All dates available — tap to select'}
  </Text>

  {/* Selected date display */}
  {selectedDate ? (
    <View style={styles.selectedDateRow}>
      <Ionicons name="calendar" size={16} color={colors.coral} />
      <Text style={styles.selectedDateText}>
        {new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })}
      </Text>
      <TouchableOpacity onPress={() => setSelectedDate(null)}>
        <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
      </TouchableOpacity>
    </View>
  ) : null}

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.calendarRow}>
    {calendarDays.map((day) => {
      const dateStr     = formatDate(day);
      const isSelected  = selectedDate === dateStr;
      const isToday     = formatDate(new Date()) === dateStr;
      const isAvailable = availDates.length === 0
        || availDates.some((d) => d.startsWith(dateStr));
      const isPast      = day < new Date(new Date().setHours(0,0,0,0));

      return (
        <TouchableOpacity
          key={dateStr}
          style={[
            styles.dayBtn,
            isSelected && styles.dayBtnSelected,
            !isAvailable && styles.dayBtnUnavailable,
            isPast && styles.dayBtnPast,
          ]}
          onPress={() => {
            if (!isAvailable || isPast) return;
            setSelectedDate(isSelected ? null : dateStr);
          }}
          activeOpacity={isAvailable && !isPast ? 0.8 : 1}>
          <Text style={[
            styles.dayName,
            isSelected && styles.dayTextSelected,
            (!isAvailable || isPast) && styles.dayTextDisabled,
          ]}>
            {day.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <Text style={[
            styles.dayNum,
            isSelected && styles.dayTextSelected,
            (!isAvailable || isPast) && styles.dayTextDisabled,
          ]}>
            {day.getDate()}
          </Text>
          <Text style={[
            styles.dayMonth,
            isSelected && styles.dayTextSelected,
            (!isAvailable || isPast) && styles.dayTextDisabled,
          ]}>
            {day.toLocaleDateString('en-US', { month: 'short' })}
          </Text>
          {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
          {isAvailable && !isPast && !isSelected ? (
            <View style={styles.availDot} />
          ) : null}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
</View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPrice}>
            {`${venue.price_per_day?.toLocaleString() ?? '—'} EGP`}
          </Text>
          <Text style={styles.bottomSub}>
            {selectedDate ? formatDisplayDate(selectedDate) : 'per day'}
          </Text>
        </View>
        <TouchableOpacity
  style={[
    styles.bookBtn,
    alreadyInCart && styles.bookBtnInCart,
    !selectedDate && !alreadyInCart && styles.bookBtnDisabled,
  ]}
  onPress={() => {
    if (!selectedDate && !alreadyInCart) return; // ← guard
    openSheet();
  }}
  activeOpacity={0.85}>
  <Ionicons
    name={alreadyInCart ? 'checkmark-circle-outline' : 'bag-add-outline'}
    size={20}
    color={colors.white}
  />
  <Text style={styles.bookBtnText}>
    {alreadyInCart ? 'Update Booking' : selectedDate ? 'Add to Cart' : 'Select a Date First'}
  </Text>
</TouchableOpacity>
      </View>

      {/* ── Booking confirmation sheet ── */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Confirm Booking</Text>
          <Text style={styles.sheetSub}>{venue.name}</Text>

          {/* Summary */}
          <View style={styles.confirmBox}>
            <View style={styles.confirmRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.mutedFg} />
              <Text style={styles.confirmLabel}>Event Date</Text>
              <Text style={styles.confirmValue}>
                {selectedDate ? formatDisplayDate(selectedDate) : '—'}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="location-outline" size={16} color={colors.mutedFg} />
              <Text style={styles.confirmLabel}>Location</Text>
              <Text style={styles.confirmValue}>
                {[venue.area, venue.city].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Ionicons name="people-outline" size={16} color={colors.mutedFg} />
              <Text style={styles.confirmLabel}>Capacity</Text>
              <Text style={styles.confirmValue}>{`Up to ${venue.capacity} guests`}</Text>
            </View>

            <View style={styles.confirmDivider} />

            <View style={styles.confirmRow}>
              <Ionicons name="cash-outline" size={16} color={colors.mutedFg} />
              <Text style={styles.confirmLabel}>Total</Text>
              <Text style={styles.confirmTotal}>
                {`${venue.price_per_day?.toLocaleString() ?? '—'} EGP`}
              </Text>
            </View>
          </View>

          {added ? (
            <View style={styles.addedBtn}>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.addedBtnText}>Added to Cart!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddToCart}
              activeOpacity={0.85}>
              <Ionicons name="bag-add-outline" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>
                {`Add to Cart — ${venue.price_per_day?.toLocaleString()} EGP`}
              </Text>
            </TouchableOpacity>
          )}

        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.cream,
  },

  // Gallery
  gallery: { height: 320, position: 'relative' },
  galleryImage: { width: SCREEN_WIDTH, height: 320, resizeMode: 'cover' },
  galleryPlaceholder: {
    width: SCREEN_WIDTH, height: 320,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  dots: {
    position: 'absolute', bottom: spacing.lg,
    flexDirection: 'row', alignSelf: 'center', gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: `${colors.white}60`,
  },
  dotActive: { backgroundColor: colors.white, width: 18 },
  galleryActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: spacing['2xl'],
    right: spacing['2xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  galleryBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing['2xl'],
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    color: colors.white, fontSize: fontSizes.xs,
    fontWeight: '700', textTransform: 'capitalize',
  },

  // Info section
  infoSection: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  venueName: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.charcoal,
  },
  metaGrid: { gap: spacing.lg },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  metaIconWrap: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: `${colors.coral}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  metaLabel: {
    fontSize: fontSizes.xs, color: colors.mutedFg,
    fontWeight: '500', marginBottom: 2,
  },
  metaValue: {
    fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal,
  },

  // Section
  section: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg, fontWeight: '700',
    color: colors.charcoal, marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs, color: colors.mutedFg,
    marginBottom: spacing.lg,
  },
  descText: {
    fontSize: fontSizes.base, color: colors.charcoalLight,
    lineHeight: 24, marginTop: spacing.md,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '47%',
  },
  amenityIconWrap: {
    width: 32, height: 32,
    borderRadius: radius.sm,
    backgroundColor: `${colors.coral}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityText: {
    fontSize: fontSizes.sm, color: colors.charcoal,
    fontWeight: '500', flex: 1,
  },

  // Available dates
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.coral}12`,
    borderWidth: 1,
    borderColor: `${colors.coral}30`,
  },
  dateChipSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  dateChipPast: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  dateChipText: {
    fontSize: fontSizes.xs, fontWeight: '600',
    color: colors.coral,
  },
  dateChipTextSelected: { color: colors.white },
  dateChipTextPast: { color: colors.border },

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
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
  bottomPrice: {
    fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral,
  },
  bottomSub: { fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 2 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  bookBtnInCart: { backgroundColor: colors.sage },
  bookBtnDisabled: { backgroundColor: colors.mutedFg },
  bookBtnText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '700' },

  // Sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...shadows.lg,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md, marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSizes.xl, fontWeight: '800',
    color: colors.charcoal,
  },
  sheetSub: {
    fontSize: fontSizes.sm, color: colors.mutedFg,
    marginTop: 4, marginBottom: spacing.xl,
  },
  confirmBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmLabel: {
    flex: 1, fontSize: fontSizes.sm,
    color: colors.mutedFg,
  },
  confirmValue: {
    fontSize: fontSizes.sm, fontWeight: '600',
    color: colors.charcoal,
  },
  confirmDivider: {
    height: 1, backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  confirmTotal: {
    fontSize: fontSizes.base, fontWeight: '800',
    color: colors.coral,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingVertical: spacing.lg, borderRadius: radius.lg,
  },
  addBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  addedBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.sage,
    paddingVertical: spacing.lg, borderRadius: radius.lg,
  },
  addedBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  // Calendar
selectedDateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.lg,
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
dayBtnSelected: {
  backgroundColor: colors.coral,
  borderColor: colors.coral,
},
dayBtnUnavailable: {
  backgroundColor: colors.muted,
  borderColor: colors.border,
  opacity: 0.5,
},
dayBtnPast: {
  opacity: 0.3,
},
dayName: {
  fontSize: 10,
  fontWeight: '600',
  color: colors.mutedFg,
},
dayNum: {
  fontSize: fontSizes.md,
  fontWeight: '800',
  color: colors.charcoal,
},
dayMonth: {
  fontSize: 10,
  color: colors.mutedFg,
},
dayTextSelected: {
  color: colors.white,
},
dayTextDisabled: {
  color: colors.border,
},
todayDot: {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: colors.coral,
  marginTop: 2,
},
availDot: {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: colors.sage,
  marginTop: 2,
},
  });
}