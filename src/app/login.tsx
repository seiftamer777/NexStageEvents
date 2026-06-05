import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows, fontSizes } from '../constants/theme';

const registerHref = '/register' as Href;

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        contentContainerStyle={[styles.container]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoMark, { backgroundColor: colors.coral }]}>
            <Ionicons name="sparkles" size={28} color={colors.white} />
          </View>
          <Text style={[styles.brandName, { color: colors.charcoal }]}>NexStage</Text>
          <Text style={[styles.brandTagline, { color: colors.mutedFg }]}>
            Your event, perfectly staged.
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }, shadows.md]}>

          <View style={styles.cardHeader}>
            <Text style={[styles.eyebrow, { color: colors.coral }]}>Welcome back</Text>
            <Text style={[styles.title, { color: colors.charcoal }]}>Sign in</Text>
            <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
              Enter your credentials to continue where you left off.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoal }]}>Email</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedFg} style={styles.inputIcon} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedFg}
                  style={[styles.input, { color: colors.charcoal }]}
                  value={email}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoal }]}>Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedFg} style={styles.inputIcon} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.mutedFg}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: colors.charcoal }]}
                  value={password}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.mutedFg}
                    style={{ marginRight: spacing.md }}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.coral },
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.footerText, { color: colors.mutedFg }]}>
            Don't have an account?{' '}
            <Link href={registerHref} style={[styles.footerLink, { color: colors.coral }]}>
              Sign up
            </Link>
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing['3xl'],
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  brandName: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing['2xl'],
    gap: spacing['2xl'],
  },
  cardHeader: {
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
  },
  subtitle: {
    fontSize: fontSizes.base,
    lineHeight: 22,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.base,
    fontWeight: '700',
  },
  footerText: {
    fontSize: fontSizes.base,
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: '700',
  },
});
