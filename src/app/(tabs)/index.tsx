import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, shadows, fontSizes } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import type { Venue } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  href: Href;
};

// ─── Service categories ───────────────────────────────────────────────────────

const categories: Category[] = [
  {
    key: 'venues',
    label: 'Venues',
    icon: 'business-outline',
    color: colors.coral,
    href: '/services/venues',
  },
  {
    key: 'catering',
    label: 'Catering',
    icon: 'restaurant-outline',
    color: '#C2773F',
    href: '/services/catering',
  },
  {
    key: 'photographers',
    label: 'Photography',
    icon: 'camera-outline',
    color: colors.sage,
    href: '/services/photographers',
  },
  {
    key: 'av',
    label: 'Audio & Visual',
    icon: 'volume-high-outline',
    color: '#7B68C8',
    href: '/services/av',
  },
  {
    key: 'printings',
    label: 'Printings',
    icon: 'print-outline',
    color: colors.gold,
    href: '/services/printings',
  },
  {
    key: 'packages',
    label: 'Full Package',
    icon: 'gift-outline',
    color: '#D4597A',
    href: '/services/venues',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    fetchFeaturedVenues();
  }, []);

  async function fetchFeaturedVenues() {
    const { data } = await supabase
      .from('venues')
      .select('*')
      .eq('is_available', true)
      .limit(5);
    setVenues(data ?? []);
    setLoadingVenues(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/(tabs)/notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.charcoal} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ── */}
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>Plan your perfect event</Text>
            <Text style={styles.heroTitle}>Everything in{'\n'}one place.</Text>
            <Text style={styles.heroSubtitle}>
              Venues, catering, photography, A/V & more — all in one cart.
            </Text>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push('/services/venues')}
              activeOpacity={0.85}>
              <Text style={styles.heroBtnText}>Start Planning</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.coral} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
        </View>

        {/* ── Service Categories ── */}
        {/* ── Service Categories ── */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Services</Text>
  <View style={styles.categoryGrid}>
    {[0, 1].map((rowIndex) => (
      <View key={rowIndex} style={styles.categoryRow}>
        {categories.slice(rowIndex * 3, rowIndex * 3 + 3).map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={styles.categoryCard}
            onPress={() => router.push(cat.href as any)}
            activeOpacity={0.8}>
            <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}18` }]}>
              <Ionicons name={cat.icon} size={24} color={cat.color} />
            </View>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ))}
  </View>
</View>

        {/* ── Featured Venues ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Featured Venues</Text>
            <TouchableOpacity onPress={() => router.push('/services/venues')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {venues.length === 0 && !loadingVenues ? (
            <View style={styles.emptyVenues}>
              <Ionicons name="business-outline" size={32} color={colors.mutedFg} />
              <Text style={styles.emptyText}>No venues yet</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venueList}>
              {loadingVenues
                ? [1, 2, 3].map((i) => <VenueSkeleton key={i} />)
                : venues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onPress={() =>
                        router.push(`/services/venues/${venue.id}` as Href)
                      }
                    />
                  ))}
            </ScrollView>
          )}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              icon="receipt-outline"
              label="My Orders"
              onPress={() => router.push('/(tabs)/profile')}
            />
            <QuickAction
              icon="heart-outline"
              label="Saved"
              onPress={() => router.push('/(tabs)/profile')}
            />
            <QuickAction
              icon="headset-outline"
              label="Support"
              onPress={() => router.push('/(tabs)/profile')}
            />
            <QuickAction
              icon="log-out-outline"
              label="Sign Out"
              onPress={signOut}
            />
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.venueCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.venueImageWrap}>
        {venue.images?.[0] ? (
          <Image source={{ uri: venue.images[0] }} style={styles.venueImage} />
        ) : (
          <View style={styles.venueImagePlaceholder}>
            <Ionicons name="business" size={32} color={colors.mutedFg} />
          </View>
        )}
        <View style={styles.venuePriceBadge}>
          <Text style={styles.venuePriceText}>
            {venue.price_per_day?.toLocaleString()} EGP/day
          </Text>
        </View>
      </View>
      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={1}>
          {venue.name}
        </Text>
        <View style={styles.venueRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedFg} />
          <Text style={styles.venueMeta} numberOfLines={1}>
            {venue.city}
          </Text>
        </View>
        <View style={styles.venueRow}>
          <Ionicons name="people-outline" size={13} color={colors.mutedFg} />
          <Text style={styles.venueMeta}>Up to {venue.capacity} guests</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VenueSkeleton() {
  return (
    <View style={[styles.venueCard, styles.skeleton]}>
      <View style={[styles.venueImageWrap, { backgroundColor: colors.muted }]} />
      <View style={styles.venueInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.coral} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const VENUE_CARD_W = SCREEN_WIDTH * 0.62;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSizes.sm,
    color: colors.mutedFg,
    fontWeight: '500',
  },
  userName: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.charcoal,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coral,
    borderWidth: 1.5,
    borderColor: colors.cream,
  },

  // Hero
  hero: {
    marginHorizontal: spacing['2xl'],
    borderRadius: radius['2xl'],
    backgroundColor: colors.charcoal,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  heroContent: { zIndex: 1 },
  heroEyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.coralLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSizes['3xl'],
    fontWeight: '800',
    color: colors.white,
    lineHeight: 40,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSizes.sm,
    color: `${colors.white}99`,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  heroBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.coral,
  },
  heroCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${colors.coral}25`,
    top: -40,
    right: -30,
  },
  heroCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.coral}15`,
    top: 30,
    right: 80,
  },

  // Sections
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.charcoal,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  seeAll: {
    fontSize: fontSizes.sm,
    color: colors.coral,
    fontWeight: '600',
  },

  // Category grid
 // Category grid
categoryGrid: {
  paddingHorizontal: spacing.lg,
  gap: spacing.md,
},
categoryRow: {
  flexDirection: 'row',
  gap: spacing.md,
},
categoryCard: {
  flex: 1,                        // ← auto splits into equal thirds
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  paddingVertical: spacing.lg,
  alignItems: 'center',
  gap: spacing.sm,
  ...shadows.sm,
},
categoryIcon: {
  width: 48,
  height: 48,
  borderRadius: radius.md,
  alignItems: 'center',
  justifyContent: 'center',
},
categoryLabel: {
  fontSize: fontSizes.xs,
  fontWeight: '600',
  color: colors.charcoal,
  textAlign: 'center',
},

  // Venue cards
  venueList: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
  },
  venueCard: {
    width: VENUE_CARD_W,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  venueImageWrap: {
    height: 150,
    backgroundColor: colors.muted,
  },
  venueImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  venueImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venuePriceBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: `${colors.charcoal}CC`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  venuePriceText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  venueInfo: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  venueName: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.charcoal,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueMeta: {
    fontSize: fontSizes.xs,
    color: colors.mutedFg,
    flex: 1,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: `${colors.coral}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.charcoalLight,
    textAlign: 'center',
  },

  // Empty / skeleton
  emptyVenues: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.mutedFg,
  },
  skeleton: { opacity: 0.5 },
  skeletonLine: {
    height: 12,
    width: '80%',
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
});