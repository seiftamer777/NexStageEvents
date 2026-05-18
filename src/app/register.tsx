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

const loginHref = '/login' as Href;

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing details', 'Please add your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Please use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm the same password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Registration failed', error.message);
      return;
    }

    Alert.alert('Account created', 'Check your email if confirmation is enabled.');
    router.replace(loginHref);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.screen}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Get started</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Register with Supabase Auth and save your profile data.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              autoComplete="name"
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor="#7C8794"
              style={styles.input}
              value={fullName}
            />
          </View>

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
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#7C8794"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor="#7C8794"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>

          <Pressable
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href={loginHref} style={styles.footerLink}>
            Log in
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
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
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
