import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TextInput,
  TouchableOpacity, Image, Platform, ActivityIndicator,
  Modal, Animated, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../context/CartContext';
import { colors as staticColors, spacing, radius, shadows, fontSizes } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { CalendarGrid } from '../../components/CalendarGrid';
import type { AppColors } from '../../constants/theme';
import type {
  Venue, Restaurant, CateringPackage,
  AVEquipment, PrintingItem, Photographer,
} from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = 'venue' | 'catering' | 'av' | 'printings' | 'photography';
type QtyMap  = Record<string, number>;

type VenueSelection       = { venue: Venue; dates: string[] };
type CateringSelection    = { restaurant: Restaurant; pkg: CateringPackage; guestCount: number };
type PhotographySelection = { photographer: Photographer; dates: string[] };

const STEPS: { key: StepKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; required: boolean }[] = [
  { key: 'venue',       label: 'Venue',          icon: 'business-outline',    color: staticColors.coral,  required: true },
  { key: 'catering',    label: 'Catering',        icon: 'restaurant-outline',  color: '#C2773F',     required: false },
  { key: 'av',          label: 'Audio & Visual',  icon: 'volume-high-outline', color: '#7B68C8',     required: false },
  { key: 'printings',   label: 'Printings',       icon: 'print-outline',       color: staticColors.gold,   required: false },
  { key: 'photography', label: 'Photography',     icon: 'camera-outline',      color: staticColors.sage,   required: false },
];

// ─── Filter constants ─────────────────────────────────────────────────────────

const VENUE_SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price_asc',  icon: 'trending-up-outline' },
  { label: 'Price: High to Low', value: 'price_desc', icon: 'trending-down-outline' },
  { label: 'Largest Capacity',   value: 'capacity',   icon: 'people-outline' },
] as const;
type VenueSortValue = (typeof VENUE_SORT_OPTIONS)[number]['value'];

const CAPACITY_OPTIONS = [
  { label: 'Any',       min: 0,   max: 99999 },
  { label: 'Up to 100', min: 0,   max: 100 },
  { label: '100 – 300', min: 100, max: 300 },
  { label: '300 – 500', min: 300, max: 500 },
  { label: '500+',      min: 500, max: 99999 },
];

const AREAS = ['Any', 'Downtown', 'Maadi', 'Zamalek', 'Mohandessin', 'Heliopolis', 'October', 'Alexandria', 'New Cairo'];

const CUISINE_CATS = ['All', 'Egyptian', 'Italian', 'BBQ', 'Seafood', 'Vegetarian', 'International'];

const AV_CATS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'stage',     label: 'Stage' },
  { key: 'led',       label: 'LED' },
  { key: 'projector', label: 'Projector' },
  { key: 'audio',     label: 'Audio' },
  { key: 'monitors',  label: 'Monitors' },
  { key: 'lights',    label: 'Lights' },
];

const PRINT_CATS: { key: string; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'invitations', label: 'Invitations' },
  { key: 'menus',       label: 'Menus' },
  { key: 'banners',     label: 'Banners' },
  { key: 'table',       label: 'Table' },
  { key: 'signage',     label: 'Signage' },
  { key: 'favors',      label: 'Favors' },
];

const PHOTO_SORT_OPTIONS = [
  { label: 'Price: Low to High', value: 'price_asc',  icon: 'trending-up-outline' },
  { label: 'Price: High to Low', value: 'price_desc', icon: 'trending-down-outline' },
  { label: 'Top Rated',          value: 'rating',     icon: 'star-outline' },
] as const;
type PhotoSortValue = (typeof PHOTO_SORT_OPTIONS)[number]['value'];

const PRICE_OPTIONS = [
  { label: 'Any',       min: 0,    max: 999999 },
  { label: 'Up to 3k',  min: 0,    max: 3000 },
  { label: '3k – 6k',   min: 3000, max: 6000 },
  { label: '6k – 9k',   min: 6000, max: 9000 },
  { label: '9k+',       min: 9000, max: 999999 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

function dispDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function longDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}


// ─── Shared: Sheet wrapper ────────────────────────────────────────────────────

function useSheet() {
  const anim = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  function show() {
    setOpen(true);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
  }
  function hide(cb?: () => void) {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true })
      .start(() => { setOpen(false); cb?.(); });
  }
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  return { open, show, hide, translateY };
}

// ─── Shared: Filter chips row ─────────────────────────────────────────────────

type ChipOpt = string | { value: string; label: string };

