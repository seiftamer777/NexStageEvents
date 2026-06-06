import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, ActivityIndicator, Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../constants/theme';
import type { AppColors } from '../constants/theme';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name ?? '');
    setPhone(user.user_metadata?.phone ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
      },
    });
    setSaving(false);

    if (error) {
      Alert.alert('Update failed', error.message);
      return;
    }

    Alert.alert('Profile updated', 'Your changes have been saved.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cream }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Text style={s.saveBtnTxt}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarRing}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={s.avatarHint}>Your initials are used as your avatar</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Personal Information</Text>

          <Field label="Full Name" icon="person-outline" colors={colors}>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedFg}
              autoComplete="name"
            />
          </Field>

          <Divider colors={colors} />

          <Field label="Email Address" icon="mail-outline" colors={colors}>
            <TextInput
              style={[s.input, s.inputDisabled]}
              value={email}
              editable={false}
              placeholder="Email address"
              placeholderTextColor={colors.mutedFg}
            />
            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.mutedFg} />
              <Text style={s.lockedTxt}>Can't change</Text>
            </View>
          </Field>

          <Divider colors={colors} />

          <Field label="Phone Number" icon="call-outline" colors={colors}>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+20 10 0000 0000"
              placeholderTextColor={colors.mutedFg}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </Field>
        </View>

        {/* Password section */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Security</Text>

          <TouchableOpacity
            style={s.actionRow}
            onPress={() => Alert.alert('Coming soon', 'Password change via email link will be available soon.')}
            activeOpacity={0.7}>
            <View style={[s.actionIcon, { backgroundColor: `${colors.coral}12` }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.coral} />
            </View>
            <View style={s.actionText}>
              <Text style={s.actionLabel}>Change Password</Text>
              <Text style={s.actionSub}>Send a reset link to your email</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
          </TouchableOpacity>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveLargeBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                <Text style={s.saveLargeBtnTxt}>Save Changes</Text>
              </>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, icon, colors, children }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: AppColors;
  children: React.ReactNode;
}) {
  const s = makeStyles(colors);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldRow}>
        <View style={s.fieldIconWrap}>
          <Ionicons name={icon} size={18} color={colors.coral} />
        </View>
        <View style={s.fieldInputWrap}>{children}</View>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: AppColors }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />;
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingBottom: spacing.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: radius.full,
      backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.charcoal },
    saveBtn: {
      backgroundColor: colors.coral, paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm, borderRadius: radius.lg, minWidth: 60, alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnTxt: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '700' },

    scroll: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.lg },

    avatarSection: { alignItems: 'center', marginBottom: spacing['2xl'], gap: spacing.sm },
    avatarRing: { padding: 3, borderRadius: radius.full, borderWidth: 2, borderColor: colors.coral },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: fontSizes['2xl'], fontWeight: '800', color: colors.white },
    avatarHint: { fontSize: fontSizes.xs, color: colors.mutedFg },

    card: {
      backgroundColor: colors.white, borderRadius: radius.xl,
      padding: spacing.xl, marginBottom: spacing.lg, gap: spacing.md, ...shadows.sm,
    },
    cardTitle: { fontSize: fontSizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.mutedFg },

    field: { gap: spacing.sm },
    fieldLabel: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.charcoalLight, marginBottom: 2 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    fieldIconWrap: {
      width: 36, height: 36, borderRadius: radius.md,
      backgroundColor: `${colors.coral}12`, alignItems: 'center', justifyContent: 'center',
    },
    fieldInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, fontSize: fontSizes.base, color: colors.charcoal, paddingVertical: spacing.sm },
    inputDisabled: { color: colors.mutedFg },
    lockedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.muted, paddingHorizontal: spacing.sm,
      paddingVertical: 3, borderRadius: radius.sm,
    },
    lockedTxt: { fontSize: 10, color: colors.mutedFg, fontWeight: '600' },

    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    actionIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    actionText: { flex: 1 },
    actionLabel: { fontSize: fontSizes.base, fontWeight: '600', color: colors.charcoal },
    actionSub: { fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 2 },

    saveLargeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.sm, backgroundColor: colors.coral,
      paddingVertical: spacing.lg, borderRadius: radius.xl, marginTop: spacing.sm,
    },
    saveLargeBtnTxt: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  });
}
