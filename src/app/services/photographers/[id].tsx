import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, Modal, Animated,
  Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useCart } from '../../../context/CartContext';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../constants/theme';
import type { Photographer } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function PhotographerDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, isInCart } = useCart();

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [loading, setLoading]           = useState(true);
  const [activeImage, setActiveImage]   = useState(0);

  // Sheet
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [added, setAdded]               = useState(false);
  const sheetAnim                       = useRef(new Animated.Value(0)).current;
  const calendarDays                    = buildCalendarDays();

  const alreadyInCart = photographer ? isInCart(photographer.id) : false;

  useEffect(() => {
    if (id) fetchPhotographer();
  }, [id]);

  async function fetchPhotographer() {
    setLoading(true);
    const { data } = await supabase
      .from('photographers')
      .select('*')
      .eq('id', id)
      .single();
    setPhotographer(data);
    setLoading(false);
  }

  // ── Sheet ────────────────────────────────────────────────────────────────

  function openSheet() {
    setAdded(false);
    setSelectedDate(null);
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
    if (!photographer) return;
    addItem({
      serviceType: 'photographer',
      serviceId: photographer.id,
      serviceName: photographer.name,
      quantity: 1,
      unitPrice: photographer.price_per_day,
      subtotal: photographer.price_per_day,
      metadata: {
        photographerType: photographer.type,
        eventDate: selectedDate,
      },
    });
    setAdded(true);
  }

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // ────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!photographer) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.mutedFg }}>Photographer not found.</Text>
      </View>
    );
  }

  const images = photographer.images ?? [];

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
                <Ionicons name="camera" size={48} color={colors.mutedFg} />
              </View>
            )}
          </ScrollView>

          {/* Dots */}
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          ) : null}

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* Type badge */}
          <View style={[
            styles.typeBadge,
            { backgroundColor: photographer.type === 'company' ? `${colors.sage}EE` : `${colors.coral}EE` },
          ]}>
            <Ionicons
              name={photographer.type === 'company' ? 'business' : 'person'}
              size={12}
              color={colors.white}
            />
            <Text style={styles.typeBadgeText}>
              {photographer.type === 'company' ? 'Company' : 'Individual'}
            </Text>
          </View>
        </View>

        {/* ── Info ── */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{photographer.name}</Text>
            {photographer.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.ratingText}>{photographer.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {/* Stars */}
          {photographer.rating ? (
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(photographer.rating) ? 'star' : 'star-outline'}
                  size={16}
                  color={colors.gold}
                />
              ))}
              <Text style={styles.starsLabel}>{`${photographer.rating.toFixed(1)} rating`}</Text>
            </View>
          ) : null}

          <Text style={styles.bio}>{photographer.bio}</Text>

          {/* Price card */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>Day Rate</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>
                  {photographer.price_per_day?.toLocaleString() ?? '—'}
                </Text>
                <Text style={styles.priceSub}>{' EGP / day'}</Text>
              </View>
            </View>
            <Ionicons name="camera-outline" size={32} color={`${colors.coral}50`} />
          </View>
        </View>

        {/* ── Portfolio label ── */}
        {images.length > 1 ? (
          <View style={styles.portfolioSection}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioList}>
              {images.map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.portfolioThumb} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPrice}>
            {photographer.price_per_day?.toLocaleString() ?? '—'} EGP
          </Text>
          <Text style={styles.bottomPriceSub}>per day</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, alreadyInCart && styles.bookBtnInCart]}
          onPress={openSheet}
          activeOpacity={0.85}>
          <Ionicons
            name={alreadyInCart ? 'checkmark-circle-outline' : 'bag-add-outline'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.bookBtnText}>
            {alreadyInCart ? 'Update Booking' : 'Book Now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Add to cart sheet ── */}
      <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Book {photographer.name}</Text>
          <Text style={styles.sheetSub}>Select a date for your event</Text>

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

          {/* Calendar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}>
            {calendarDays.map((day) => {
              const dateStr = formatDate(day);
              const isSelected = selectedDate === dateStr;
              const isToday = formatDate(new Date()) === dateStr;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                  onPress={() => setSelectedDate(isSelected ? null : dateStr)}
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

          {/* Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Day rate</Text>
              <Text style={styles.summaryValue}>
                {`${photographer.price_per_day?.toLocaleString() ?? '—'} EGP`}
              </Text>
            </View>
            {selectedDate ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Event date</Text>
                <Text style={styles.summaryValue}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {`${photographer.price_per_day?.toLocaleString() ?? '—'} EGP`}
              </Text>
            </View>
          </View>

          {added ? (
            <View style={styles.addedBtn}>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.addedBtnText}>Added to Cart</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, !selectedDate && styles.addBtnDisabled]}
              onPress={handleAddToCart}
              disabled={!selectedDate}
              activeOpacity={0.85}>
              <Ionicons name="bag-add-outline" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>
                {selectedDate
                  ? `Add to Cart — ${photographer.price_per_day?.toLocaleString()} EGP`
                  : 'Select a date first'}
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },

  // Gallery
  gallery: { height: 300, position: 'relative' },
  galleryImage: { width: SCREEN_WIDTH, height: 300, resizeMode: 'cover' },
  galleryPlaceholder: {
    width: SCREEN_WIDTH, height: 300,
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
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: spacing['2xl'],
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: spacing['2xl'],
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.sm,
  },
  typeBadgeText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },

  // Info
  infoSection: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.charcoal, flex: 1 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm,
  },
  ratingText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsLabel: { fontSize: fontSizes.sm, color: colors.mutedFg, marginLeft: spacing.sm },
  bio: { fontSize: fontSizes.base, color: colors.charcoalLight, lineHeight: 24 },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  priceLabel: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '600', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },
  priceSub: { fontSize: fontSizes.xs, color: colors.mutedFg },

  // Portfolio
  portfolioSection: { paddingTop: spacing.xl, gap: spacing.lg },
  sectionTitle: {
    fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal,
    paddingHorizontal: spacing['2xl'],
  },
  portfolioList: { paddingHorizontal: spacing['2xl'], gap: spacing.md },
  portfolioThumb: {
    width: 120, height: 120,
    borderRadius: radius.lg,
    resizeMode: 'cover',
  },

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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  bottomPrice: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },
  bottomPriceSub: { fontSize: fontSizes.xs, color: colors.mutedFg },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  bookBtnInCart: { backgroundColor: colors.sage },
  bookBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },

  // Sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%', ...shadows.lg,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal },
  sheetSub: { fontSize: fontSizes.sm, color: colors.mutedFg, marginTop: 4, marginBottom: spacing.lg },
  selectedDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: `${colors.coral}12`, borderRadius: radius.lg,
  },
  selectedDateText: { flex: 1, fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },
  calendarRow: { gap: spacing.sm, paddingBottom: spacing.lg },
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
  summaryBox: {
    backgroundColor: colors.cream, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: fontSizes.sm, color: colors.mutedFg },
  summaryValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  totalLabel: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  totalValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.coral,
    paddingVertical: spacing.lg, borderRadius: radius.lg,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  addedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.sage,
    paddingVertical: spacing.lg, borderRadius: radius.lg,
  },
  addedBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}