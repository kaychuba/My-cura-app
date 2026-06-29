import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../stores/auth.store';

export default function LoginScreen() {
  const { login, loginWithBiometric } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.requires2FA) {
        router.push({ pathname: '/auth/two-factor', params: { partialToken: result.partialToken } });
      } else {
        router.replace('/(worker)');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Login Failed', error?.response?.data?.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometric unavailable', 'Please use your email and password to log in.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to My-Cura',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        await loginWithBiometric();
        router.replace('/(worker)');
      }
    } catch {
      Alert.alert('Biometric failed', 'Please use your email and password.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🏥</Text>
          </View>
          <Text style={styles.logoText}>My-Cura</Text>
          <Text style={styles.logoSubtext}>Care Management Platform</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@agency.com"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBiometric} style={styles.biometricButton}>
            <Text style={styles.biometricText}>🔐 Sign in with Face ID / Touch ID</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E3A5F' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  logoText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  logoSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  form: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A',
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: {
    position: 'absolute', right: 12, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 16 },
  loginButton: {
    backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  biometricButton: {
    alignItems: 'center', paddingVertical: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
  },
  biometricText: { color: '#1E3A5F', fontSize: 14, fontWeight: '500' },
  forgotLink: { alignItems: 'center', paddingTop: 16 },
  forgotText: { color: '#0D9488', fontSize: 13, fontWeight: '500' },
});
