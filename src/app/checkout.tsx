import { router } from 'expo-router';
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors as staticColors, spacing, radius, shadows, fontSizes } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { AppColors } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Cash',  icon: 'cash-outline' },
  { key: 'card',     label: 'Credit / Debit Card', icon: 'card-outline' },
  { key: 'transfer', label: 'Bank Transfer',       icon: 'swap-horizontal-outline' },
] as const;
type PaymentKey = (typeof PAYMENT_METHODS)[number]['key'];

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user }                      = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  // Form state
  const [eventName, setEventName]     = useState('');
  const [eventDate, setEventDate]     = useState('');
  const [notes, setNotes]             = useState('');
  const [fullName, setFullName]       = useState(user?.user_metadata?.full_name ?? '');
  const [phone, setPhone]             = useState('');
  const [payment, setPayment]         = useState<PaymentKey>('cash');
  const [loading, setLoading]         = useState(false);

  // ── Place order ────────────────────────────────────────────────────────────

  async function handlePlaceOrder() {
    if (!eventName.trim()) {
      Alert.alert('Missing info', 'Please enter an event name.');
      return;
    }
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Please enter your name and phone number.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Your cart is empty.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id:    user?.id,
          status:     'pending',
          total_egp:  totalPrice,
          event_date: eventDate || null,
          notes:      notes.trim() || null,
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error('Order creation failed');

      // 2. Create order items
      const orderItems = items.map((item) => ({
        order_id:     order.id,
        service_type: item.serviceType,
        service_id:   item.serviceId,
        service_name: item.serviceName,
        quantity:     item.quantity,
        unit_price:   item.unitPrice,
        subtotal:     item.subtotal,
        metadata:     item.metadata ?? {},
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsErr) throw itemsErr;

      // 3. Send notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        title:   'Order Placed! 🎉',
        body:    `Your event "${eventName}" has been booked. Order #${order.id.slice(0, 8).toUpperCase()}`,
        type:    'order',
      });

      // 4. Clear cart
      clearCart();

      // 5. Navigate to confirmation
      router.replace(`/order/${order.id}` as any);

    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Empty cart guard ───────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="bag-outline" size={48} color={colors.mutedFg} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity style={styles.backToCartBtn} onPress={() => router.back()}>
            <Text style={styles.backToCartTxt}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* ── Cart summary ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          {items.map((item) => (
            <View key={item.serviceId} style={styles.summaryRow}>
              <View style={[
                styles.summaryIcon,
                { backgroundColor: `${SERVICE_COLORS[item.serviceType] ?? colors.coral}18` },
              ]}>
                <Ionicons
                  name={SERVICE_ICONS[item.serviceType] ?? 'cube-outline'}
                  size={14}
                  color={SERVICE_COLORS[item.serviceType] ?? colors.coral}
                />
              </View>
              <Text style={styles.summaryName} numberOfLines={1}>{item.serviceName}</Text>
              <Text style={styles.summaryPrice}>
                {`${item.subtotal.toLocaleString()} EGP`}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{`${totalPrice.toLocaleString()} EGP`}</Text>
          </View>
        </View>

        {/* ── Event details ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Event Details</Text>

          <Text style={styles.fieldLabel}>Event Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sara & Ahmed Wedding"
            placeholderTextColor={colors.mutedFg}
            value={eventName}
            onChangeText={setEventName}
          />

          <Text style={styles.fieldLabel}>Event Date</Text>
          <TextInput
            style={styles.input}
            placeholder="DD / MM / YYYY"
            placeholderTextColor={colors.mutedFg}
            value={eventDate}
            onChangeText={setEventDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special requests or notes for the team..."
            placeholderTextColor={colors.mutedFg}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Contact info ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.mutedFg}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+20 1xx xxx xxxx"
            placeholderTextColor={colors.mutedFg}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Payment method ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.paymentOption,
                payment === method.key && styles.paymentOptionActive,
              ]}
              onPress={() => setPayment(method.key)}
              activeOpacity={0.8}>
              <View style={[
                styles.paymentIconWrap,
                { backgroundColor: payment === method.key ? `${colors.coral}18` : colors.muted },
              ]}>
                <Ionicons
                  name={method.icon}
                  size={20}
                  color={payment === method.key ? colors.coral : colors.mutedFg}
                />
              </View>
              <Text style={[
                styles.paymentLabel,
                payment === method.key && styles.paymentLabelActive,
              ]}>
                {method.label}
              </Text>
              {payment === method.key ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.coral} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Terms note ── */}
        <View style={styles.termsRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.mutedFg} />
          <Text style={styles.termsTxt}>
            By placing your order you agree to our terms of service. Our team will contact you within 24 hours to confirm.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Place order bar ── */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotal}>{`${totalPrice.toLocaleString()} EGP`}</Text>
          <Text style={styles.bottomSub}>{`${items.length} service${items.length !== 1 ? 's' : ''}`}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeBtn, loading && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
              <Text style={styles.placeBtnTxt}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </View>
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
    backgroundColor: colors.cream,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },

  scroll: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.md },

  // Card sections
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },

  // Order summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  summaryIcon: {
    width: 28, height: 28,
    borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryName: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.charcoal,
    fontWeight: '500',
  },
  summaryPrice: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.charcoal,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: fontSizes.base, fontWeight: '700', color: colors.charcoal },
  totalValue: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.coral },

  // Form
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.charcoal,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.charcoal,
  },
  textArea: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  // Payment
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: `${colors.coral}50`,
    backgroundColor: `${colors.coral}08`,
  },
  paymentIconWrap: {
    width: 40, height: 40,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: '500',
    color: colors.charcoalLight,
  },
  paymentLabelActive: {
    color: colors.charcoal,
    fontWeight: '700',
  },
  radioEmpty: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  termsTxt: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.mutedFg,
    lineHeight: 18,
  },

  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
  backToCartBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.coral, borderRadius: radius.lg },
  backToCartTxt: { color: colors.white, fontWeight: '700', fontSize: fontSizes.base },

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
  bottomTotal: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.charcoal },
  bottomSub: { fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 2 },
  placeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minWidth: 160, justifyContent: 'center',
  },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnTxt: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}