function FilterChips({ options, active, onSelect, colors }: {
  options: ChipOpt[]; active: string; onSelect: (v: string) => void; colors: AppColors;
}) {
  const s = makeStyles(colors);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsContent} style={s.filterChipsWrap}>
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isActive = active === value;
        return (
          <TouchableOpacity
            key={value}
            style={[s.chip, isActive && s.chipOn]}
            onPress={() => onSelect(value)}
            activeOpacity={0.8}>
            <Text style={[s.chipTxt, isActive && s.chipTxtOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function PackageScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const { addItem } = useCart();
  const [step, setStep] = useState(0);

  const [venueSelection,   setVenueSelection]   = useState<VenueSelection | null>(null);
  const [cateringSel,      setCateringSel]       = useState<CateringSelection | null>(null);
  const [avQty,            setAvQty]             = useState<QtyMap>({});
  const [avItems,          setAvItems]           = useState<AVEquipment[]>([]);
  const [printQty,         setPrintQty]          = useState<QtyMap>({});
  const [printItems,       setPrintItems]        = useState<PrintingItem[]>([]);
  const [photoSel,         setPhotoSel]          = useState<PhotographySelection | null>(null);

  const cur       = STEPS[step];
  const isSummary = step === STEPS.length;

  function canNext() {
    if (!cur) return true;
    return cur.required ? (step === 0 ? venueSelection !== null : true) : true;
  }

  function handleAddAllToCart() {
    if (venueSelection) {
      const vDays = venueSelection.dates.length;
      addItem({ serviceType:'venue', serviceId:venueSelection.venue.id, serviceName:venueSelection.venue.name, quantity:vDays, unitPrice:venueSelection.venue.price_per_day, subtotal:venueSelection.venue.price_per_day*vDays, metadata:{ eventDate:venueSelection.dates[0], eventDates:venueSelection.dates } });
    }
    if (cateringSel) { const t = cateringSel.pkg.price_per_person * cateringSel.guestCount; addItem({ serviceType:'catering', serviceId:cateringSel.pkg.id, serviceName:`${cateringSel.restaurant.name} — ${cateringSel.pkg.name}`, quantity:1, unitPrice:t, subtotal:t, metadata:{ guestCount:cateringSel.guestCount, pricePerPerson:cateringSel.pkg.price_per_person } }); }
    avItems.forEach((i) => { const q = avQty[i.id]??0; if(q>0) addItem({ serviceType:'av', serviceId:i.id, serviceName:i.name, quantity:q, unitPrice:i.price_per_day, subtotal:i.price_per_day*q, metadata:{} }); });
    printItems.forEach((i) => { const q = printQty[i.id]??0; if(q>0) addItem({ serviceType:'printing', serviceId:i.id, serviceName:i.name, quantity:q, unitPrice:i.price_per_unit, subtotal:i.price_per_unit*q, metadata:{} }); });
    if (photoSel) {
      const pDays = photoSel.dates.length;
      addItem({ serviceType:'photographer', serviceId:photoSel.photographer.id, serviceName:photoSel.photographer.name, quantity:pDays, unitPrice:photoSel.photographer.price_per_day, subtotal:photoSel.photographer.price_per_day*pDays, metadata:{ eventDate:photoSel.dates[0], eventDates:photoSel.dates } });
    }
    router.push('/(tabs)/cart' as any);
  }

  const vDays      = venueSelection?.dates.length ?? 0;
  const pDays      = photoSel?.dates.length ?? 0;
  const avTotal    = avItems.reduce((s,i) => s + i.price_per_day*(avQty[i.id]??0), 0);
  const printTotal = printItems.reduce((s,i) => s + i.price_per_unit*(printQty[i.id]??0), 0);
  const cTotal     = cateringSel ? cateringSel.pkg.price_per_person * cateringSel.guestCount : 0;
  const grandTotal = (venueSelection?.venue.price_per_day??0)*vDays + cTotal + avTotal + printTotal + (photoSel?.photographer.price_per_day??0)*pDays;

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => step === 0 ? router.back() : setStep(p=>p-1)}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>{isSummary ? 'Summary' : cur.label}</Text>
          <Text style={s.headerSub}>{isSummary ? 'Review & confirm' : `Step ${step+1} of ${STEPS.length}`}</Text>
        </View>
        <View style={{width:40}} />
      </View>

      {/* Progress */}
      <View style={s.progress}>
        {STEPS.map((st, idx) => {
          const done = idx < step || (idx === step && (idx===0 ? !!venueSelection : true));
          const cur2 = idx === step && !isSummary;
          return (
            <View key={st.key} style={s.progressItem}>
              <View style={[s.progressDot, { backgroundColor: done ? st.color : cur2 ? st.color : colors.border }]}>
                {done && !cur2
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <Ionicons name={st.icon} size={10} color={cur2 ? '#fff' : colors.mutedFg} />}
              </View>
              {idx < STEPS.length-1
                ? <View style={[s.progressLine, {backgroundColor: idx<step ? STEPS[idx].color : colors.border}]} />
                : null}
            </View>
          );
        })}
      </View>

      {/* Content */}
      <View style={s.content}>
        {isSummary   ? <SummaryStep colors={colors} venueSelection={venueSelection} cateringSel={cateringSel} avItems={avItems} avQty={avQty} printItems={printItems} printQty={printQty} photoSel={photoSel} grandTotal={grandTotal} /> :
         step === 0  ? <VenueStep       colors={colors} selection={venueSelection} onSelect={setVenueSelection} /> :
         step === 1  ? <CateringStep    colors={colors} selection={cateringSel}    onSelect={setCateringSel}    /> :
         step === 2  ? <AVStep          colors={colors} qty={avQty} setQty={setAvQty} items={avItems} setItems={setAvItems} /> :
         step === 3  ? <PrintingsStep   colors={colors} qty={printQty} setQty={setPrintQty} items={printItems} setItems={setPrintItems} /> :
                       <PhotographyStep colors={colors} selection={photoSel} onSelect={setPhotoSel} venueDates={venueSelection?.dates ?? []} />}
      </View>

      {/* Bottom bar */}
      {isSummary ? (
        <View style={s.bar}>
          <View>
            <Text style={s.barTotal}>{`${grandTotal.toLocaleString()} EGP`}</Text>
            <Text style={s.barSub}>Total package</Text>
          </View>
          <TouchableOpacity style={s.nextBtn} onPress={handleAddAllToCart} activeOpacity={0.85}>
            <Ionicons name="bag-add-outline" size={18} color="#fff" />
            <Text style={s.nextBtnTxt}>Add All to Cart</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.bar}>
          {cur && !cur.required ? (
            <TouchableOpacity style={s.skipBtn} onPress={() => setStep(p=>p+1)}>
              <Text style={s.skipTxt}>Skip</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
            </TouchableOpacity>
          ) : <View style={{flex:1}} />}
          <TouchableOpacity
            style={[s.nextBtn, !canNext() && s.nextBtnOff]}
            onPress={() => setStep(p=>p+1)}
            disabled={!canNext()}>
            <Text style={s.nextBtnTxt}>{step === STEPS.length-1 ? 'Review' : 'Next'}</Text>
            <Ionicons name={step===STEPS.length-1 ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Step 1: Venue ────────────────────────────────────────────────────────────

function VenueStep({ selection, onSelect, colors }: { selection: VenueSelection|null; onSelect:(s:VenueSelection)=>void; colors: AppColors }) {
  const s = makeStyles(colors);
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [locType, setLocType] = useState<'All'|'Indoor'|'Outdoor'>('All');
  const [detail, setDetail]   = useState<Venue|null>(null);
  const [dates, setDates]     = useState<string[]>([]);

  // Filter state (applied)
  const [sortBy, setSortBy]           = useState<VenueSortValue>('price_asc');
  const [capacityIdx, setCapacityIdx] = useState(0);
  const [area, setArea]               = useState('Any');
  // Temp (in sheet before Apply)
  const [tmpSort, setTmpSort]           = useState<VenueSortValue>('price_asc');
  const [tmpCapIdx, setTmpCapIdx]       = useState(0);
  const [tmpArea, setTmpArea]           = useState('Any');

  const detailSheet = useSheet();
  const filterSheet = useSheet();

  useEffect(() => {
    supabase.from('venues').select('*').eq('is_available', true)
      .then(({ data }) => { setVenues(data ?? []); setLoading(false); });
  }, []);

  function openDetail(v: Venue) { setDetail(v); setDates([]); detailSheet.show(); }
  function confirm() { if (!detail || dates.length === 0) return; onSelect({ venue: detail, dates }); detailSheet.hide(); }

  function openFilter() {
    setTmpSort(sortBy); setTmpCapIdx(capacityIdx); setTmpArea(area);
    filterSheet.show();
  }
  function applyFilter() {
    setSortBy(tmpSort); setCapacityIdx(tmpCapIdx); setArea(tmpArea);
    filterSheet.hide();
  }
  function resetFilter() { setTmpSort('price_asc'); setTmpCapIdx(0); setTmpArea('Any'); }

  // Apply filters
  let filtered = venues.filter(v => {
    const mSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase());
    const mType   = locType === 'All' || v.type?.toLowerCase() === locType.toLowerCase();
    const mArea   = area === 'Any' || v.area?.toLowerCase().includes(area.toLowerCase());
    const cap     = CAPACITY_OPTIONS[capacityIdx];
    const mCap    = (v.capacity ?? 0) >= cap.min && (v.capacity ?? 0) <= cap.max;
    return mSearch && mType && mArea && mCap;
  });

  if (sortBy === 'price_asc')  filtered = [...filtered].sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0));
  if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => (b.price_per_day ?? 0) - (a.price_per_day ?? 0));
  if (sortBy === 'capacity')   filtered = [...filtered].sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));

  const activeFilterCount = (sortBy !== 'price_asc' ? 1 : 0) + (capacityIdx !== 0 ? 1 : 0) + (area !== 'Any' ? 1 : 0);
  const avail = Array.isArray(detail?.available_dates) ? detail!.available_dates : [];

  return (
    <View style={{flex:1}}>
      {selection ? (
        <View style={s.selBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.coral} />
          <View style={{flex:1}}>
            <Text style={s.selName}>{selection.venue.name}</Text>
            <Text style={s.selSub}>{`${selection.dates.length === 1 ? dispDate(selection.dates[0]) : `${selection.dates.length} days`} · ${selection.venue.city}`}</Text>
          </View>
          <TouchableOpacity onPress={() => openDetail(selection.venue)}>
            <Text style={s.changeBtn}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.reqBanner}>
          <Ionicons name="information-circle-outline" size={15} color={colors.coral} />
          <Text style={s.reqTxt}>Venue is required to continue</Text>
        </View>
      )}

      {/* Search + Filter button */}
      <View style={s.searchFilterRow}>
        <View style={[s.searchRow, {flex:1, marginBottom:0}]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedFg} />
          <TextInput style={s.searchInput} placeholder="Search venues..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch} />
          {search.length > 0 ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.mutedFg} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]} onPress={openFilter}>
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? colors.white : colors.charcoal} />
          {activeFilterCount > 0 ? <Text style={s.filterBtnTxt}>{activeFilterCount}</Text> : <Text style={s.filterLabelTxt}>Filter</Text>}
        </TouchableOpacity>
      </View>

      {/* Location type chips */}
      <FilterChips
        colors={colors}
        options={['All', 'Indoor', 'Outdoor']}
        active={locType}
        onSelect={(v) => setLocType(v as any)}
      />

      {/* Active filter pills */}
      {(area !== 'Any' || capacityIdx !== 0 || sortBy !== 'price_asc') ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.activePills} style={{flexGrow:0, marginBottom:spacing.sm}}>
          {sortBy !== 'price_asc' ? (
            <TouchableOpacity style={s.activePill} onPress={() => setSortBy('price_asc')}>
              <Ionicons name="funnel" size={11} color={colors.coral} />
              <Text style={s.activePillTxt}>{VENUE_SORT_OPTIONS.find(o => o.value === sortBy)?.label}</Text>
              <Ionicons name="close" size={11} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
          {area !== 'Any' ? (
            <TouchableOpacity style={s.activePill} onPress={() => setArea('Any')}>
              <Ionicons name="location" size={11} color={colors.coral} />
              <Text style={s.activePillTxt}>{area}</Text>
              <Ionicons name="close" size={11} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
          {capacityIdx !== 0 ? (
            <TouchableOpacity style={s.activePill} onPress={() => setCapacityIdx(0)}>
              <Ionicons name="people" size={11} color={colors.coral} />
              <Text style={s.activePillTxt}>{CAPACITY_OPTIONS[capacityIdx].label}</Text>
              <Ionicons name="close" size={11} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={s.resultRow}>
        <Text style={s.resultCount}>{`${filtered.length} venue${filtered.length !== 1 ? 's' : ''}`}</Text>
        {activeFilterCount > 0 ? (
          <TouchableOpacity onPress={() => { setSortBy('price_asc'); setCapacityIdx(0); setArea('Any'); }}>
            <Text style={s.clearAllTxt}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading
        ? <ActivityIndicator color={colors.coral} style={{marginTop:40}} />
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{gap:spacing.md, paddingBottom:16}}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons name="business-outline" size={40} color={colors.mutedFg} />
                <Text style={s.emptyStateTitle}>No venues found</Text>
                <Text style={s.emptyStateSub}>Try adjusting your search or filters</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.venueCard, selection?.venue.id === item.id && s.cardSelected]}
                onPress={() => openDetail(item)} activeOpacity={0.9}>
                <View style={s.venueImgWrap}>
                  {item.images?.[0]
                    ? <Image source={{uri:item.images[0]}} style={s.venueImg} />
                    : <View style={s.imgPlaceholder}><Ionicons name="business" size={28} color={colors.mutedFg} /></View>}
                  {item.type ? (
                    <View style={[s.typeBadge, {backgroundColor: item.type.toLowerCase()==='outdoor' ? `${colors.sage}DD` : `${colors.charcoal}CC`}]}>
                      <Ionicons name={item.type.toLowerCase()==='outdoor' ? 'leaf' : 'home'} size={10} color="#fff" />
                      <Text style={s.typeBadgeTxt}>{item.type}</Text>
                    </View>
                  ) : null}
                  {selection?.venue.id === item.id ? <View style={s.checkOverlay}><Ionicons name="checkmark-circle" size={26} color={colors.coral} /></View> : null}
                </View>
                <View style={s.venueBody}>
                  <Text style={s.venueName} numberOfLines={1}>{item.name}</Text>
                  <View style={s.metaRow}><Ionicons name="location-outline" size={13} color={colors.mutedFg}/><Text style={s.metaTxt}>{[item.area, item.city].filter(Boolean).join(', ')}</Text></View>
                  <View style={s.metaRow}><Ionicons name="people-outline" size={13} color={colors.mutedFg}/><Text style={s.metaTxt}>{`Up to ${item.capacity} guests`}</Text></View>
                  {Array.isArray(item.amenities) && item.amenities.length > 0 ? (
                    <View style={s.amenRow}>
                      {item.amenities.slice(0,3).map(a => <View key={a} style={s.amenTag}><Text style={s.amenTxt}>{a}</Text></View>)}
                      {item.amenities.length > 3 ? <Text style={s.amenMore}>{`+${item.amenities.length-3}`}</Text> : null}
                    </View>
                  ) : null}
                  <View style={s.priceFooter}>
                    <Text style={s.priceVal}>{item.price_per_day?.toLocaleString()}</Text>
                    <Text style={s.priceSub}>{' EGP / day'}</Text>
                    <View style={{flex:1}}/>
                    <View style={s.viewBtn}><Text style={s.viewBtnTxt}>Details</Text><Ionicons name="arrow-forward" size={13} color={colors.coral}/></View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />}

      {/* Detail sheet */}
      <Modal visible={detailSheet.open} transparent animationType="none" onRequestClose={() => detailSheet.hide()}>
        <Pressable style={s.backdrop} onPress={() => detailSheet.hide()} />
        <Animated.View style={[s.detailSheet, {transform:[{translateY:detailSheet.translateY}]}]}>
          <View style={s.sheetHandle}/>
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail?.images?.[0] ? <Image source={{uri:detail.images[0]}} style={s.detailHero}/> : <View style={[s.detailHero,{backgroundColor:colors.muted,alignItems:'center',justifyContent:'center'}]}><Ionicons name="business" size={48} color={colors.mutedFg}/></View>}
            <View style={s.detailBody}>
              <View style={s.detailTitleRow}>
                <Text style={s.detailName}>{detail?.name}</Text>
                {detail?.type ? <View style={[s.typeBadge,{backgroundColor:detail.type.toLowerCase()==='outdoor'?`${colors.sage}DD`:`${colors.charcoal}CC`,position:'relative',top:0,left:0}]}><Ionicons name={detail.type.toLowerCase()==='outdoor'?'leaf':'home'} size={11} color="#fff"/><Text style={s.typeBadgeTxt}>{detail.type}</Text></View>:null}
              </View>
              <View style={s.detailMeta}>
                <View style={s.detailMetaItem}><Ionicons name="location-outline" size={15} color={colors.coral}/><Text style={s.detailMetaTxt}>{[detail?.area,detail?.city].filter(Boolean).join(', ')||'—'}</Text></View>
                <View style={s.detailMetaItem}><Ionicons name="people-outline" size={15} color={colors.coral}/><Text style={s.detailMetaTxt}>{`Up to ${detail?.capacity??0} guests`}</Text></View>
                <View style={s.detailMetaItem}><Ionicons name="cash-outline" size={15} color={colors.coral}/><Text style={s.detailMetaTxt}>{`${detail?.price_per_day?.toLocaleString()} EGP / day`}</Text></View>
              </View>
              {detail?.description ? <Text style={s.detailDesc}>{detail.description}</Text> : null}
              {Array.isArray(detail?.amenities) && detail!.amenities.length > 0 ? (
                <View>
                  <Text style={s.detailSectionTitle}>Amenities</Text>
                  <View style={s.amenGrid}>
                    {detail!.amenities.map(a => (
                      <View key={a} style={s.amenGridItem}>
                        <View style={s.amenGridIcon}><Ionicons name="checkmark-circle-outline" size={16} color={colors.coral}/></View>
                        <Text style={s.amenGridTxt}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              <Text style={s.detailSectionTitle}>Select Date(s)</Text>
              {dates.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pkgChipsWrap} contentContainerStyle={{ gap: spacing.sm }}>
                  {dates.map((d) => (
                    <TouchableOpacity key={d} style={s.pkgDateChip} onPress={() => setDates((p) => p.filter((x) => x !== d))}>
                      <Ionicons name="calendar" size={11} color={colors.coral} />
                      <Text style={s.pkgDateChipTxt}>{new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                      <Ionicons name="close" size={11} color={colors.coral} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
              <CalendarGrid
                selectedDates={dates}
                onToggle={(d) => setDates((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d])}
                availableDates={avail}
                colors={colors}
              />
            </View>
            <View style={{height:16}}/>
          </ScrollView>
          <TouchableOpacity style={[s.confirmBtn, dates.length === 0 && s.confirmBtnOff]} onPress={confirm} disabled={dates.length === 0} activeOpacity={0.85}>
            <Text style={s.confirmBtnTxt}>{dates.length > 0 ? `Select Venue — ${((detail?.price_per_day??0)*dates.length).toLocaleString()} EGP (${dates.length} day${dates.length>1?'s':''})` : 'Pick at least one date'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Filter sheet */}
      <Modal visible={filterSheet.open} transparent animationType="none" onRequestClose={() => filterSheet.hide()}>
        <Pressable style={s.backdrop} onPress={() => filterSheet.hide()} />
        <Animated.View style={[s.filterSheet, {transform:[{translateY:filterSheet.translateY}]}]}>
          <View style={s.sheetHandle}/>
          <View style={s.filterSheetHeader}>
            <Text style={s.filterSheetTitle}>Sort & Filter</Text>
            <TouchableOpacity onPress={resetFilter}><Text style={s.resetTxt}>Reset all</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.filterSection}>Sort by</Text>
            {VENUE_SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[s.filterOption, tmpSort === opt.value && s.filterOptionOn]} onPress={() => setTmpSort(opt.value)} activeOpacity={0.8}>
                <View style={{flexDirection:'row', alignItems:'center', gap:spacing.md}}>
                  <Ionicons name={opt.icon as any} size={18} color={tmpSort === opt.value ? colors.coral : colors.charcoalLight} />
                  <Text style={[s.filterOptionTxt, tmpSort === opt.value && s.filterOptionTxtOn]}>{opt.label}</Text>
                </View>
                {tmpSort === opt.value ? <Ionicons name="checkmark-circle" size={20} color={colors.coral} /> : <View style={s.radioEmpty}/>}
              </TouchableOpacity>
            ))}

            <Text style={s.filterSection}>Guest Capacity</Text>
            <View style={s.wrapChips}>
              {CAPACITY_OPTIONS.map((opt, idx) => (
                <TouchableOpacity key={opt.label} style={[s.wrapChip, tmpCapIdx === idx && s.wrapChipOn]} onPress={() => setTmpCapIdx(idx)}>
                  <Text style={[s.wrapChipTxt, tmpCapIdx === idx && s.wrapChipTxtOn]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.filterSection}>Area</Text>
            <View style={s.wrapChips}>
              {AREAS.map(a => (
                <TouchableOpacity key={a} style={[s.wrapChip, tmpArea === a && s.wrapChipOn]} onPress={() => setTmpArea(a)}>
                  <Text style={[s.wrapChipTxt, tmpArea === a && s.wrapChipTxtOn]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{height: spacing.xl}} />
          </ScrollView>
          <TouchableOpacity style={s.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
            <Text style={s.applyBtnTxt}>Apply Filters</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Step 2: Catering ─────────────────────────────────────────────────────────

function CateringStep({ selection, onSelect, colors }: { selection:CateringSelection|null; onSelect:(s:CateringSelection|null)=>void; colors: AppColors }) {
  const s = makeStyles(colors);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [packages,    setPackages]    = useState<CateringPackage[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [cuisine,     setCuisine]     = useState('All');
  const [detail,      setDetail]      = useState<Restaurant|null>(null);
  const [pickedPkg,   setPickedPkg]   = useState<CateringPackage|null>(null);
  const [guests,      setGuests]      = useState(50);
  const sheet = useSheet();

  useEffect(() => {
    supabase.from('restaurants').select('*').then(({ data }) => { setRestaurants(data ?? []); setLoading(false); });
  }, []);

  async function openDetail(r: Restaurant) {
    setDetail(r); setPickedPkg(null); setGuests(50);
    const { data } = await supabase.from('catering_packages').select('*').eq('restaurant_id', r.id);
    setPackages(data ?? []);
    sheet.show();
  }

  function confirm() {
    if (!detail || !pickedPkg) return;
    onSelect({ restaurant: detail, pkg: pickedPkg, guestCount: guests });
    sheet.hide();
  }

  const filtered = restaurants.filter(r => {
    const mSearch  = r.name?.toLowerCase().includes(search.toLowerCase());
    const mCuisine = cuisine === 'All' || r.cuisine?.toLowerCase() === cuisine.toLowerCase();
    return mSearch && mCuisine;
  });

  return (
    <View style={{flex:1}}>
      {selection ? (
        <View style={s.selBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#C2773F" />
          <View style={{flex:1}}>
            <Text style={s.selName}>{selection.pkg.name}</Text>
            <Text style={s.selSub}>{`${selection.restaurant.name} · ${selection.guestCount} guests · ${(selection.pkg.price_per_person*selection.guestCount).toLocaleString()} EGP`}</Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(null)}><Text style={[s.changeBtn,{color:'#C2773F'}]}>Remove</Text></TouchableOpacity>
        </View>
      ) : null}

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.mutedFg}/>
        <TextInput style={s.searchInput} placeholder="Search restaurants..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch}/>
        {search.length > 0 ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.mutedFg} /></TouchableOpacity> : null}
      </View>

      {/* Cuisine filter chips */}
      <FilterChips colors={colors} options={CUISINE_CATS} active={cuisine} onSelect={setCuisine} />

      <Text style={s.resultCount}>{`${filtered.length} restaurant${filtered.length !== 1 ? 's' : ''}`}</Text>

      {loading
        ? <ActivityIndicator color={colors.coral} style={{marginTop:40}}/>
        : <FlatList
            data={filtered} keyExtractor={i => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{gap:spacing.md, paddingBottom:16}}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Ionicons name="restaurant-outline" size={40} color={colors.mutedFg} />
                <Text style={s.emptyStateTitle}>No restaurants found</Text>
                <Text style={s.emptyStateSub}>Try a different search term</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.venueCard, selection?.restaurant.id === item.id && s.cardSelected]}
                onPress={() => openDetail(item)} activeOpacity={0.9}>
                <View style={[s.venueImgWrap, {height:140}]}>
                  {item.images?.[0]
                    ? <Image source={{uri:item.images[0]}} style={s.venueImg}/>
                    : <View style={s.imgPlaceholder}><Ionicons name="restaurant" size={28} color={colors.mutedFg}/></View>}
                  <View style={[s.typeBadge, {backgroundColor:`${colors.charcoal}CC`}]}>
                    <Text style={s.typeBadgeTxt}>{item.cuisine}</Text>
                  </View>
                  {selection?.restaurant.id === item.id ? <View style={s.checkOverlay}><Ionicons name="checkmark-circle" size={26} color="#C2773F"/></View> : null}
                </View>
                <View style={s.venueBody}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <Text style={s.venueName} numberOfLines={1}>{item.name}</Text>
                    {item.rating ? <View style={s.ratingBadge}><Ionicons name="star" size={12} color={colors.gold}/><Text style={s.ratingTxt}>{item.rating.toFixed(1)}</Text></View> : null}
                  </View>
                  <Text style={[s.metaTxt,{marginTop:4}]} numberOfLines={2}>{item.description}</Text>
                  <View style={s.priceFooter}>
                    <Ionicons name="fast-food-outline" size={13} color={colors.mutedFg}/>
                    <Text style={[s.metaTxt,{marginLeft:4}]}>Multiple packages available</Text>
                    <View style={{flex:1}}/>
                    <View style={s.viewBtn}><Text style={s.viewBtnTxt}>Details</Text><Ionicons name="arrow-forward" size={13} color={colors.coral}/></View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />}

      <Modal visible={sheet.open} transparent animationType="none" onRequestClose={() => sheet.hide()}>
        <Pressable style={s.backdrop} onPress={() => sheet.hide()}/>
        <Animated.View style={[s.detailSheet, {transform:[{translateY:sheet.translateY}]}]}>
          <View style={s.sheetHandle}/>
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail?.images?.[0] ? <Image source={{uri:detail.images[0]}} style={s.detailHero}/> : <View style={[s.detailHero,{backgroundColor:colors.muted,alignItems:'center',justifyContent:'center'}]}><Ionicons name="restaurant" size={48} color={colors.mutedFg}/></View>}
            <View style={s.detailBody}>
              <View style={s.detailTitleRow}>
                <Text style={s.detailName}>{detail?.name}</Text>
                {detail?.rating ? <View style={s.ratingBadge}><Ionicons name="star" size={13} color={colors.gold}/><Text style={s.ratingTxt}>{detail.rating.toFixed(1)}</Text></View>:null}
              </View>
              <Text style={s.detailDesc}>{detail?.description}</Text>
              <Text style={s.detailSectionTitle}>Choose a Package</Text>
              {packages.map(pkg => (
                <TouchableOpacity key={pkg.id} style={[s.pkgRow, pickedPkg?.id===pkg.id && s.pkgRowOn]} onPress={() => { setPickedPkg(pkg); setGuests(pkg.min_guests??50); }} activeOpacity={0.85}>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                      <Text style={s.pkgName}>{pkg.name}</Text>
                      <Text style={s.pkgPrice}>{`${pkg.price_per_person} EGP/person`}</Text>
                    </View>
                    <Text style={s.pkgMeta}>{`Min. ${pkg.min_guests} guests`}</Text>
                    <View style={s.pkgItems}>
                      {(pkg.items??[]).slice(0,4).map(i => <View key={i} style={s.pkgItemRow}><Ionicons name="checkmark" size={12} color={colors.sage}/><Text style={s.pkgItemTxt}>{i}</Text></View>)}
                      {(pkg.items??[]).length > 4 ? <Text style={s.pkgMoreTxt}>{`+${(pkg.items??[]).length-4} more items`}</Text> : null}
                    </View>
                  </View>
                  {pickedPkg?.id === pkg.id ? <Ionicons name="checkmark-circle" size={22} color={colors.coral}/> : <View style={s.radioEmpty}/>}
                </TouchableOpacity>
              ))}
              {pickedPkg ? (
                <View style={s.guestBox}>
                  <Text style={s.detailSectionTitle}>Number of Guests</Text>
                  <Text style={[s.metaTxt,{marginBottom:spacing.md}]}>{`Minimum ${pickedPkg.min_guests} guests`}</Text>
                  <View style={s.counterRow}>
                    {[-10,-1].map(d => (
                      <TouchableOpacity key={d} style={[s.counterBtn, guests<=(pickedPkg.min_guests??1)&&s.counterBtnOff]} onPress={() => setGuests(g => Math.max(pickedPkg.min_guests??1, g+d))} disabled={guests<=(pickedPkg.min_guests??1)}>
                        <Text style={s.counterTxt}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={s.counterDisplay}><Text style={s.counterVal}>{guests}</Text><Text style={s.counterUnit}>guests</Text></View>
                    {[1,10].map(d => (
                      <TouchableOpacity key={d} style={s.counterBtn} onPress={() => setGuests(g => g+d)}>
                        <Text style={s.counterTxt}>{`+${d}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.costLine}>
                    <Text style={s.costLbl}>Total</Text>
                    <Text style={s.costVal}>{`${(pickedPkg.price_per_person*guests).toLocaleString()} EGP`}</Text>
                  </View>
                </View>
              ) : null}
              <View style={{height:16}}/>
            </View>
          </ScrollView>
          <TouchableOpacity style={[s.confirmBtn, !pickedPkg && s.confirmBtnOff]} onPress={confirm} disabled={!pickedPkg}>
            <Text style={s.confirmBtnTxt}>{pickedPkg ? `Select Package — ${(pickedPkg.price_per_person*guests).toLocaleString()} EGP` : 'Select a package'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Step 3: AV ───────────────────────────────────────────────────────────────

function AVStep({ qty, setQty, items, setItems, colors }: { qty:QtyMap; setQty:(q:QtyMap)=>void; items:AVEquipment[]; setItems:(i:AVEquipment[])=>void; colors: AppColors }) {
  const s = makeStyles(colors);
  const [loading, setLoading] = useState(items.length === 0);
  const [search,  setSearch]  = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    if (items.length > 0) return;
    supabase.from('av_equipment').select('*').order('category').then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  function setQ(id: string, q: number) { const n = {...qty}; if (q <= 0) delete n[id]; else n[id] = q; setQty(n); }

  const total    = Object.values(qty).reduce((s, n) => s + n, 0);
  const filtered = items.filter(i => {
    const mSearch = i.name?.toLowerCase().includes(search.toLowerCase());
    const mCat    = category === 'all' || i.category === category;
    return mSearch && mCat;
  });

  return (
    <View style={{flex:1}}>
      {total > 0 ? <View style={s.selBanner}><Ionicons name="checkmark-circle" size={18} color="#7B68C8"/><Text style={[s.selName,{flex:1}]}>{`${total} item${total!==1?'s':''} selected`}</Text></View> : null}

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.mutedFg}/>
        <TextInput style={s.searchInput} placeholder="Search equipment..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch}/>
        {search.length > 0 ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.mutedFg} /></TouchableOpacity> : null}
      </View>

      {/* Category chips */}
      <FilterChips colors={colors} options={AV_CATS.map(c => ({ value: c.key, label: c.label }))} active={category} onSelect={setCategory} />

      <Text style={s.resultCount}>{`${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}</Text>

      {loading ? <ActivityIndicator color={colors.coral} style={{marginTop:40}}/> :
        <FlatList data={filtered} keyExtractor={i => i.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={{gap:spacing.sm, paddingBottom:16}}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="volume-high-outline" size={40} color={colors.mutedFg} />
              <Text style={s.emptyStateTitle}>No equipment found</Text>
              <Text style={s.emptyStateSub}>Try a different category or search term</Text>
            </View>
          }
          renderItem={({ item }) => {
            const q = qty[item.id] ?? 0; const on = q > 0;
            return (
              <View style={[s.qtyCard, on && s.cardSelected]}>
                <View style={s.qtyImgWrap}>
                  {item.image ? <Image source={{uri:item.image}} style={s.qtyImg}/> : <View style={s.imgPlaceholder}><Ionicons name="volume-high-outline" size={22} color={colors.mutedFg}/></View>}
                  {on ? <View style={s.qtyBadge}><Text style={s.qtyBadgeTxt}>{`×${q}`}</Text></View> : null}
                </View>
                <View style={s.qtyBody}>
                  <Text style={s.qtyName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.qtyPrice}>{`${item.price_per_day?.toLocaleString()} EGP/day`}</Text>
                  {on ? <Text style={s.qtySub}>{`${(item.price_per_day*q).toLocaleString()} EGP`}</Text> : null}
                </View>
                <View style={s.inlineQty}>
                  <TouchableOpacity style={[s.qtyBtn, !on && s.qtyBtnOff]} onPress={() => setQ(item.id, q-1)} disabled={!on}><Ionicons name="remove" size={14} color={on ? colors.coral : colors.border}/></TouchableOpacity>
                  <Text style={[s.qtyNum, on && s.qtyNumOn]}>{q}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setQ(item.id, q+1)}><Ionicons name="add" size={14} color={colors.coral}/></TouchableOpacity>
                </View>
              </View>
            );
          }}
        />}
    </View>
  );
}

// ─── Step 4: Printings ────────────────────────────────────────────────────────

function PrintingsStep({ qty, setQty, items, setItems, colors }: { qty:QtyMap; setQty:(q:QtyMap)=>void; items:PrintingItem[]; setItems:(i:PrintingItem[])=>void; colors: AppColors }) {
  const s = makeStyles(colors);
  const [loading,  setLoading]  = useState(items.length === 0);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    if (items.length > 0) return;
    supabase.from('printing_items').select('*').order('category').then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  function setQ(id: string, q: number) { const n = {...qty}; if (q <= 0) delete n[id]; else n[id] = q; setQty(n); }

  const total    = Object.values(qty).reduce((s, n) => s + n, 0);
  const filtered = items.filter(i => {
    const mSearch = i.name?.toLowerCase().includes(search.toLowerCase());
    const mCat    = category === 'all' || i.category === category;
    return mSearch && mCat;
  });

  return (
    <View style={{flex:1}}>
      {total > 0 ? <View style={s.selBanner}><Ionicons name="checkmark-circle" size={18} color={colors.gold}/><Text style={[s.selName,{flex:1}]}>{`${total} piece${total!==1?'s':''} selected`}</Text></View> : null}

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.mutedFg}/>
        <TextInput style={s.searchInput} placeholder="Search printing items..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch}/>
        {search.length > 0 ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.mutedFg} /></TouchableOpacity> : null}
      </View>

      {/* Category chips */}
      <FilterChips colors={colors} options={PRINT_CATS.map(c => ({ value: c.key, label: c.label }))} active={category} onSelect={setCategory} />

      <Text style={s.resultCount}>{`${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}</Text>

      {loading ? <ActivityIndicator color={colors.coral} style={{marginTop:40}}/> :
        <FlatList data={filtered} keyExtractor={i => i.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={{gap:spacing.sm, paddingBottom:16}}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="print-outline" size={40} color={colors.mutedFg} />
              <Text style={s.emptyStateTitle}>No items found</Text>
              <Text style={s.emptyStateSub}>Try a different category or search term</Text>
            </View>
          }
          renderItem={({ item }) => {
            const q = qty[item.id] ?? 0; const on = q > 0;
            return (
              <View style={[s.qtyCard, on && s.cardSelected]}>
                <View style={s.qtyImgWrap}>
                  {item.image ? <Image source={{uri:item.image}} style={s.qtyImg}/> : <View style={s.imgPlaceholder}><Ionicons name="print-outline" size={22} color={colors.mutedFg}/></View>}
                  {on ? <View style={s.qtyBadge}><Text style={s.qtyBadgeTxt}>{`×${q}`}</Text></View> : null}
                </View>
                <View style={s.qtyBody}>
                  <Text style={s.qtyName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.qtyPrice}>{`${item.price_per_unit?.toLocaleString()} EGP/piece`}</Text>
                  {on ? <Text style={s.qtySub}>{`${(item.price_per_unit*q).toLocaleString()} EGP`}</Text> : null}
                </View>
                <View style={s.inlineQty}>
                  <TouchableOpacity style={[s.qtyBtn, !on && s.qtyBtnOff]} onPress={() => setQ(item.id, Math.max(0, q-10))} disabled={!on}><Text style={{fontSize:9,fontWeight:'700',color:on?colors.coral:colors.border}}>-10</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.qtyBtn, !on && s.qtyBtnOff]} onPress={() => setQ(item.id, q-1)} disabled={!on}><Ionicons name="remove" size={14} color={on ? colors.coral : colors.border}/></TouchableOpacity>
                  <Text style={[s.qtyNum, on && s.qtyNumOn]}>{q}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setQ(item.id, q+1)}><Ionicons name="add" size={14} color={colors.coral}/></TouchableOpacity>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => setQ(item.id, q+10)}><Text style={{fontSize:9,fontWeight:'700',color:colors.coral}}>+10</Text></TouchableOpacity>
                </View>
              </View>
            );
          }}
        />}
    </View>
  );
}

// ─── Step 5: Photography ──────────────────────────────────────────────────────

function PhotographyStep({ selection, onSelect, colors, venueDates }: { selection:PhotographySelection|null; onSelect:(s:PhotographySelection|null)=>void; colors: AppColors; venueDates: string[] }) {
  const s = makeStyles(colors);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState<'All'|'Individual'|'Company'>('All');
  const [sortBy,        setSortBy]        = useState<PhotoSortValue>('price_asc');
  const [priceIdx,      setPriceIdx]      = useState(0);
  const [detail,        setDetail]        = useState<Photographer|null>(null);
  const [dates,         setDates]         = useState<string[]>([]);

  const detailSheet = useSheet();
  const filterSheet = useSheet();

  const [tmpSort,     setTmpSort]     = useState<PhotoSortValue>('price_asc');
  const [tmpPriceIdx, setTmpPriceIdx] = useState(0);

  useEffect(() => {
    supabase.from('photographers').select('*').order('rating', { ascending: false }).then(({ data }) => { setPhotographers(data ?? []); setLoading(false); });
  }, []);

  function openDetail(p: Photographer) { setDetail(p); setDates(venueDates.length > 0 ? [] : []); detailSheet.show(); }
  function confirm() {
    if (!detail) return;
    const finalDates = venueDates.length > 0 ? venueDates : dates;
    if (finalDates.length === 0) return;
    onSelect({ photographer: detail, dates: finalDates });
    detailSheet.hide();
  }

  function openFilter() { setTmpSort(sortBy); setTmpPriceIdx(priceIdx); filterSheet.show(); }
  function applyFilter() { setSortBy(tmpSort); setPriceIdx(tmpPriceIdx); filterSheet.hide(); }
  function resetFilter() { setTmpSort('price_asc'); setTmpPriceIdx(0); }

  let filtered = photographers.filter(p => {
    const mSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const mType   = typeFilter === 'All' || p.type?.toLowerCase() === typeFilter.toLowerCase();
    const price   = PRICE_OPTIONS[priceIdx];
    const mPrice  = (p.price_per_day ?? 0) >= price.min && (p.price_per_day ?? 0) <= price.max;
    return mSearch && mType && mPrice;
  });

  if (sortBy === 'price_asc')  filtered = [...filtered].sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0));
  if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => (b.price_per_day ?? 0) - (a.price_per_day ?? 0));
  if (sortBy === 'rating')     filtered = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const activeFilterCount = (sortBy !== 'price_asc' ? 1 : 0) + (priceIdx !== 0 ? 1 : 0);

  return (
    <View style={{flex:1}}>
      {selection ? (
        <View style={s.selBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.sage}/>
          <View style={{flex:1}}>
            <Text style={s.selName}>{selection.photographer.name}</Text>
            <Text style={s.selSub}>{`${selection.dates.length === 1 ? dispDate(selection.dates[0]) : `${selection.dates.length} days`} · ${(selection.photographer.price_per_day*selection.dates.length).toLocaleString()} EGP`}</Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(null)}><Text style={[s.changeBtn, {color:colors.sage}]}>Remove</Text></TouchableOpacity>
        </View>
      ) : null}

      {/* Search + Filter button */}
      <View style={s.searchFilterRow}>
        <View style={[s.searchRow, {flex:1, marginBottom:0}]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedFg}/>
          <TextInput style={s.searchInput} placeholder="Search photographers..." placeholderTextColor={colors.mutedFg} value={search} onChangeText={setSearch}/>
          {search.length > 0 ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.mutedFg} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]} onPress={openFilter}>
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? colors.white : colors.charcoal} />
          {activeFilterCount > 0 ? <Text style={s.filterBtnTxt}>{activeFilterCount}</Text> : <Text style={s.filterLabelTxt}>Filter</Text>}
        </TouchableOpacity>
      </View>

      {/* Type chips */}
      <FilterChips colors={colors} options={['All','Individual','Company']} active={typeFilter} onSelect={(v) => setTypeFilter(v as any)} />

      {(priceIdx !== 0 || sortBy !== 'price_asc') ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.activePills} style={{flexGrow:0, marginBottom:spacing.sm}}>
          {sortBy !== 'price_asc' ? (
            <TouchableOpacity style={s.activePill} onPress={() => setSortBy('price_asc')}>
              <Ionicons name="funnel" size={11} color={colors.coral} />
              <Text style={s.activePillTxt}>{PHOTO_SORT_OPTIONS.find(o => o.value === sortBy)?.label}</Text>
              <Ionicons name="close" size={11} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
          {priceIdx !== 0 ? (
            <TouchableOpacity style={s.activePill} onPress={() => setPriceIdx(0)}>
              <Ionicons name="cash" size={11} color={colors.coral} />
              <Text style={s.activePillTxt}>{PRICE_OPTIONS[priceIdx].label}</Text>
              <Ionicons name="close" size={11} color={colors.coral} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={s.resultRow}>
        <Text style={s.resultCount}>{`${filtered.length} photographer${filtered.length !== 1 ? 's' : ''}`}</Text>
        {activeFilterCount > 0 ? (
          <TouchableOpacity onPress={() => { setSortBy('price_asc'); setPriceIdx(0); }}>
            <Text style={s.clearAllTxt}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? <ActivityIndicator color={colors.coral} style={{marginTop:40}}/> :
        <FlatList data={filtered} keyExtractor={i => i.id} showsVerticalScrollIndicator={false}
          contentContainerStyle={{gap:spacing.md, paddingBottom:16}}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="camera-outline" size={40} color={colors.mutedFg} />
              <Text style={s.emptyStateTitle}>No photographers found</Text>
              <Text style={s.emptyStateSub}>Try adjusting your search or filters</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.venueCard, selection?.photographer.id === item.id && s.cardSelected]} onPress={() => openDetail(item)} activeOpacity={0.9}>
              <View style={[s.venueImgWrap,{height:160}]}>
                {item.images?.[0] ? <Image source={{uri:item.images[0]}} style={s.venueImg}/> : <View style={s.imgPlaceholder}><Ionicons name="camera" size={28} color={colors.mutedFg}/></View>}
                <View style={[s.typeBadge, {backgroundColor: item.type==='company' ? `${colors.sage}DD` : `${colors.coral}DD`}]}>
                  <Ionicons name={item.type==='company' ? 'business' : 'person'} size={10} color="#fff"/>
                  <Text style={s.typeBadgeTxt}>{item.type==='company' ? 'Company' : 'Individual'}</Text>
                </View>
                {selection?.photographer.id === item.id ? <View style={s.checkOverlay}><Ionicons name="checkmark-circle" size={26} color={colors.sage}/></View> : null}
              </View>
              <View style={s.venueBody}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={s.venueName} numberOfLines={1}>{item.name}</Text>
                  {item.rating ? <View style={s.ratingBadge}><Ionicons name="star" size={12} color={colors.gold}/><Text style={s.ratingTxt}>{item.rating.toFixed(1)}</Text></View> : null}
                </View>
                <Text style={[s.metaTxt,{marginTop:4}]} numberOfLines={2}>{item.bio}</Text>
                <View style={s.priceFooter}>
                  <Text style={s.priceVal}>{item.price_per_day?.toLocaleString()}</Text>
                  <Text style={s.priceSub}>{' EGP / day'}</Text>
                  <View style={{flex:1}}/>
                  <View style={s.viewBtn}><Text style={s.viewBtnTxt}>Details</Text><Ionicons name="arrow-forward" size={13} color={colors.coral}/></View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />}

      {/* Detail sheet */}
      <Modal visible={detailSheet.open} transparent animationType="none" onRequestClose={() => detailSheet.hide()}>
        <Pressable style={s.backdrop} onPress={() => detailSheet.hide()}/>
        <Animated.View style={[s.detailSheet, {transform:[{translateY:detailSheet.translateY}]}]}>
          <View style={s.sheetHandle}/>
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail?.images?.[0] ? <Image source={{uri:detail.images[0]}} style={s.detailHero}/> : <View style={[s.detailHero,{backgroundColor:colors.muted,alignItems:'center',justifyContent:'center'}]}><Ionicons name="camera" size={48} color={colors.mutedFg}/></View>}
            {(detail?.images??[]).length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:spacing['2xl'],gap:spacing.sm,paddingBottom:spacing.md}}>
                {(detail!.images??[]).map((img, i) => <Image key={i} source={{uri:img}} style={s.thumbImg}/>)}
              </ScrollView>
            ) : null}
            <View style={s.detailBody}>
              <View style={s.detailTitleRow}>
                <Text style={s.detailName}>{detail?.name}</Text>
                {detail?.rating ? <View style={s.ratingBadge}><Ionicons name="star" size={13} color={colors.gold}/><Text style={s.ratingTxt}>{detail.rating.toFixed(1)}</Text></View> : null}
              </View>
              {detail?.rating ? (
                <View style={{flexDirection:'row', gap:3, marginBottom:spacing.sm}}>
                  {[1,2,3,4,5].map(st => <Ionicons key={st} name={st<=Math.round(detail.rating)?'star':'star-outline'} size={14} color={colors.gold}/>)}
                </View>
              ) : null}
              <View style={s.detailMeta}>
                <View style={s.detailMetaItem}><Ionicons name={detail?.type==='company'?'business-outline':'person-outline'} size={15} color={colors.coral}/><Text style={s.detailMetaTxt}>{detail?.type==='company'?'Photography Company':'Individual Photographer'}</Text></View>
                <View style={s.detailMetaItem}><Ionicons name="cash-outline" size={15} color={colors.coral}/><Text style={s.detailMetaTxt}>{`${detail?.price_per_day?.toLocaleString()} EGP / day`}</Text></View>
              </View>
              <Text style={s.detailDesc}>{detail?.bio}</Text>
              <Text style={s.detailSectionTitle}>Event Date(s)</Text>
              {venueDates.length > 0 ? (
                <View style={s.lockedDateBanner}>
                  <Ionicons name="lock-closed-outline" size={15} color={colors.sage} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.lockedDateTitle}>Using your venue dates</Text>
                    <Text style={s.lockedDateSub}>
                      {venueDates.length === 1 ? longDate(venueDates[0]) : `${venueDates.length} days selected at venue`}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color={colors.sage} />
                </View>
              ) : (
                <>
                  {dates.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pkgChipsWrap} contentContainerStyle={{ gap: spacing.sm }}>
                      {dates.map((d) => (
                        <TouchableOpacity key={d} style={s.pkgDateChip} onPress={() => setDates((p) => p.filter((x) => x !== d))}>
                          <Ionicons name="calendar" size={11} color={colors.coral} />
                          <Text style={s.pkgDateChipTxt}>{new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                          <Ionicons name="close" size={11} color={colors.coral} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : null}
                  <CalendarGrid
                    selectedDates={dates}
                    onToggle={(d) => setDates((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d])}
                    colors={colors}
                  />
                </>
              )}
              <View style={{height:16}}/>
            </View>
          </ScrollView>
          {(() => {
            const finalDates = venueDates.length > 0 ? venueDates : dates;
            const total = (detail?.price_per_day ?? 0) * (finalDates.length || 1);
            const ready = finalDates.length > 0;
            return (
              <TouchableOpacity style={[s.confirmBtn, !ready && s.confirmBtnOff]} onPress={confirm} disabled={!ready}>
                <Text style={s.confirmBtnTxt}>{ready ? `Select Photographer — ${total.toLocaleString()} EGP${finalDates.length > 1 ? ` (${finalDates.length} days)` : ''}` : 'Pick at least one date'}</Text>
              </TouchableOpacity>
            );
          })()}
        </Animated.View>
      </Modal>

      {/* Filter sheet */}
      <Modal visible={filterSheet.open} transparent animationType="none" onRequestClose={() => filterSheet.hide()}>
        <Pressable style={s.backdrop} onPress={() => filterSheet.hide()} />
        <Animated.View style={[s.filterSheet, {transform:[{translateY:filterSheet.translateY}]}]}>
          <View style={s.sheetHandle}/>
          <View style={s.filterSheetHeader}>
            <Text style={s.filterSheetTitle}>Sort & Filter</Text>
            <TouchableOpacity onPress={resetFilter}><Text style={s.resetTxt}>Reset all</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.filterSection}>Sort by</Text>
            {PHOTO_SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[s.filterOption, tmpSort === opt.value && s.filterOptionOn]} onPress={() => setTmpSort(opt.value)} activeOpacity={0.8}>
                <View style={{flexDirection:'row', alignItems:'center', gap:spacing.md}}>
                  <Ionicons name={opt.icon as any} size={18} color={tmpSort === opt.value ? colors.coral : colors.charcoalLight} />
                  <Text style={[s.filterOptionTxt, tmpSort === opt.value && s.filterOptionTxtOn]}>{opt.label}</Text>
                </View>
                {tmpSort === opt.value ? <Ionicons name="checkmark-circle" size={20} color={colors.coral} /> : <View style={s.radioEmpty}/>}
              </TouchableOpacity>
            ))}
            <Text style={s.filterSection}>Price Range</Text>
            <View style={s.wrapChips}>
              {PRICE_OPTIONS.map((opt, idx) => (
                <TouchableOpacity key={opt.label} style={[s.wrapChip, tmpPriceIdx === idx && s.wrapChipOn]} onPress={() => setTmpPriceIdx(idx)}>
                  <Text style={[s.wrapChipTxt, tmpPriceIdx === idx && s.wrapChipTxtOn]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{height: spacing.xl}} />
          </ScrollView>
          <TouchableOpacity style={s.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
            <Text style={s.applyBtnTxt}>Apply Filters</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function SummaryStep({ venueSelection,cateringSel,avItems,avQty,printItems,printQty,photoSel,grandTotal,colors }:{ venueSelection:VenueSelection|null; cateringSel:CateringSelection|null; avItems:AVEquipment[]; avQty:QtyMap; printItems:PrintingItem[]; printQty:QtyMap; photoSel:PhotographySelection|null; grandTotal:number; colors: AppColors }) {
  const s = makeStyles(colors);
  const avSel    = avItems.filter(i => (avQty[i.id]??0) > 0);
  const printSel = printItems.filter(i => (printQty[i.id]??0) > 0);
  const avTotal  = avSel.reduce((s, i) => s + i.price_per_day * avQty[i.id], 0);
  const pTotal   = printSel.reduce((s, i) => s + i.price_per_unit * printQty[i.id], 0);
  const cTotal   = cateringSel ? cateringSel.pkg.price_per_person * cateringSel.guestCount : 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap:spacing.md, paddingBottom:16}}>
      <Text style={s.summaryHeading}>Your Event Package</Text>
      {venueSelection ? <SumCard colors={colors} icon="business-outline" color={colors.coral} title={venueSelection.venue.name} sub={`${venueSelection.dates.length === 1 ? dispDate(venueSelection.dates[0]) : `${venueSelection.dates.length} days`} · ${venueSelection.venue.city}`} price={venueSelection.venue.price_per_day * venueSelection.dates.length}/> : null}
      {cateringSel ? <SumCard colors={colors} icon="restaurant-outline" color="#C2773F" title={cateringSel.pkg.name} sub={`${cateringSel.restaurant.name} · ${cateringSel.guestCount} guests`} price={cTotal}/> : <SumSkipped colors={colors} icon="restaurant-outline" label="Catering"/>}
      {avSel.length > 0 ? <SumCard colors={colors} icon="volume-high-outline" color="#7B68C8" title={`Audio & Visual (${avSel.length} items)`} sub={avSel.map(i => `${i.name} ×${avQty[i.id]}`).join(', ')} price={avTotal}/> : <SumSkipped colors={colors} icon="volume-high-outline" label="Audio & Visual"/>}
      {printSel.length > 0 ? <SumCard colors={colors} icon="print-outline" color={colors.gold} title={`Printings (${printSel.length} types)`} sub={printSel.map(i => `${i.name} ×${printQty[i.id]}`).join(', ')} price={pTotal}/> : <SumSkipped colors={colors} icon="print-outline" label="Printings"/>}
      {photoSel ? <SumCard colors={colors} icon="camera-outline" color={colors.sage} title={photoSel.photographer.name} sub={`${photoSel.photographer.type==='company'?'Company':'Individual'} · ${photoSel.dates.length === 1 ? dispDate(photoSel.dates[0]) : `${photoSel.dates.length} days`}`} price={photoSel.photographer.price_per_day * photoSel.dates.length}/> : <SumSkipped colors={colors} icon="camera-outline" label="Photography"/>}
      <View style={s.totalCard}>
        <Text style={s.totalLbl}>Package Total</Text>
        <Text style={s.totalVal}>{`${grandTotal.toLocaleString()} EGP`}</Text>
      </View>
    </ScrollView>
  );
}

function SumCard({ icon,color,title,sub,price,colors }:{ icon:React.ComponentProps<typeof Ionicons>['name']; color:string; title:string; sub:string; price:number; colors: AppColors }) {
  const s = makeStyles(colors);
  return (
    <View style={s.sumCard}>
      <View style={[s.sumIcon,{backgroundColor:`${color}18`}]}><Ionicons name={icon} size={20} color={color}/></View>
      <View style={{flex:1}}><Text style={s.sumTitle} numberOfLines={1}>{title}</Text><Text style={s.sumSub} numberOfLines={2}>{sub}</Text></View>
      <Text style={[s.sumPrice,{color}]}>{`${price.toLocaleString()} EGP`}</Text>
    </View>
  );
}

function SumSkipped({ icon,label,colors }:{ icon:React.ComponentProps<typeof Ionicons>['name']; label:string; colors: AppColors }) {
  const s = makeStyles(colors);
  return (
    <View style={[s.sumCard,{opacity:0.4}]}>
      <View style={[s.sumIcon,{backgroundColor:colors.muted}]}><Ionicons name={icon} size={20} color={colors.mutedFg}/></View>
      <Text style={[s.sumSub,{flex:1}]}>{`${label} — Skipped`}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  root: { flex:1, backgroundColor:colors.cream },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:spacing['2xl'], paddingTop:Platform.OS==='ios'?56:36, paddingBottom:spacing.md },
  iconBtn: { width:40, height:40, borderRadius:radius.full, backgroundColor:colors.white, alignItems:'center', justifyContent:'center', ...shadows.sm },
  headerMid: { alignItems:'center' },
  headerTitle: { fontSize:fontSizes.lg, fontWeight:'700', color:colors.charcoal },
  headerSub: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2 },

  progress: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing['2xl'], paddingBottom:spacing.lg },
  progressItem: { flex:1, flexDirection:'row', alignItems:'center' },
  progressDot: { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  progressLine: { flex:1, height:2, backgroundColor:colors.border, marginHorizontal:2 },

  content: { flex:1, paddingHorizontal:spacing['2xl'] },

  // Search + filter row
  searchFilterRow: { flexDirection:'row', alignItems:'center', gap:spacing.sm, marginBottom:spacing.md },
  filterBtn: { height:44, paddingHorizontal:spacing.md, borderRadius:radius.lg, backgroundColor:colors.white, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:4, ...shadows.sm },
  filterBtnActive: { backgroundColor:colors.coral },
  filterBtnTxt: { fontSize:fontSizes.xs, fontWeight:'800', color:colors.white },
  filterLabelTxt: { fontSize:fontSizes.xs, fontWeight:'600', color:colors.charcoalLight },

  // Filter chips
  filterChipsWrap: { flexGrow:0, marginBottom:spacing.sm },
  filterChipsContent: { gap:spacing.sm, paddingBottom:2 },

  // Result count row
  resultRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:spacing.sm },
  resultCount: { fontSize:fontSizes.xs, color:colors.mutedFg, fontWeight:'500' },
  clearAllTxt: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.coral },

  // Empty state
  emptyState: { alignItems:'center', paddingVertical:spacing['2xl']*2, gap:spacing.md },
  emptyStateTitle: { fontSize:fontSizes.base, fontWeight:'700', color:colors.charcoal },
  emptyStateSub: { fontSize:fontSizes.sm, color:colors.mutedFg, textAlign:'center' },

  // Active filter pills
  activePills: { gap:spacing.sm },
  activePill: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:spacing.md, paddingVertical:spacing.xs, borderRadius:radius.full, backgroundColor:`${colors.coral}15`, borderWidth:1, borderColor:`${colors.coral}30` },
  activePillTxt: { fontSize:fontSizes.xs, fontWeight:'600', color:colors.coral },

  // Filter sheet
  filterSheet: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:colors.white, borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], paddingHorizontal:spacing['2xl'], paddingBottom:Platform.OS==='ios'?40:24, maxHeight:'85%', ...shadows.lg },
  filterSheetHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing.xl },
  filterSheetTitle: { fontSize:fontSizes.lg, fontWeight:'700', color:colors.charcoal },
  resetTxt: { fontSize:fontSizes.sm, fontWeight:'600', color:colors.coral },
  filterSection: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.mutedFg, textTransform:'uppercase', letterSpacing:0.8, marginBottom:spacing.md, marginTop:spacing.lg, paddingTop:spacing.lg, borderTopWidth:1, borderTopColor:colors.border },
  filterOption: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:spacing.md, paddingHorizontal:spacing.lg, borderRadius:radius.lg, marginBottom:spacing.sm, backgroundColor:colors.cream },
  filterOptionOn: { backgroundColor:`${colors.coral}12` },
  filterOptionTxt: { fontSize:fontSizes.base, fontWeight:'500', color:colors.charcoal },
  filterOptionTxtOn: { color:colors.coral, fontWeight:'700' },
  wrapChips: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, marginBottom:spacing.sm },
  wrapChip: { paddingHorizontal:spacing.lg, paddingVertical:spacing.sm, borderRadius:radius.full, backgroundColor:colors.cream, borderWidth:1, borderColor:colors.border },
  wrapChipOn: { backgroundColor:colors.coral, borderColor:colors.coral },
  wrapChipTxt: { fontSize:fontSizes.sm, fontWeight:'600', color:colors.charcoalLight },
  wrapChipTxtOn: { color:colors.white },
  applyBtn: { backgroundColor:colors.coral, borderRadius:radius.lg, paddingVertical:spacing.lg, alignItems:'center', marginTop:spacing.md },
  applyBtnTxt: { color:colors.white, fontSize:fontSizes.base, fontWeight:'700' },

  // Selected banner
  selBanner: { flexDirection:'row', alignItems:'center', backgroundColor:colors.white, borderRadius:radius.lg, padding:spacing.md, marginBottom:spacing.md, gap:spacing.sm, borderWidth:1.5, borderColor:`${colors.coral}35`, ...shadows.sm },
  selName: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoal },
  selSub: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2 },
  changeBtn: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.coral },

  reqBanner: { flexDirection:'row', alignItems:'center', gap:spacing.sm, backgroundColor:`${colors.coral}10`, borderRadius:radius.lg, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, marginBottom:spacing.md },
  reqTxt: { fontSize:fontSizes.xs, color:colors.coral, fontWeight:'500', flex:1 },

  searchRow: { flexDirection:'row', alignItems:'center', backgroundColor:colors.white, borderRadius:radius.lg, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, gap:spacing.sm, marginBottom:spacing.md, ...shadows.sm },
  searchInput: { flex:1, fontSize:fontSizes.sm, color:colors.charcoal, padding:0 },

  chipRow: { flexDirection:'row', gap:spacing.sm, marginBottom:spacing.md, flexWrap:'wrap' },
  chip: { paddingHorizontal:spacing.md, paddingVertical:spacing.xs, borderRadius:radius.full, backgroundColor:colors.white, borderWidth:1, borderColor:colors.border },
  chipOn: { backgroundColor:colors.coral, borderColor:colors.coral },
  chipTxt: { fontSize:fontSizes.xs, fontWeight:'600', color:colors.charcoalLight },
  chipTxtOn: { color:colors.white },

  venueCard: { backgroundColor:colors.white, borderRadius:radius.xl, overflow:'hidden', borderWidth:2, borderColor:'transparent', ...shadows.md },
  cardSelected: { borderColor:colors.coral },
  venueImgWrap: { height:160, backgroundColor:colors.muted, position:'relative' },
  venueImg: { width:'100%', height:'100%', resizeMode:'cover' },
  imgPlaceholder: { flex:1, alignItems:'center', justifyContent:'center' },
  typeBadge: { position:'absolute', top:spacing.md, left:spacing.md, flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:spacing.sm, paddingVertical:3, borderRadius:radius.sm },
  typeBadgeTxt: { color:'#fff', fontSize:fontSizes.xs, fontWeight:'700', textTransform:'capitalize' },
  checkOverlay: { position:'absolute', top:spacing.sm, right:spacing.sm },
  venueBody: { padding:spacing.md, gap:spacing.xs },
  venueName: { fontSize:fontSizes.base, fontWeight:'700', color:colors.charcoal },
  metaRow: { flexDirection:'row', alignItems:'center', gap:4 },
  metaTxt: { fontSize:fontSizes.xs, color:colors.mutedFg, flex:1 },
  amenRow: { flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:2 },
  amenTag: { backgroundColor:colors.secondary, paddingHorizontal:spacing.sm, paddingVertical:2, borderRadius:radius.sm },
  amenTxt: { fontSize:9, color:colors.charcoalLight, fontWeight:'500' },
  amenMore: { fontSize:9, color:colors.mutedFg, alignSelf:'center' },
  priceFooter: { flexDirection:'row', alignItems:'center', paddingTop:spacing.sm, borderTopWidth:1, borderTopColor:colors.border, marginTop:spacing.xs },
  priceVal: { fontSize:fontSizes.base, fontWeight:'800', color:colors.coral },
  priceSub: { fontSize:fontSizes.xs, color:colors.mutedFg },
  viewBtn: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:`${colors.coral}15`, paddingHorizontal:spacing.sm, paddingVertical:3, borderRadius:radius.full },
  viewBtnTxt: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.coral },
  ratingBadge: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:`${colors.gold}20`, paddingHorizontal:spacing.sm, paddingVertical:3, borderRadius:radius.sm },
  ratingTxt: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.charcoal },

  qtyCard: { flexDirection:'row', alignItems:'center', backgroundColor:colors.white, borderRadius:radius.lg, overflow:'hidden', borderWidth:2, borderColor:'transparent', ...shadows.sm },
  qtyImgWrap: { width:80, height:90, backgroundColor:colors.muted },
  qtyImg: { width:'100%', height:'100%', resizeMode:'cover' },
  qtyBadge: { position:'absolute', top:4, left:4, backgroundColor:colors.coral, paddingHorizontal:5, paddingVertical:2, borderRadius:radius.sm },
  qtyBadgeTxt: { color:'#fff', fontSize:9, fontWeight:'800' },
  qtyBody: { flex:1, paddingHorizontal:spacing.md, gap:2 },
  qtyName: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.charcoal },
  qtyPrice: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.coral },
  qtySub: { fontSize:fontSizes.xs, color:colors.sage, fontWeight:'600' },
  inlineQty: { flexDirection:'row', alignItems:'center', gap:4, paddingRight:spacing.sm },
  qtyBtn: { width:26, height:26, borderRadius:radius.full, backgroundColor:`${colors.coral}15`, alignItems:'center', justifyContent:'center' },
  qtyBtnOff: { backgroundColor:colors.muted },
  qtyNum: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoalLight, minWidth:22, textAlign:'center' },
  qtyNumOn: { color:colors.coral },

  bar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:spacing['2xl'], paddingTop:spacing.lg, paddingBottom:Platform.OS==='ios'?36:20, backgroundColor:colors.white, borderTopWidth:1, borderTopColor:colors.border, ...shadows.lg },
  skipBtn: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:spacing.lg, paddingVertical:spacing.md, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border },
  skipTxt: { fontSize:fontSizes.sm, fontWeight:'600', color:colors.mutedFg },
  nextBtn: { flexDirection:'row', alignItems:'center', gap:spacing.sm, backgroundColor:colors.coral, paddingHorizontal:spacing['2xl'], paddingVertical:spacing.md, borderRadius:radius.lg },
  nextBtnOff: { opacity:0.45 },
  nextBtnTxt: { color:'#fff', fontSize:fontSizes.base, fontWeight:'700' },
  barTotal: { fontSize:fontSizes.xl, fontWeight:'800', color:colors.coral },
  barSub: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2 },

  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.45)' },
  detailSheet: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:colors.white, borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], maxHeight:'92%', paddingBottom:Platform.OS==='ios'?40:24, ...shadows.lg },
  sheetHandle: { width:36, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginTop:spacing.md, marginBottom:spacing.sm },
  detailHero: { width:'100%', height:220, resizeMode:'cover' },
  detailBody: { paddingHorizontal:spacing['2xl'], paddingTop:spacing.xl, gap:spacing.md },
  detailTitleRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  detailName: { fontSize:fontSizes.xl, fontWeight:'800', color:colors.charcoal, flex:1 },
  detailMeta: { gap:spacing.sm },
  detailMetaItem: { flexDirection:'row', alignItems:'center', gap:spacing.sm },
  detailMetaTxt: { fontSize:fontSizes.sm, fontWeight:'600', color:colors.charcoal },
  detailDesc: { fontSize:fontSizes.sm, color:colors.charcoalLight, lineHeight:22 },
  detailSectionTitle: { fontSize:fontSizes.base, fontWeight:'700', color:colors.charcoal, marginTop:spacing.sm },
  amenGrid: { flexDirection:'row', flexWrap:'wrap', gap:spacing.md },
  amenGridItem: { flexDirection:'row', alignItems:'center', gap:spacing.sm, width:'47%' },
  amenGridIcon: { width:30, height:30, borderRadius:radius.sm, backgroundColor:`${colors.coral}12`, alignItems:'center', justifyContent:'center' },
  amenGridTxt: { fontSize:fontSizes.xs, color:colors.charcoal, fontWeight:'500', flex:1 },
  thumbImg: { width:90, height:90, borderRadius:radius.lg, resizeMode:'cover' },

  selDateRow: { flexDirection:'row', alignItems:'center', gap:spacing.sm, marginBottom:spacing.md, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, backgroundColor:`${colors.coral}12`, borderRadius:radius.lg },
  selDateTxt: { flex:1, fontSize:fontSizes.sm, fontWeight:'600', color:colors.coral },
  lockedDateBanner: { flexDirection:'row', alignItems:'center', gap:spacing.sm, paddingHorizontal:spacing.md, paddingVertical:spacing.md, backgroundColor:`${colors.sage}12`, borderRadius:radius.lg, borderWidth:1, borderColor:`${colors.sage}30`, marginBottom:spacing.md },
  lockedDateTitle: { fontSize:fontSizes.xs, fontWeight:'600', color:colors.sage },
  lockedDateSub: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoal, marginTop:2 },
  pkgChipsWrap: { flexGrow:0, marginBottom:spacing.md },
  pkgDateChip: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:spacing.sm, paddingVertical:5, backgroundColor:`${colors.coral}12`, borderRadius:radius.full, borderWidth:1, borderColor:`${colors.coral}30` },
  pkgDateChipTxt: { fontSize:fontSizes.xs, fontWeight:'600', color:colors.coral },

  confirmBtn: { backgroundColor:colors.coral, borderRadius:radius.lg, paddingVertical:spacing.lg, alignItems:'center', marginHorizontal:spacing['2xl'], marginTop:spacing.md },
  confirmBtnOff: { backgroundColor:colors.mutedFg, opacity:0.5 },
  confirmBtnTxt: { color:'#fff', fontSize:fontSizes.base, fontWeight:'700' },

  pkgRow: { flexDirection:'row', alignItems:'flex-start', padding:spacing.md, backgroundColor:colors.cream, borderRadius:radius.lg, marginBottom:spacing.sm, gap:spacing.md },
  pkgRowOn: { backgroundColor:`${colors.coral}10` },
  pkgName: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoal },
  pkgPrice: { fontSize:fontSizes.xs, fontWeight:'700', color:colors.coral },
  pkgMeta: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2, marginBottom:spacing.sm },
  pkgItems: { gap:4 },
  pkgItemRow: { flexDirection:'row', alignItems:'center', gap:4 },
  pkgItemTxt: { fontSize:fontSizes.xs, color:colors.charcoalLight },
  pkgMoreTxt: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2 },
  radioEmpty: { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:colors.border },

  guestBox: { backgroundColor:colors.white, borderRadius:radius.lg, padding:spacing.lg, marginTop:spacing.md, gap:spacing.sm },
  counterRow: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing.sm },
  counterBtn: { minWidth:38, height:38, borderRadius:radius.lg, backgroundColor:colors.secondary, alignItems:'center', justifyContent:'center', paddingHorizontal:spacing.sm },
  counterBtnOff: { opacity:0.4 },
  counterTxt: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoal },
  counterDisplay: { alignItems:'center', minWidth:56 },
  counterVal: { fontSize:fontSizes['2xl'], fontWeight:'800', color:colors.charcoal },
  counterUnit: { fontSize:fontSizes.xs, color:colors.mutedFg },
  costLine: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:spacing.md, borderTopWidth:1, borderTopColor:colors.border },
  costLbl: { fontSize:fontSizes.base, fontWeight:'700', color:colors.charcoal },
  costVal: { fontSize:fontSizes.lg, fontWeight:'800', color:colors.coral },

  summaryHeading: { fontSize:fontSizes.xl, fontWeight:'800', color:colors.charcoal },
  sumCard: { flexDirection:'row', alignItems:'center', backgroundColor:colors.white, borderRadius:radius.lg, padding:spacing.md, gap:spacing.md, ...shadows.sm },
  sumIcon: { width:44, height:44, borderRadius:radius.md, alignItems:'center', justifyContent:'center' },
  sumTitle: { fontSize:fontSizes.sm, fontWeight:'700', color:colors.charcoal },
  sumSub: { fontSize:fontSizes.xs, color:colors.mutedFg, marginTop:2 },
  sumPrice: { fontSize:fontSizes.sm, fontWeight:'800' },
  totalCard: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:colors.charcoal, borderRadius:radius.lg, padding:spacing.lg },
  totalLbl: { fontSize:fontSizes.base, fontWeight:'600', color:`${colors.white}90` },
  totalVal: { fontSize:fontSizes.xl, fontWeight:'800', color:colors.white },
  });
}
