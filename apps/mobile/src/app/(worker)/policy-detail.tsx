import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

interface PolicyDetail {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  externalUrl?: string;
  publishedAt: string;
  requiresAcknowledgement: boolean;
}

export default function PolicyDetailScreen() {
  const { id, acknowledgedAt } = useLocalSearchParams<{ id: string; acknowledgedAt?: string }>();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [acknowledged, setAcknowledged] = useState(!!acknowledgedAt);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<PolicyDetail>(`/policies/${id}`)
      .then(({ data }) => setPolicy(data))
      .catch(() => Alert.alert('Error', 'Could not load this policy.'));
  }, [id]);

  const acknowledge = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(`/policies/${id}/acknowledge`);
      setAcknowledged(true);
    } catch {
      Alert.alert('Error', 'Could not record your confirmation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!policy) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#1E3A5F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.title}>{policy.title}</Text>
      <Text style={styles.date}>Published {formatDisplayDate(policy.publishedAt)}</Text>

      {!!policy.summary && <Text style={styles.summary}>{policy.summary}</Text>}

      {!!policy.content && (
        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{policy.content}</Text>
        </View>
      )}

      {!!policy.externalUrl && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL(policy.externalUrl!)}
          activeOpacity={0.8}
        >
          <Feather name="external-link" size={18} color="#1E3A5F" />
          <Text style={styles.linkButtonText}>Open Policy Document</Text>
        </TouchableOpacity>
      )}

      {policy.requiresAcknowledgement && (
        acknowledged ? (
          <View style={styles.ackDone}>
            <Feather name="check-circle" size={20} color="#059669" />
            <Text style={styles.ackDoneText}>
              You have confirmed reading this policy. Thank you for staying compliant.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ackButton, submitting && { opacity: 0.6 }]}
            onPress={acknowledge}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ackButtonText}>
                I confirm I have read and understood this policy
              </Text>
            )}
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  title: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  date: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginBottom: 12 },
  summary: { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 12, fontStyle: 'italic' },

  contentCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  contentText: { fontSize: 14, color: '#0F172A', lineHeight: 22 },

  linkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 14, marginTop: 16,
    borderWidth: 1.5, borderColor: '#1E3A5F',
  },
  linkButtonText: { fontSize: 14, fontWeight: '600', color: '#1E3A5F' },

  ackButton: {
    backgroundColor: '#14B8A6', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 16, alignItems: 'center', marginTop: 24,
  },
  ackButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  ackDone: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, marginTop: 24,
  },
  ackDoneText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 19 },
});
