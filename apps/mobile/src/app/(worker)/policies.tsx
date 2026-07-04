import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../services/api.client';
import { formatDisplayDate } from '@my-cura/shared-utils';

export interface PolicyListItem {
  id: string;
  title: string;
  summary?: string;
  externalUrl?: string;
  publishedAt: string;
  requiresAcknowledgement: boolean;
  acknowledgedAt: string | null;
}

export default function PoliciesScreen() {
  const [policies, setPolicies] = useState<PolicyListItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PolicyListItem[]>('/policies');
      setPolicies(data);
    } catch {
      setPolicies([]);
    }
  }, []);

  // Refetch whenever the screen regains focus, so acknowledging in the
  // detail screen updates the badges here.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toRead = policies?.filter((p) => p.requiresAcknowledgement && !p.acknowledgedAt).length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A5F" />}
    >
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          {toRead > 0
            ? `You have ${toRead} ${toRead === 1 ? 'policy' : 'policies'} to read. Please read and confirm each one to stay compliant.`
            : 'You are up to date with all company policies. New ones will appear here.'}
        </Text>
      </View>

      {policies === null ? (
        <ActivityIndicator color="#1E3A5F" style={{ marginTop: 48 }} />
      ) : policies.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>No policies published yet</Text>
        </View>
      ) : (
        policies.map((policy) => {
          const needsAction = policy.requiresAcknowledgement && !policy.acknowledgedAt;
          return (
            <TouchableOpacity
              key={policy.id}
              style={styles.policyCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/(worker)/policy-detail',
                  params: { id: policy.id, acknowledgedAt: policy.acknowledgedAt ?? '' },
                })
              }
            >
              <View style={[styles.policyIconWrap, needsAction ? styles.iconAmber : styles.iconGreen]}>
                <Feather
                  name={needsAction ? 'alert-circle' : 'check-circle'}
                  size={20}
                  color={needsAction ? '#D97706' : '#059669'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                {!!policy.summary && (
                  <Text style={styles.policySummary} numberOfLines={2}>{policy.summary}</Text>
                )}
                <Text style={styles.policyDate}>
                  Published {formatDisplayDate(policy.publishedAt)}
                  {policy.externalUrl ? ' · external link' : ''}
                </Text>
              </View>
              <View style={[styles.badge, needsAction ? styles.badgeAmber : styles.badgeGreen]}>
                <Text style={[styles.badgeText, { color: needsAction ? '#B45309' : '#047857' }]}>
                  {needsAction ? 'To read' : policy.requiresAcknowledgement ? 'Read ✓' : 'Info'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  infoBanner: {
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16,
  },
  infoBannerText: { fontSize: 13, color: '#1E3A5F', lineHeight: 19 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94A3B8' },

  policyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  policyIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  iconAmber: { backgroundColor: '#FEF3C7' },
  iconGreen: { backgroundColor: '#D1FAE5' },
  policyTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  policySummary: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 17 },
  policyDate: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
