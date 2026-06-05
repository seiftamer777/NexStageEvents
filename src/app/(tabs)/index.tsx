import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AppColors } from '../../constants/theme';
import { fontSizes, radius, shadows, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { Venue } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VENUE_CARD_W = SCREEN_WIDTH * 0.62;

type Category = {
  key: string; label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string; href: Href;
};

const categories: Category[] = [
  { key: 'venues',       label: 'Venues',       icon: 'business-outline',     color: '#E8714A', href: '/services/venues' },
  { key: 'catering',     label: 'Catering',      icon: 'restaurant-outline',   color: '#C2773F', href: '/services/catering' },
  { key: 'photographers',label: 'Photography',   icon: 'camera-outline',       color: '#639E6F', href: '/services/photographers' },
  { key: 'av',           label: 'Audio & Visual',icon: 'volume-high-outline',  color: '#7B68C8', href: '/services/av' },
  { key: 'printings',    label: 'Printings',     icon: 'print-outline',        color: '#F5C418', href: '/services/printings' },
  { key: 'packages',     label: 'Full Package',  icon: 'gift-outline',         color: '#D4597A', href: '/services/package' as any },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors);

  const [venues, setVenues]           = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there';

  useEffect(() => { fetchFeaturedVenues(); }, []);

  async function fetchFeaturedVenues() {
    const { data } = await supabase.from('venues').select('*').eq('is_available', true).limit(5);
    setVenues(data ?? []);
    setLoadingVenues(false);
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.cream} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good morning 👋</Text>
            <Text style={s.userName}>{firstName}</Text>
          </View>
          
        </View>

        {/* ── Hero Banner ── */}
        <View style={s.hero}>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>Plan your perfect event</Text>
            <Text style={s.heroTitle}>Everything in{'\n'}one place.</Text>
            <Text style={s.heroSubtitle}>
              Venues, catering, photography, A/V & more — all in one cart.
            </Text>
            <TouchableOpacity style={s.heroBtn} onPress={() => router.push('/services/package')} activeOpacity={0.85}>
              <Text style={s.heroBtnText}>Start Planning</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.coral} />
            </TouchableOpacity>
          </View>
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />
        </View>

        {/* ── Service Categories ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Services</Text>
          <View style={s.categoryGrid}>
            {[0, 1].map((rowIndex) => (
              <View key={rowIndex} style={s.categoryRow}>
                {categories.slice(rowIndex * 3, rowIndex * 3 + 3).map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={s.categoryCard}
                    onPress={() => router.push(cat.href as any)}
                    activeOpacity={0.8}>
                    <View style={[s.categoryIcon, { backgroundColor: `${cat.color}18` }]}>
                      <Ionicons name={cat.icon} size={24} color={cat.color} />
                    </View>
                    <Text style={s.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* ── Featured Venues ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Featured Venues</Text>
            <TouchableOpacity onPress={() => router.push('/services/venues')}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {venues.length === 0 && !loadingVenues ? (
            <View style={s.emptyVenues}>
              <Ionicons name="business-outline" size={32} color={colors.mutedFg} />
              <Text style={s.emptyText}>No venues yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.venueList}>
              {loadingVenues
                ? [1, 2, 3].map((i) => <VenueSkeleton key={i} colors={colors} />)
                : venues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      colors={colors}
                      onPress={() => router.push(`/services/venues/${venue.id}` as Href)}
                    />
                  ))}
            </ScrollView>
          )}
        </View>

        {/* ── Quick Actions ── */}
        

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VenueCard({ venue, colors, onPress }: { venue: Venue; colors: AppColors; onPress: () => void }) {
  const s = makeStyles(colors);
  return (
    <TouchableOpacity style={s.venueCard} onPress={onPress} activeOpacity={0.9}>
      <View style={s.venueImageWrap}>
        {venue.images?.[0] ? (
          <Image source={{ uri: venue.images[0] }} style={s.venueImage} />
        ) : (
          <View style={s.venueImagePlaceholder}>
            <Ionicons name="business" size={32} color={colors.mutedFg} />
          </View>
        )}
        <View style={s.venuePriceBadge}>
          <Text style={s.venuePriceText}>{venue.price_per_day?.toLocaleString()} EGP/day</Text>
        </View>
      </View>
      <View style={s.venueInfo}>
        <Text style={s.venueName} numberOfLines={1}>{venue.name}</Text>
        <View style={s.venueRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedFg} />
          <Text style={s.venueMeta} numberOfLines={1}>{venue.city}</Text>
        </View>
        <View style={s.venueRow}>
          <Ionicons name="people-outline" size={13} color={colors.mutedFg} />
          <Text style={s.venueMeta}>Up to {venue.capacity} guests</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VenueSkeleton({ colors }: { colors: AppColors }) {
  const s = makeStyles(colors);
  return (
    <View style={[s.venueCard, { opacity: 0.5 }]}>
      <View style={[s.venueImageWrap, { backgroundColor: colors.muted }]} />
      <View style={s.venueInfo}>
        <View style={s.skeletonLine} />
        <View style={[s.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}



// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.cream },
    scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40 },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing['2xl'], marginBottom: spacing.xl,
    },
    greeting: { fontSize: fontSizes.sm, color: colors.mutedFg, fontWeight: '500' },
    userName: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.charcoal, marginTop: 2 },
    notifBtn: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: colors.white,
      alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },

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
      fontSize: fontSizes.xs, fontWeight: '700', color: colors.coralLight,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm,
    },
    heroTitle: {
      fontSize: fontSizes['3xl'], fontWeight: '800', color: colors.white,
      lineHeight: 40, marginBottom: spacing.sm,
    },
    heroSubtitle: {
      fontSize: fontSizes.sm, color: `${colors.white}99`,
      lineHeight: 20, marginBottom: spacing.lg,
    },
    heroBtn: {
      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
      backgroundColor: colors.cream,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderRadius: radius.full, gap: spacing.sm,
    },
    heroBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.coral },
    heroCircle1: {
      position: 'absolute', width: 160, height: 160, borderRadius: 80,
      backgroundColor: `${colors.coral}25`, top: -40, right: -30,
    },
    heroCircle2: {
      position: 'absolute', width: 100, height: 100, borderRadius: 50,
      backgroundColor: `${colors.coral}15`, top: 30, right: 80,
    },

    section: { marginBottom: spacing['2xl'] },
    sectionTitle: {
      fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal,
      paddingHorizontal: spacing['2xl'], marginBottom: spacing.lg,
    },
    sectionRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing['2xl'], marginBottom: spacing.lg,
    },
    seeAll: { fontSize: fontSizes.sm, color: colors.coral, fontWeight: '600' },

    categoryGrid: { paddingHorizontal: spacing.lg, gap: spacing.md },
    categoryRow: { flexDirection: 'row', gap: spacing.md },
    categoryCard: {
      flex: 1, backgroundColor: colors.white, borderRadius: radius.lg,
      paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadows.sm,
    },
    categoryIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    categoryLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.charcoal, textAlign: 'center' },

    venueList: { paddingHorizontal: spacing['2xl'], gap: spacing.lg },
    venueCard: { width: VENUE_CARD_W, backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
    venueImageWrap: { height: 150, backgroundColor: colors.muted },
    venueImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    venueImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    venuePriceBadge: {
      position: 'absolute', bottom: spacing.sm, left: spacing.sm,
      backgroundColor: `${colors.charcoal}CC`,
      paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm,
    },
    venuePriceText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '600' },
    venueInfo: { padding: spacing.md, gap: spacing.xs },
    venueName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
    venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    venueMeta: { fontSize: fontSizes.xs, color: colors.mutedFg, flex: 1 },

   
    emptyVenues: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
    emptyText: { fontSize: fontSizes.sm, color: colors.mutedFg },
    skeletonLine: { height: 12, width: '80%', backgroundColor: colors.muted, borderRadius: radius.sm, marginBottom: spacing.xs },
  });
}
