import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking,
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import type { AppColors } from '../../constants/theme';
import { fontSizes, radius, shadows, spacing, colors as staticColors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem, ProjectManager } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  venue:        'business-outline',
  catering:     'restaurant-outline',
  photographer: 'camera-outline',
  av:           'volume-high-outline',
  printing:     'print-outline',
};

const SERVICE_COLORS: Record<string, string> = {
  venue:        staticColors.coral,
  catering:     '#C2773F',
  photographer: staticColors.sage,
  av:           '#7B68C8',
  printing:     staticColors.gold,
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  pending:   { label: 'Pending',    color: staticColors.gold,        icon: 'time-outline' },
  confirmed: { label: 'Confirmed',  color: staticColors.sage,        icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed',  color: '#4CAF50',          icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled',  color: staticColors.coral,       icon: 'close-circle-outline' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  function goBack() {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/orders' as any);
    }
  }

  const [order,     setOrder]     = useState<Order | null>(null);
  const [items,     setItems]     = useState<OrderItem[]>([]);
  const [pm,        setPm]        = useState<ProjectManager | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [isNew,     setIsNew]     = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  function confirmCancel() {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        { text: 'Cancel Order', style: 'destructive', onPress: cancelOrder },
      ]
    );
  }

  async function cancelOrder() {
    if (!id) return;
    setCancelling(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);
    setCancelling(false);
    if (error) {
      Alert.alert('Error', 'Could not cancel the order. Please try again.');
      return;
    }
    setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev);
  }

  async function fetchOrder() {
    setLoading(true);
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
    ]);
    setOrder(orderData);
    setItems(itemsData ?? []);
    if (orderData?.project_manager_id) {
      const { data: pmData } = await supabase
        .from('project_managers')
        .select('*')
        .eq('id', orderData.project_manager_id)
        .single();
      setPm(pmData ?? null);
    }
    setLoading(false);
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.loader}>
          <Text style={{ color: colors.mutedFg }}>Order not found.</Text>
        </View>
      </View>
    );
  }

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending;
  const orderId    = order.id.slice(0, 8).toUpperCase();

  // Group items by service type
  const grouped = items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    const key = item.service_type ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{`#${orderId}`}</Text>
        <View style={[styles.headerStatus, { backgroundColor: `${statusMeta.color}18` }]}>
          <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} />
          <Text style={[styles.headerStatusTxt, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Status Timeline ── */}
        <OrderTimeline status={order.status} colors={colors} styles={styles} />

        {/* ── Pending: what happens next ── */}
        {order.status === 'pending' ? (
          <View style={styles.card}>
            <View style={styles.contactBanner}>
              <Ionicons name="call-outline" size={18} color={colors.coral} />
              <Text style={styles.contactBannerTxt}>
                Our team will contact you within 24 hours to confirm all details.
              </Text>
            </View>
            <Text style={styles.cardTitle}>What happens next?</Text>
            {[
              { icon: 'call-outline',           text: 'Our team will call you to confirm all booking details.' },
              { icon: 'document-outline',       text: 'You\'ll receive a full contract and breakdown for each service.' },
              { icon: 'checkmark-done-outline', text: 'Once confirmed, your event date is officially reserved.' },
            ].map((step, i) => (
              <View key={i} style={styles.nextStep}>
                <View style={styles.nextStepNum}>
                  <Text style={styles.nextStepNumTxt}>{i + 1}</Text>
                </View>
                <View style={[styles.nextStepIcon, { backgroundColor: `${colors.coral}12` }]}>
                  <Ionicons name={step.icon as any} size={18} color={colors.coral} />
                </View>
                <Text style={styles.nextStepTxt}>{step.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Confirmed: project manager card ── */}
        {order.status === 'confirmed' ? (
          <ProjectManagerCard pm={pm} colors={colors} styles={styles} />
        ) : null}

        {/* ── Order ID + status ── */}
        <View style={styles.card}>
          <View style={styles.orderIdRow}>
            <View>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderIdValue}>{`#${orderId}`}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}18` }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
              <Text style={[styles.statusLabel, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.coral} />
              <View>
                <Text style={styles.metaLabel}>Placed on</Text>
                <Text style={styles.metaValue}>
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            {order.event_date ? (
              <View style={styles.metaItem}>
                <Ionicons name="sparkles-outline" size={16} color={colors.coral} />
                <View>
                  <Text style={styles.metaLabel}>Event Date</Text>
                  <Text style={styles.metaValue}>{order.event_date}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {order.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={14} color={colors.mutedFg} />
              <Text style={styles.notesTxt}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Services booked ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services Booked</Text>

          {Object.entries(grouped).map(([type, groupItems]) => {
            const color = SERVICE_COLORS[type] ?? colors.coral;
            const icon  = SERVICE_ICONS[type]  ?? 'cube-outline';
            const groupTotal = groupItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);

            return (
              <View key={type} style={styles.serviceGroup}>
                {/* Group header */}
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIconWrap, { backgroundColor: `${color}18` }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>
                  <Text style={styles.groupLabel}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <Text style={[styles.groupTotal, { color }]}>
                    {`${groupTotal.toLocaleString()} EGP`}
                  </Text>
                </View>

                {/* Items */}
                {groupItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={[styles.itemAccent, { backgroundColor: color }]} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.service_name}
                      </Text>
                      {item.quantity > 1 ? (
                        <Text style={styles.itemMeta}>{`Qty: ${item.quantity}`}</Text>
                      ) : null}
                      {item.metadata?.guestCount ? (
                        <Text style={styles.itemMeta}>{`${item.metadata.guestCount} guests`}</Text>
                      ) : null}
                      {item.metadata?.eventDate ? (
                        <Text style={styles.itemMeta}>{`Date: ${item.metadata.eventDate}`}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>
                      {`${(item.subtotal ?? 0).toLocaleString()} EGP`}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          <View style={styles.divider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              {`${(order.total_egp ?? 0).toLocaleString()} EGP`}
            </Text>
          </View>
        </View>


        {/* ── Review section (completed orders) ── */}
        {order.status === 'completed' ? (
          <ReviewSection orderId={order.id} colors={colors} styles={styles} />
        ) : null}

        {/* Cancel order */}
        {order.status === 'pending' ? (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={confirmCancel}
            disabled={cancelling}
            activeOpacity={0.85}>
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.coral} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={colors.coral} />
                <Text style={styles.cancelBtnTxt}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Project Manager Card ─────────────────────────────────────────────────────

function ProjectManagerCard({ pm, colors, styles }: { pm: ProjectManager | null; colors: AppColors; styles: ReturnType<typeof makeStyles> }) {
  const initials = pm?.full_name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <View style={styles.card}>
      <View style={styles.pmHeader}>
        <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
        <Text style={styles.pmHeaderTxt}>Your order has been confirmed</Text>
      </View>

      <Text style={styles.cardTitle}>Your Project Manager</Text>

      {pm ? (
        <>
          {/* Avatar + name row */}
          <View style={styles.pmProfile}>
            {pm.photo_url ? (
              <Image source={{ uri: pm.photo_url }} style={styles.pmAvatar} />
            ) : (
              <View style={[styles.pmAvatar, styles.pmAvatarPlaceholder]}>
                <Text style={styles.pmInitials}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.pmName}>{pm.full_name}</Text>
              <Text style={styles.pmRole}>Project Manager</Text>
            </View>
          </View>

          {/* Contact details */}
          <View style={styles.pmContacts}>
            {pm.phone ? (
              <TouchableOpacity style={styles.pmContactRow} onPress={() => Linking.openURL(`tel:${pm.phone}`)}>
                <View style={[styles.pmContactIcon, { backgroundColor: `${colors.sage}18` }]}>
                  <Ionicons name="call-outline" size={17} color={colors.sage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pmContactLabel}>Phone</Text>
                  <Text style={styles.pmContactValue}>{pm.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedFg} />
              </TouchableOpacity>
            ) : null}

            {pm.email ? (
              <TouchableOpacity style={styles.pmContactRow} onPress={() => Linking.openURL(`mailto:${pm.email}`)}>
                <View style={[styles.pmContactIcon, { backgroundColor: `${colors.coral}18` }]}>
                  <Ionicons name="mail-outline" size={17} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pmContactLabel}>Email</Text>
                  <Text style={styles.pmContactValue}>{pm.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedFg} />
              </TouchableOpacity>
            ) : null}

            {pm.address ? (
              <View style={styles.pmContactRow}>
                <View style={[styles.pmContactIcon, { backgroundColor: `${colors.gold}18` }]}>
                  <Ionicons name="location-outline" size={17} color={colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pmContactLabel}>Office</Text>
                  <Text style={styles.pmContactValue}>{pm.address}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Action buttons */}
          <View style={styles.pmActions}>
            {pm.phone ? (
              <TouchableOpacity
                style={[styles.pmActionBtn, { backgroundColor: colors.sage }]}
                onPress={() => Linking.openURL(`tel:${pm.phone}`)}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.pmActionBtnTxt}>Call Now</Text>
              </TouchableOpacity>
            ) : null}
            {pm.email ? (
              <TouchableOpacity
                style={[styles.pmActionBtn, { backgroundColor: colors.coral }]}
                onPress={() => Linking.openURL(`mailto:${pm.email}`)}>
                <Ionicons name="mail" size={16} color="#fff" />
                <Text style={styles.pmActionBtnTxt}>Send Email</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.pmUnassigned}>
          <Ionicons name="person-circle-outline" size={36} color={colors.mutedFg} />
          <Text style={styles.pmUnassignedTxt}>A project manager will be assigned to your order shortly.</Text>
        </View>
      )}
    </View>
  );
}

// ─── Order Timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'pending',   label: 'Order Placed',  icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed',      icon: 'checkmark-circle-outline' },
  { key: 'completed', label: 'Completed',      icon: 'checkmark-done-circle-outline' },
];

function OrderTimeline({ status, colors, styles }: { status: string; colors: AppColors; styles: ReturnType<typeof makeStyles> }) {
  const ORDER = ['pending', 'confirmed', 'completed'];
  const currentIdx = ORDER.indexOf(status === 'cancelled' ? 'pending' : status);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Order Status</Text>
      <View style={styles.timeline}>
        {TIMELINE_STEPS.map((step, idx) => {
          const done    = status === 'cancelled' ? false : idx <= currentIdx;
          const active  = idx === currentIdx && status !== 'cancelled';
          const stepColor = done ? colors.coral : colors.border;

          return (
            <View key={step.key} style={styles.timelineStep}>
              {/* Dot */}
              <View style={styles.timelineDotCol}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: done ? colors.coral : colors.white, borderColor: stepColor },
                ]}>
                  {done ? (
                    <Ionicons name={active ? step.icon : 'checkmark'} size={14} color={colors.white} />
                  ) : (
                    <View style={[styles.timelineDotInner, { backgroundColor: colors.border }]} />
                  )}
                </View>
                {idx < TIMELINE_STEPS.length - 1 ? (
                  <View style={[styles.timelineLine, { backgroundColor: idx < currentIdx ? colors.coral : colors.border }]} />
                ) : null}
              </View>
              {/* Label */}
              <View style={styles.timelineLabelCol}>
                <Text style={[styles.timelineLabel, active && { color: colors.coral, fontWeight: '700' }]}>
                  {step.label}
                </Text>
                {active && status !== 'cancelled' ? (
                  <Text style={styles.timelineSub}>Current status</Text>
                ) : null}
              </View>
            </View>
          );
        })}

        {status === 'cancelled' ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle-outline" size={16} color={colors.coral} />
            <Text style={[styles.timelineLabel, { color: colors.coral }]}>Order Cancelled</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ orderId, colors, styles }: { orderId: string; colors: AppColors; styles: ReturnType<typeof makeStyles> }) {
  const { user } = useAuth();
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitReview() {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Please choose a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    await supabase.from('reviews').insert({
      user_id:  user?.id,
      order_id: orderId,
      rating,
      comment:  comment.trim() || null,
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View style={[styles.card, { alignItems: 'center', gap: spacing.md }]}>
        <Ionicons name="checkmark-circle" size={40} color={colors.coral} />
        <Text style={[styles.cardTitle, { textAlign: 'center' }]}>Thanks for your review!</Text>
        <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center' }}>
          Your feedback helps us improve the experience.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Rate Your Experience</Text>
      <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, marginBottom: spacing.md }}>
        How was your overall event experience?
      </Text>

      {/* Stars */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={6}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? colors.gold : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 ? (
        <Text style={styles.ratingLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
        </Text>
      ) : null}

      {/* Comment */}
      <View style={[styles.reviewInput, { borderColor: colors.border }]}>
        <TextInput
          style={{ flex: 1, fontSize: fontSizes.sm, color: colors.charcoal, padding: 0, minHeight: 70 }}
          placeholder="Share your experience (optional)..."
          placeholderTextColor={colors.mutedFg}
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.reviewBtn, rating === 0 && styles.reviewBtnDisabled]}
        onPress={submitReview}
        disabled={rating === 0 || submitting}
        activeOpacity={0.85}>
        {submitting ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Ionicons name="star-outline" size={18} color={colors.white} />
            <Text style={styles.reviewBtnTxt}>Submit Review</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: spacing.md,
    backgroundColor: colors.cream,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.charcoal },
  headerStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  headerStatusTxt: { fontSize: fontSizes.xs, fontWeight: '700' },

  scroll: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.sm },

  // Hero (fresh order)
  hero: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.xl,
    padding: spacing['3xl'],
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroIconWrap: {
    width: 96, height: 96,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.white },
  heroSub: { fontSize: fontSizes.sm, color: `${colors.white}CC`, textAlign: 'center', lineHeight: 22 },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.border },

  // Order ID
  orderIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdLabel: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
  orderIdValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  statusLabel: { fontSize: fontSizes.sm, fontWeight: '700' },

  // Meta
  metaGrid: { flexDirection: 'row', gap: spacing.xl, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaLabel: { fontSize: fontSizes.xs, color: colors.mutedFg },
  metaValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.charcoal, marginTop: 2 },
  notesBox: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  notesTxt: { flex: 1, fontSize: fontSizes.sm, color: colors.charcoalLight, lineHeight: 20 },

  // Service groups
  serviceGroup: { gap: spacing.sm, marginBottom: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupIconWrap: {
    width: 30, height: 30, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  groupLabel: { flex: 1, fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal },
  groupTotal: { fontSize: fontSizes.sm, fontWeight: '800' },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  itemAccent: { width: 3, height: '100%', borderRadius: 2, marginRight: spacing.md, minHeight: 32 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: fontSizes.sm, fontWeight: '500', color: colors.charcoal },
  itemMeta: { fontSize: fontSizes.xs, color: colors.mutedFg },
  itemPrice: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal, marginLeft: spacing.sm },

  // Grand total
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
  grandTotalValue: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },

  // Next steps
  nextStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  nextStepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center', justifyContent: 'center',
  },
  nextStepNumTxt: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '800' },
  nextStepIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  nextStepTxt: { flex: 1, fontSize: fontSizes.sm, color: colors.charcoalLight, lineHeight: 20 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: `${colors.coral}50`,
    backgroundColor: `${colors.coral}08`,
    minHeight: 48,
  },
  cancelBtnTxt: { fontSize: fontSizes.base, fontWeight: '700', color: colors.coral },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  statItem: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.xs,
  },
  statValue: {
    fontSize: fontSizes.base, fontWeight: '800', color: colors.coral,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10, fontWeight: '500', color: colors.mutedFg,
    textAlign: 'center',
  },
  statDivider: {
    width: 1, backgroundColor: colors.border, marginVertical: spacing.xs,
  },

  // Project Manager card
  pmHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: `${colors.sage}12`,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderLeftWidth: 3, borderLeftColor: colors.sage,
  },
  pmHeaderTxt: { flex: 1, fontSize: fontSizes.sm, fontWeight: '600', color: colors.sage },
  pmProfile: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pmAvatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.muted,
  },
  pmAvatarPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${colors.coral}20`,
  },
  pmInitials: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.coral },
  pmName: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.charcoal },
  pmRole: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.mutedFg, marginTop: 3 },
  pmContacts: { gap: spacing.sm },
  pmContactRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    backgroundColor: colors.cream, borderRadius: radius.lg,
  },
  pmContactIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  pmContactLabel: { fontSize: fontSizes.xs, color: colors.mutedFg, fontWeight: '500' },
  pmContactValue: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.charcoal, marginTop: 2 },
  pmActions: { flexDirection: 'row', gap: spacing.md },
  pmActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg,
  },
  pmActionBtnTxt: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '700' },
  pmUnassigned: {
    alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  pmUnassignedTxt: {
    fontSize: fontSizes.sm, color: colors.mutedFg, textAlign: 'center', lineHeight: 20,
  },

  // Contact banner
  contactBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: `${colors.coral}10`,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3, borderLeftColor: colors.coral,
  },
  contactBannerTxt: {
    flex: 1, fontSize: fontSizes.sm, color: colors.charcoal,
    lineHeight: 20, fontWeight: '500',
  },

  // Timeline
  timeline: { gap: 0 },
  timelineStep: { flexDirection: 'row', gap: spacing.md },
  timelineDotCol: { alignItems: 'center', width: 32 },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  timelineDotInner: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  timelineLabelCol: { flex: 1, paddingBottom: spacing.lg, justifyContent: 'center' },
  timelineLabel: { fontSize: fontSizes.sm, fontWeight: '500', color: colors.charcoal },
  timelineSub: { fontSize: fontSizes.xs, color: colors.coral, marginTop: 2 },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: `${colors.coral}10`, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.sm,
  },

  // Review
  starsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  ratingLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  reviewInput: {
    borderWidth: 1, borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.coral,
    paddingVertical: spacing.lg, borderRadius: radius.lg,
  },
  reviewBtnDisabled: { opacity: 0.5 },
  reviewBtnTxt: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}