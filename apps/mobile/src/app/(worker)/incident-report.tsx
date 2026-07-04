import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../services/api.client';
import { ServiceUserPicker, ServiceUserOption } from '../../components/ServiceUserPicker';

const INCIDENT_TYPES = [
  { value: 'fall', label: 'Fall', icon: '🤕' },
  { value: 'pressure_ulcer', label: 'Pressure Ulcer', icon: '🩹' },
  { value: 'medication_error', label: 'Medication Error', icon: '💊' },
  { value: 'safeguarding', label: 'Safeguarding', icon: '🛡️' },
  { value: 'aggression', label: 'Aggression', icon: '⚠️' },
  { value: 'property_damage', label: 'Property Damage', icon: '🏠' },
  { value: 'near_miss', label: 'Near Miss', icon: '👀' },
  { value: 'hospital_admission', label: 'Hospital Admission', icon: '🏥' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#059669' },
  { value: 'medium', label: 'Medium', color: '#D97706' },
  { value: 'high', label: 'High', color: '#EA580C' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
];

export default function IncidentReportScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const [serviceUser, setServiceUser] = useState<ServiceUserOption | null>(null);
  const [incidentType, setIncidentType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!serviceUser) return Alert.alert('Required', 'Please select the service user involved.');
    if (!incidentType) return Alert.alert('Required', 'Please select the incident type.');
    if (!severity) return Alert.alert('Required', 'Please select how serious the incident was.');
    if (!description.trim()) return Alert.alert('Required', 'Please describe what happened.');

    setSubmitting(true);
    try {
      await apiClient.post('/incidents', {
        serviceUserId: serviceUser.id,
        shiftId: shiftId || undefined,
        incidentType,
        severity,
        description: description.trim(),
        actionsTaken: actionsTaken.trim() || undefined,
        reportedAt: new Date().toISOString(),
      });
      const escalated = severity === 'high' || severity === 'critical';
      Alert.alert(
        'Incident Reported',
        escalated
          ? 'Thank you. Because of the severity, this has been automatically escalated to management.'
          : 'Thank you. The office has been notified.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          Report any accident, incident or near miss as soon as possible.
          Serious incidents are escalated to management automatically.
        </Text>
      </View>

      <ServiceUserPicker value={serviceUser} onChange={setServiceUser} />

      <Text style={styles.label}>What happened? *</Text>
      <View style={styles.typeGrid}>
        {INCIDENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeChip, incidentType === t.value && styles.typeChipSelected]}
            onPress={() => setIncidentType(t.value)}
          >
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={[styles.typeLabel, incidentType === t.value && styles.typeLabelSelected]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>How serious? *</Text>
      <View style={styles.severityRow}>
        {SEVERITIES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[
              styles.severityButton,
              severity === s.value && { borderColor: s.color, backgroundColor: s.color + '15' },
            ]}
            onPress={() => setSeverity(s.value)}
          >
            <Text style={[styles.severityText, severity === s.value && { color: s.color }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Describe what happened *</Text>
      <TextInput
        style={styles.textarea}
        value={description}
        onChangeText={setDescription}
        placeholder="What happened, when, and who was involved. Include any injuries."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Actions taken</Text>
      <TextInput
        style={[styles.textarea, { minHeight: 80 }]}
        value={actionsTaken}
        onChangeText={setActionsTaken}
        placeholder="e.g. First aid given, family informed, 999 called..."
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
          <Text style={styles.submitText}>Submit Incident Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  infoBanner: {
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  infoBannerText: { fontSize: 13, color: '#4C1D95', lineHeight: 19 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    width: '31%', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center',
  },
  typeChipSelected: { borderColor: '#4C1D95', backgroundColor: '#F5F3FF' },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  typeLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', textAlign: 'center' },
  typeLabelSelected: { color: '#4C1D95', fontWeight: '600' },

  severityRow: { flexDirection: 'row', gap: 8 },
  severityButton: {
    flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  severityText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

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
});
