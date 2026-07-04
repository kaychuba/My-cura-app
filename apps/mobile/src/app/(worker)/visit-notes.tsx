import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../services/api.client';

export default function VisitNotesScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const [narrative, setNarrative] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [fluidIntake, setFluidIntake] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const moodLabels = ['😢 Poor', '😕 Low', '😐 Okay', '🙂 Good', '😊 Great'];

  const submit = async () => {
    if (!narrative.trim()) {
      Alert.alert('Required', 'Please add a visit narrative.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/visit-notes', {
        shiftId,
        narrative,
        mood: mood !== null ? mood + 1 : undefined,
        fluidIntakeMl: fluidIntake ? parseInt(fluidIntake, 10) : undefined,
      });
      Alert.alert('Saved', 'Visit notes recorded.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.label}>Visit Narrative *</Text>
      <TextInput
        style={styles.textarea}
        value={narrative}
        onChangeText={setNarrative}
        placeholder="Describe the visit — tasks completed, observations, any concerns..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Service User Mood</Text>
      <View style={styles.moodRow}>
        {moodLabels.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.moodButton, mood === i && styles.moodButtonSelected]}
            onPress={() => setMood(i)}
          >
            <Text style={styles.moodEmoji}>{label.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mood !== null && (
        <Text style={styles.moodLabel}>{moodLabels[mood]}</Text>
      )}

      <Text style={styles.label}>Fluid Intake (ml)</Text>
      <TextInput
        style={styles.input}
        value={fluidIntake}
        onChangeText={setFluidIntake}
        placeholder="e.g. 500"
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Save Visit Notes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  textarea: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A',
    minHeight: 120, textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  moodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  moodButton: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  moodButtonSelected: { borderColor: '#4C1D95', backgroundColor: '#F5F3FF' },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 8 },
  submitButton: {
    backgroundColor: '#4C1D95', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
