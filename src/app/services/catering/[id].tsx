import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, Modal, Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useCart } from '../../../context/CartContext';
import { spacing, radius, shadows, fontSizes } from '../../../constants/theme';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../constants/theme';
import type { Restaurant, CateringPackage } from '../../../types';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { addItem, isInCart } = useCart();

  const [restaurant, setRestaurant]   = useState<Restaurant | null>(null);
  const [packages, setPackages]       = useState<CateringPackage[]>([]);
  const [loading, setLoading]         = useState(true);

  // Sheet state
  const [selectedPkg, setSelectedPkg] = useState<CateringPackage | null>(null);
  const [guestCount, setGuestCount]   = useState(50);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [added, setAdded]             = useState(false);
  const sheetAnim                     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (restaurantId) fetchData();
  }, [restaurantId]);

  async function fetchData() {
    setLoading(true);
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
      supabase.from('catering_packages').select('*').eq('restaurant_id', restaurantId),
    ]);
    setRestaurant(r);
    setPackages(p ?? []);
    setLoading(false);
  }

  // ── Sheet helpers ────────────────────────────────────────────────────────

  function openSheet(pkg: CateringPackage) {
    setSelectedPkg(pkg);
    setGuestCount(pkg.min_guests ?? 50);
    setAdded(false);
    setSheetOpen(true);
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
    }).start(() => {
      setSheetOpen(false);
      setSelectedPkg(null);
    });
  }

  function changeGuests(delta: number) {
    if (!selectedPkg) return;
    const min = selectedPkg.min_guests ?? 1;
    setGuestCount((prev) => Math.max(min, prev + delta));
  }

  function handleAddToCart() {
    if (!selectedPkg || !restaurant) return;
    const total = selectedPkg.price_per_person * guestCount;
    addItem({
      serviceType: 'catering',
      serviceId: selectedPkg.id,
      serviceName: `${restaurant.name} — ${selectedPkg.name}`,
      quantity: 1,
      unitPrice: total,
      subtotal: total,
      metadata: {
        guestCount,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        packageName: selectedPkg.name,
        pricePerPerson: selectedPkg.price_per_person,
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

  if (!restaurant) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.mutedFg }}>Restaurant not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {restaurant.images?.[0] ? (
            <Image source={{ uri: restaurant.images[0] }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant" size={48} color={colors.mutedFg} />
            </View>
          )}
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineTagText}>{restaurant.cuisine}</Text>
            </View>
            <Text style={styles.heroName}>{restaurant.name}</Text>
            {restaurant.rating ? (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(restaurant.rating) ? 'star' : 'star-outline'}
                    size={14}
                    color={colors.gold}
                  />
                ))}
                <Text style={styles.ratingValue}>{restaurant.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.descSection}>
          <Text style={styles.descText}>{restaurant.description}</Text>
        </View>

        {/* ── Packages ── */}
        <View style={styles.packagesSection}>
          <Text style={styles.sectionTitle}>
            {`${packages.length} Package${packages.length !== 1 ? 's' : ''} Available`}
          </Text>

          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              colors={colors}
              inCart={isInCart(pkg.id)}
              onSelect={() => openSheet(pkg)}
            />
          ))}
        </View>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>

      {/* ── Package bottom sheet ── */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          <View style={styles.sheetHandle} />

          {selectedPkg ? (
            <>
              {/* Package name */}
              <Text style={styles.sheetTitle}>{selectedPkg.name}</Text>
              <Text style={styles.sheetDesc}>{selectedPkg.description}</Text>

              {/* Items preview */}
              <View style={styles.itemsRow}>
                {(selectedPkg.items ?? []).slice(0, 4).map((item) => (
                  <View key={item} style={styles.itemTag}>
                    <Text style={styles.itemTagText}>{item}</Text>
                  </View>
                ))}
                {(selectedPkg.items ?? []).length > 4 ? (
                  <View style={styles.itemTag}>
                    <Text style={styles.itemTagText}>
                      {`+${(selectedPkg.items ?? []).length - 4} more`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.divider} />

              {/* Guest count */}
              <Text style={styles.sheetLabel}>Number of Guests</Text>
              <Text style={styles.sheetHint}>
                {`Minimum ${selectedPkg.min_guests} guests`}
              </Text>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    guestCount <= (selectedPkg.min_guests ?? 1) && styles.counterBtnDisabled,
                  ]}
                  onPress={() => changeGuests(-10)}
                  disabled={guestCount <= (selectedPkg.min_guests ?? 1)}>
                  <Text style={styles.counterBtnText}>−10</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    guestCount <= (selectedPkg.min_guests ?? 1) && styles.counterBtnDisabled,
                  ]}
                  onPress={() => changeGuests(-1)}
                  disabled={guestCount <= (selectedPkg.min_guests ?? 1)}>
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>

                <View style={styles.counterDisplay}>
                  <Text style={styles.counterValue}>{guestCount}</Text>
                  <Text style={styles.counterLabel}>guests</Text>
                </View>

                <TouchableOpacity style={styles.counterBtn} onPress={() => changeGuests(1)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.counterBtn} onPress={() => changeGuests(10)}>
                  <Text style={styles.counterBtnText}>+10</Text>
                </TouchableOpacity>
              </View>

              {/* Live cost calculation */}
              <View style={styles.costBox}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Price per person</Text>
                  <Text style={styles.costValue}>
                    {`${selectedPkg.price_per_person.toLocaleString()} EGP`}
                  </Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Number of guests</Text>
                  <Text style={styles.costValue}>{`× ${guestCount}`}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.costRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {`${(selectedPkg.price_per_person * guestCount).toLocaleString()} EGP`}
                  </Text>
                </View>
              </View>

              {/* Add to cart */}
              {added ? (
                <View style={styles.addedBtn}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  <Text style={styles.addedBtnText}>Added to Cart</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddToCart}
                  activeOpacity={0.85}>
                  <Ionicons name="bag-add-outline" size={20} color={colors.white} />
                  <Text style={styles.addBtnText}>
                    {`Add to Cart — ${(selectedPkg.price_per_person * guestCount).toLocaleString()} EGP`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  colors,
  inCart,
  onSelect,
}: {
  pkg: CateringPackage;
  colors: AppColors;
  inCart: boolean;
  onSelect: () => void;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={[styles.pkgCard, inCart && styles.pkgCardInCart]}>
      {inCart ? (
        <View style={styles.inCartBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.white} />
          <Text style={styles.inCartBadgeText}>In Cart</Text>
        </View>
      ) : null}

      <View style={styles.pkgHeader}>
        <Text style={styles.pkgName}>{pkg.name}</Text>
        <View style={styles.pkgPriceBadge}>
          <Text style={styles.pkgPriceValue}>
            {pkg.price_per_person.toLocaleString()}
          </Text>
          <Text style={styles.pkgPriceSub}>{' EGP/person'}</Text>
        </View>
      </View>

      <Text style={styles.pkgDesc} numberOfLines={2}>{pkg.description}</Text>

      <View style={styles.pkgMeta}>
        <Ionicons name="people-outline" size={13} color={colors.mutedFg} />
        <Text style={styles.pkgMetaText}>{`Min. ${pkg.min_guests} guests`}</Text>
      </View>

      {/* Included items */}
      <View style={styles.pkgItems}>
        {(pkg.items ?? []).map((item) => (
          <View key={item} style={styles.pkgItemRow}>
            <Ionicons name="checkmark" size={14} color={colors.sage} />
            <Text style={styles.pkgItemText}>{item}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectBtn, inCart && styles.selectBtnInCart]}
        onPress={onSelect}
        activeOpacity={0.85}>
        <Text style={[styles.selectBtnText, inCart && styles.selectBtnTextInCart]}>
          {inCart ? 'Update Order' : 'Select Package'}
        </Text>
        <Ionicons
          name={inCart ? 'create-outline' : 'arrow-forward'}
          size={16}
          color={inCart ? colors.coral : colors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },

  // Hero
  hero: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: spacing['2xl'],
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing['2xl'],
    right: spacing['2xl'],
    gap: spacing.sm,
  },
  cuisineTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  cuisineTagText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  heroName: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: colors.white,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { fontSize: fontSizes.sm, color: colors.white, fontWeight: '600', marginLeft: 4 },

  // Description
  descSection: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  descText: { fontSize: fontSizes.base, color: colors.charcoalLight, lineHeight: 24 },

  // Packages
  packagesSection: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },

  // Package card
  pkgCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.md,
  },
  pkgCardInCart: {
    borderWidth: 2,
    borderColor: colors.coral,
  },
  inCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  inCartBadgeText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pkgName: {
    fontSize: fontSizes.md,
    fontWeight: '800',
    color: colors.charcoal,
    flex: 1,
    marginRight: spacing.sm,
  },
  pkgPriceBadge: { flexDirection: 'row', alignItems: 'baseline' },
  pkgPriceValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },
  pkgPriceSub: { fontSize: fontSizes.xs, color: colors.mutedFg },
  pkgDesc: { fontSize: fontSizes.sm, color: colors.mutedFg, lineHeight: 20 },
  pkgMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pkgMetaText: { fontSize: fontSizes.sm, color: colors.mutedFg },
  pkgItems: { gap: spacing.xs },
  pkgItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pkgItemText: { fontSize: fontSizes.sm, color: colors.charcoalLight },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  selectBtnInCart: { backgroundColor: `${colors.coral}15` },
  selectBtnText: { fontSize: fontSizes.base, fontWeight: '700', color: colors.white },
  selectBtnTextInCart: { color: colors.coral },

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
  sheetTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  sheetDesc: {
    fontSize: fontSizes.sm,
    color: colors.mutedFg,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  itemTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  itemTagText: { fontSize: fontSizes.xs, color: colors.charcoalLight, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sheetLabel: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: 2,
  },
  sheetHint: { fontSize: fontSizes.xs, color: colors.mutedFg, marginBottom: spacing.lg },

  // Guest counter
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  counterBtn: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterBtnText: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  counterDisplay: { alignItems: 'center', minWidth: 70 },
  counterValue: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.charcoal },
  counterLabel: { fontSize: fontSizes.xs, color: colors.mutedFg },

  // Cost box
  costBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: fontSizes.sm, color: colors.mutedFg },
  costValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal },
  totalLabel: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  totalValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },

  // Add to cart
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  addBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  addedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sage,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  addedBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}