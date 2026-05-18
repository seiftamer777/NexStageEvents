import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

const registerHref = '/register' as Href;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }

    // AuthContext picks up the new session → _layout.tsx redirects automatically
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.screen}>
      <View style={styles.panel}>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>Sign in to your account</Text>
          <Text style={styles.subtitle}>
            Enter your credentials to continue where you left off.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#7C8794"
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#7C8794"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <Pressable
            disabled={loading}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.button,
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

        <Text style={styles.footerText}>
          Don't have an account?{' '}
          <Link href={registerHref} style={styles.footerLink}>
            Sign up
          </Link>
        </Text>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F7F3EC',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 24,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#5B6472',
    fontSize: 16,
    lineHeight: 23,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D6DAE1',
    borderRadius: 8,
    backgroundColor: '#FBFCFE',
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 14,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0F766E',
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerText: {
    color: '#5B6472',
    fontSize: 15,
    textAlign: 'center',
  },
  footerLink: {
    color: '#B45309',
    fontWeight: '800',
  },
});