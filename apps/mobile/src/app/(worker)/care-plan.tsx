import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../services/api.client';
import { colors } from '../../theme';

const SECTION_LABELS: Record<string, string> = {
  personalCare: 'Personal Care',
  nutrition: 'Nutrition',
  mobility: 'Mobility',
  continence: 'Continence',
  communication: 'Communication',
  sleep: 'Sleep',
  socialAndWellbeing: 'Social & Wellbeing',
  medicationManagement: 'Medication Management',
  behaviourSupport: 'Behaviour Support',
  palliativeCare: 'Palliative Care',
};

interface CarePlan {
  id: string;
  version: number;
  title: string;
  content: Record<string, string>;
  goals?: string[];
  riskAssessments?: { riskTitle: string; likelihood?: string; mitigation?: string }[];
  nextReviewAt?: string;
}

export default function CarePlanScreen() {
  const { serviceUserId, suName } = useLocalSearchParams<{ serviceUserId: string; suName?: string }>();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [state, setState] = useState<'loading' | 'none' | 'ready'>('loading');

  useEffect(() => {
    if (!serviceUserId) { setState('none'); return; }
    apiClient
      .get<CarePlan>(`/care-plans/service-user/${serviceUserId}/active`)
      .then(({ data }) => { setPlan(data); setState('ready'); })
      .catch(() => setState('none'));
  }, [serviceUserId]);

  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state === 'none' || !plan) {
    return (
      <View style={styles.centered}>
        <Feather name="clipboard" size={36} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No active care plan</Text>
        <Text style={styles.emptySub}>
          Your manager hasn't activated a care plan for this person yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.headerCard}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <Text style={styles.planMeta}>
          {suName ? `${suName} · ` : ''}Version {plan.version}
          {plan.nextReviewAt ? ` · Review due ${new Date(plan.nextReviewAt).toLocaleDateString('en-GB')}` : ''}
        </Text>
      </View>

      {(plan.goals?.length ?? 0) > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="target" size={15} color={colors.primary} />
            <Text style={styles.sectionTitle}>Goals</Text>
          </View>
          {plan.goals!.map((g, i) => (
            <Text key={i} style={styles.goalItem}>• {g}</Text>
          ))}
        </View>
      )}

      {Object.entries(plan.content ?? {}).map(([key, value]) => (
        <View key={key} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={15} color={colors.primary} />
            <Text style={styles.sectionTitle}>{SECTION_LABELS[key] ?? key}</Text>
          </View>
          <Text style={styles.sectionBody}>{value}</Text>
        </View>
      ))}

      {(plan.riskAssessments?.length ?? 0) > 0 && (
        <View style={[styles.sectionCard, styles.riskCard]}>
          <View style={styles.sectionHeader}>
            <Feather name="alert-triangle" size={15} color={colors.danger} />
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>Risk Assessments</Text>
          </View>
          {plan.riskAssessments!.map((r, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.riskTitle}>{r.riskTitle}</Text>
              {r.mitigation && <Text style={styles.sectionBody}>{r.mitigation}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 10, backgroundColor: colors.background,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  headerCard: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16, marginBottom: 12,
  },
  planTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  planMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  sectionCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  riskCard: { borderColor: '#FECACA' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  sectionBody: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  goalItem: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  riskTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
});
