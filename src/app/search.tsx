import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../constants/theme';
import type { AppColors } from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultKind = 'venue' | 'restaurant' | 'photographer' | 'av' | 'printing';

type Result = {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  image?: string;
  price?: string;
  badge?: string;
  badgeColor?: string;
};

const KIND_META: Record<ResultKind, {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: (id: string) => string;
}> = {
  venue:        { label: 'Venue',       icon: 'business-outline',    color: '#E8714A', route: id => `/services/venues/${id}` },
  restaurant:   { label: 'Catering',    icon: 'restaurant-outline',  color: '#C2773F', route: id => `/services/catering/${id}` },
  photographer: { label: 'Photography', icon: 'camera-outline',      color: '#639E6F', route: id => `/services/photographers/${id}` },
  av:           { label: 'A/V',         icon: 'volume-high-outline', color: '#7B68C8', route: () => '/services/av' },
  printing:     { label: 'Printing',    icon: 'print-outline',       color: '#F5C418', route: () => '/services/printings' },
};

const CATEGORIES: { key: ResultKind | 'all'; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all',         label: 'All',         icon: 'apps-outline' },
  { key: 'venue',       label: 'Venues',      icon: 'business-outline' },
  { key: 'restaurant',  label: 'Catering',    icon: 'restaurant-outline' },
  { key: 'photographer',label: 'Photography', icon: 'camera-outline' },
  { key: 'av',          label: 'A/V',         icon: 'volume-high-outline' },
  { key: 'printing',    label: 'Printing',    icon: 'print-outline' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Result[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter,   setFilter]   = useState<ResultKind | 'all'>('all');

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]); setSearched(false); return;
    }
    debounce.current = setTimeout(() => runSearch(query.trim()), 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  async function runSearch(q: string) {
    setLoading(true);
    const like = `%${q}%`;

    const [venues, restaurants, photographers, avEquip, printings] = await Promise.all([
      supabase.from('venues').select('id, name, city, area, price_per_day, images, type').ilike('name', like).limit(6),
      supabase.from('restaurants').select('id, name, cuisine, description, images').ilike('name', like).limit(6),
      supabase.from('photographers').select('id, name, type, bio, price_per_day, images, rating').ilike('name', like).limit(6),
      supabase.from('av_equipment').select('id, name, category, price_per_day, image').ilike('name', like).limit(6),
      supabase.from('printing_items').select('id, name, category, price_per_unit, image').ilike('name', like).limit(6),
    ]);

    const mapped: Result[] = [
      ...(venues.data ?? []).map((v: any): Result => ({
        id: v.id, kind: 'venue',
        title: v.name,
        subtitle: [v.area, v.city].filter(Boolean).join(', '),
        image: v.images?.[0],
        price: `${v.price_per_day?.toLocaleString()} EGP/day`,
        badge: v.type,
        badgeColor: v.type?.toLowerCase() === 'outdoor' ? '#639E6F' : '#221E1A',
      })),
      ...(restaurants.data ?? []).map((r: any): Result => ({
        id: r.id, kind: 'restaurant',
        title: r.name,
        subtitle: r.cuisine ?? '',
        image: r.images?.[0],
        badge: r.cuisine,
        badgeColor: '#C2773F',
      })),
      ...(photographers.data ?? []).map((p: any): Result => ({
        id: p.id, kind: 'photographer',
        title: p.name,
        subtitle: p.type === 'company' ? 'Photography Company' : 'Individual Photographer',
        image: p.images?.[0],
        price: `${p.price_per_day?.toLocaleString()} EGP/day`,
        badge: p.rating ? `★ ${p.rating.toFixed(1)}` : undefined,
        badgeColor: '#F5C418',
      })),
      ...(avEquip.data ?? []).map((a: any): Result => ({
        id: a.id, kind: 'av',
        title: a.name,
        subtitle: a.category ?? 'A/V Equipment',
        image: a.image,
        price: `${a.price_per_day?.toLocaleString()} EGP/day`,
      })),
      ...(printings.data ?? []).map((p: any): Result => ({
        id: p.id, kind: 'printing',
        title: p.name,
        subtitle: p.category ?? 'Printing',
        image: p.image,
        price: `${p.price_per_unit?.toLocaleString()} EGP/piece`,
      })),
    ];

    setResults(mapped);
    setLoading(false);
    setSearched(true);
  }

  const filtered = filter === 'all' ? results : results.filter(r => r.kind === filter);

  // Group by kind for "all" view
  const grouped = CATEGORIES.slice(1).reduce<Record<string, Result[]>>((acc, cat) => {
    const items = results.filter(r => r.kind === cat.key);
    if (items.length > 0) acc[cat.key] = items;
    return acc;
  }, {});

  return (
    <View style={s.screen}>

      {/* Search header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={s.inputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.mutedFg} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Search venues, catering, photographers…"
            placeholderTextColor={colors.mutedFg}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category filter chips */}
      {results.length > 0 || searched ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersWrap} contentContainerStyle={s.filters}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[s.filterChip, filter === cat.key && s.filterChipOn]}
              onPress={() => setFilter(cat.key)}
              activeOpacity={0.8}>
              <Ionicons
                name={cat.icon}
                size={13}
                color={filter === cat.key ? colors.white : colors.charcoalLight}
              />
              <Text style={[s.filterChipTxt, filter === cat.key && s.filterChipTxtOn]}>{cat.label}</Text>
              {cat.key !== 'all' && results.filter(r => r.kind === cat.key).length > 0 ? (
                <View style={[s.filterCount, filter === cat.key && s.filterCountOn]}>
                  <Text style={[s.filterCountTxt, filter === cat.key && s.filterCountTxtOn]}>
                    {results.filter(r => r.kind === cat.key).length}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Loading */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.coral} />
            <Text style={s.loadingTxt}>Searching…</Text>
          </View>
        ) : query.trim().length < 2 ? (
          /* Prompt */
          <View style={s.center}>
            <View style={s.promptIcon}>
              <Ionicons name="search-outline" size={36} color={colors.mutedFg} />
            </View>
            <Text style={s.promptTitle}>Search everything</Text>
            <Text style={s.promptSub}>Venues, catering, photographers, A/V equipment, printings — all in one place.</Text>

            {/* Quick categories */}
            <View style={s.quickGrid}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.quickCard, { borderColor: `${KIND_META[cat.key as ResultKind].color}40` }]}
                  onPress={() => router.push(KIND_META[cat.key as ResultKind].route('') as any)}
                  activeOpacity={0.8}>
                  <View style={[s.quickIcon, { backgroundColor: `${KIND_META[cat.key as ResultKind].color}18` }]}>
                    <Ionicons name={cat.icon} size={22} color={KIND_META[cat.key as ResultKind].color} />
                  </View>
                  <Text style={s.quickLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : searched && filtered.length === 0 ? (
          /* No results */
          <View style={s.center}>
            <View style={s.promptIcon}>
              <Ionicons name="search-outline" size={36} color={colors.mutedFg} />
            </View>
            <Text style={s.promptTitle}>No results found</Text>
            <Text style={s.promptSub}>{`No matches for "${query}"${filter !== 'all' ? ` in ${CATEGORIES.find(c => c.key === filter)?.label}` : ''}.`}</Text>
          </View>
        ) : filter !== 'all' ? (
          /* Filtered flat list */
          <View style={s.resultsList}>
            {filtered.map(item => <ResultCard key={item.id} item={item} colors={colors} />)}
          </View>
        ) : (
          /* Grouped by category */
          Object.entries(grouped).map(([kind, items]) => {
            const meta = KIND_META[kind as ResultKind];
            return (
              <View key={kind} style={s.group}>
                <View style={s.groupHeader}>
                  <View style={[s.groupIconWrap, { backgroundColor: `${meta.color}18` }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <Text style={s.groupTitle}>{meta.label}</Text>
                  <TouchableOpacity onPress={() => setFilter(kind as ResultKind)}>
                    <Text style={s.groupSeeAll}>See all {items.length}</Text>
                  </TouchableOpacity>
                </View>
                {items.map(item => <ResultCard key={item.id} item={item} colors={colors} />)}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ item, colors }: { item: Result; colors: AppColors }) {
  const s = makeStyles(colors);
  const meta = KIND_META[item.kind];

  function handlePress() {
    router.push(meta.route(item.id) as any);
  }

  return (
    <TouchableOpacity style={s.resultCard} onPress={handlePress} activeOpacity={0.85}>
      <View style={s.resultImg}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={s.resultImgSrc} />
        ) : (
          <View style={[s.resultImgPlaceholder, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
        )}
      </View>
      <View style={s.resultBody}>
        <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        {item.price ? <Text style={s.resultPrice}>{item.price}</Text> : null}
      </View>
      <View style={s.resultRight}>
        {item.badge ? (
          <View style={[s.badge, { backgroundColor: `${item.badgeColor ?? meta.color}20` }]}>
            <Text style={[s.badgeTxt, { color: item.badgeColor ?? meta.color }]}>{item.badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.cream },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingBottom: spacing.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: radius.full,
      backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    inputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.white, borderRadius: radius.lg,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      gap: spacing.sm, ...shadows.sm,
    },
    input: { flex: 1, fontSize: fontSizes.base, color: colors.charcoal, padding: 0 },

    filtersWrap: { flexGrow: 0, marginBottom: spacing.md },
    filters: { paddingHorizontal: spacing['2xl'], gap: spacing.sm },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.full, backgroundColor: colors.white,
      borderWidth: 1, borderColor: colors.border,
    },
    filterChipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
    filterChipTxt: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.charcoalLight },
    filterChipTxtOn: { color: colors.white },
    filterCount: {
      minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.muted,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    filterCountOn: { backgroundColor: 'rgba(255,255,255,0.3)' },
    filterCountTxt: { fontSize: 10, fontWeight: '700', color: colors.charcoalLight },
    filterCountTxtOn: { color: colors.white },

    content: { paddingHorizontal: spacing['2xl'] },

    center: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.lg },
    promptIcon: {
      width: 72, height: 72, borderRadius: radius.full,
      backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
    },
    promptTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
    promptSub: { fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.xl },

    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginTop: spacing.md, width: '100%' },
    quickCard: {
      width: '44%', backgroundColor: colors.white, borderRadius: radius.xl,
      padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
      borderWidth: 1, ...shadows.sm,
    },
    quickIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal, textAlign: 'center' },

    loadingTxt: { fontSize: fontSizes.sm, color: colors.mutedFg, marginTop: spacing.sm },

    group: { marginBottom: spacing.xl },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    groupIconWrap: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    groupTitle: { flex: 1, fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
    groupSeeAll: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.coral },

    resultsList: { gap: spacing.sm },

    resultCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.white, borderRadius: radius.xl,
      marginBottom: spacing.sm, overflow: 'hidden', ...shadows.sm,
    },
    resultImg: { width: 72, height: 72 },
    resultImgSrc: { width: '100%', height: '100%', resizeMode: 'cover' },
    resultImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    resultBody: { flex: 1, paddingHorizontal: spacing.md, gap: 3 },
    resultTitle: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal },
    resultSubtitle: { fontSize: fontSizes.xs, color: colors.mutedFg },
    resultPrice: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.coral },
    resultRight: { paddingRight: spacing.md, alignItems: 'flex-end', gap: spacing.xs },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
    badgeTxt: { fontSize: 10, fontWeight: '700' },
  });
}
