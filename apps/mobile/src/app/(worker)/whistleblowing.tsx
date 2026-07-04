import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '../../services/api.client';

const CATEGORIES = [
  { value: 'abuse_or_neglect', label: 'Abuse or Neglect' },
  { value: 'medication_practice', label: 'Medication Practice' },
  { value: 'health_and_safety', label: 'Health & Safety' },
  { value: 'fraud_or_theft', label: 'Fraud or Theft' },
  { value: 'management_conduct', label: 'Management Conduct' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'other', label: 'Something Else' },
];

export default function WhistleblowingScreen() {
  const [anonymous, setAnonymous] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!category) return Alert.alert('Required', 'Please choose what your concern is about.');
    if (!description.trim()) return Alert.alert('Required', 'Please describe your concern.');

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<{ id: string }>('/whistleblowing', {
        category,
        description: description.trim(),
        context: context.trim() || undefined,
        anonymous,
      });
      Alert.alert(
        'Report Submitted',
        `Thank you for speaking up. Your reference number is:\n\n${data.id.slice(0, 8).toUpperCase()}\n\nPlease write it down — you can quote it if you ever need to follow up.` +
          (anonymous ? '\n\nNo record of your identity has been stored.' : ''),
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.trustBanner}>
        <Text style={styles.trustIcon}>🛡️</Text>
        <Text style={styles.trustTitle}>Speak up safely</Text>
        <Text style={styles.trustText}>
          If you have seen something that worries you — about care, safety, money or how
          people are treated — you can report it here. Reports go directly to the agency
          owner. Nobody else, including your manager, can see them. Raising a genuine
          concern will never be held against you.
        </Text>
      </View>

      <View style={styles.anonymousCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.anonymousTitle}>Report anonymously</Text>
          <Text style={styles.anonymousHint}>
            {anonymous
              ? 'Your identity will not be recorded anywhere — not even in our database.'
              : 'Your name will be attached, visible only to the agency owner.'}
          </Text>
        </View>
        <Switch
          value={anonymous}
          onValueChange={setAnonymous}
          trackColor={{ true: '#14B8A6', false: '#CBD5E1' }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={styles.label}>What is your concern about? *</Text>
      <View style={styles.categoryWrap}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryChipSelected]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextSelected]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Describe your concern *</Text>
      <TextInput
        style={styles.textarea}
        value={description}
        onChangeText={setDescription}
        placeholder="Tell us what you have seen or experienced, in your own words."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.label}>When and where? (optional)</Text>
      <TextInput
        style={[styles.textarea, { minHeight: 80 }]}
        value={context}
        onChangeText={setContext}
        placeholder="When did it happen, where, and who was involved — share only what you are comfortable sharing."
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Submit Confidential Report</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        You can also raise concerns externally at any time — in the UK to the CQC on
        03000 616161, or in the US to your state's Adult Protective Services.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  trustBanner: {
    backgroundColor: '#F0FDFA', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#99F6E4', alignItems: 'center',
  },
  trustIcon: { fontSize: 28, marginBottom: 6 },
  trustTitle: { fontSize: 16, fontWeight: '700', color: '#0F766E', marginBottom: 6 },
  trustText: { fontSize: 13, color: '#134E4A', lineHeight: 19, textAlign: 'center' },

  anonymousCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  anonymousTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  anonymousHint: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },

  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
  },
  categoryChipSelected: { borderColor: '#4C1D95', backgroundColor: '#F5F3FF' },
  categoryText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  categoryTextSelected: { color: '#4C1D95', fontWeight: '600' },

  textarea: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A',
    minHeight: 120, textAlignVertical: 'top',
  },

  submitButton: {
    backgroundColor: '#4C1D95', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  footerNote: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center',
    marginTop: 16, lineHeight: 16,
  },
});
