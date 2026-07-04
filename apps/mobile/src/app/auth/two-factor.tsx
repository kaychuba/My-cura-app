import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function TwoFactorScreen() {
  const { partialToken } = useLocalSearchParams<{ partialToken: string }>();
  const { verify2FA } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code from your authenticator app');
      return;
    }
    setLoading(true);
    try {
      await verify2FA(partialToken!, code.trim());
      router.replace('/(worker)');
    } catch {
      Alert.alert('Verification Failed', 'That code was not accepted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app to finish signing in.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#4C1D95',
    justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center',
  },
  icon: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  subtitle: {
    fontSize: 13, color: '#64748B', textAlign: 'center',
    marginTop: 8, lineHeight: 19,
  },
  codeInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    fontSize: 24, fontWeight: '700', letterSpacing: 8, color: '#0F172A',
    marginTop: 20, alignSelf: 'stretch',
  },
  button: {
    backgroundColor: '#4C1D95', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 16, alignSelf: 'stretch',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 13, color: '#64748B' },
});
