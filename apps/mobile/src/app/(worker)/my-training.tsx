import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { cacheSet, cacheGet } from '../../services/offline';
import { colors } from '../../theme';

interface TrainingRecord {
  id: string;
  status: 'assigned' | 'completed' | 'expired';
  completedAt?: string;
  expiresAt?: string;
  course?: { id: string; name: string; description?: string; mandatory: boolean; validityMonths?: number };
}

const STATUS_META: Record<string, { color: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  assigned: { color: '#D97706', icon: 'book-open' },
  completed: { color: '#059669', icon: 'check-circle' },
  expired: { color: '#DC2626', icon: 'alert-circle' },
};

export default function MyTrainingScreen() {
  const [records, setRecords] = useState<TrainingRecord[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<TrainingRecord[]>('/training/mine');
      setRecords(data);
      cacheSet('training.mine', data);
    } catch {
      const cached = await cacheGet<TrainingRecord[]>('training.mine');
      setRecords(cached ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const complete = (r: TrainingRecord) => {
    Alert.alert(
      'Mark as completed?',
      `Confirm you have finished "${r.course?.name ?? 'this course'}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, completed',
          onPress: async () => {
            try {
              await apiClient.patch(`/training/records/${r.id}/complete`);
              Alert.alert('Well done', 'Your training record is updated.');
              load();
            } catch (e: unknown) {
              const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
              Alert.alert('Error', msg ?? 'Could not update the record.');
            }
          },
        },
      ],
    );
  };

  if (records === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const assigned = records.filter((r) => r.status === 'assigned');
  const rest = records.filter((r) => r.status !== 'assigned');

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={[...assigned, ...rest]}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        assigned.length > 0 ? (
          <Text style={styles.headerNote}>
            {assigned.length} course{assigned.length === 1 ? '' : 's'} waiting for you
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="award" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>No training assigned yet.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = STATUS_META[item.status];
        return (
          <View style={[styles.card, { borderLeftColor: meta.color }]}>
            <View style={styles.cardTop}>
              <Feather name={meta.icon} size={16} color={meta.color} />
              <Text style={styles.courseName}>{item.course?.name ?? 'Course'}</Text>
              {item.course?.mandatory && <Text style={styles.mandatory}>MANDATORY</Text>}
            </View>
            {!!item.course?.description && <Text style={styles.desc}>{item.course.description}</Text>}
            <Text style={[styles.statusLine, { color: meta.color }]}>
              {item.status === 'assigned' && 'Assigned — complete when done'}
              {item.status === 'completed' &&
                `Completed ${item.completedAt ? format(parseISO(item.completedAt), 'd MMM yyyy') : ''}${
                  item.expiresAt ? ` · valid until ${format(parseISO(item.expiresAt), 'd MMM yyyy')}` : ''
                }`}
              {item.status === 'expired' && 'Expired — needs renewing'}
            </Text>
            {item.status === 'assigned' && (
              <TouchableOpacity style={styles.completeButton} onPress={() => complete(item)}>
                <Text style={styles.completeButtonText}>Mark Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerNote: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 90, gap: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  mandatory: { fontSize: 9, fontWeight: '800', color: colors.danger },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  statusLine: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  completeButton: {
    backgroundColor: colors.primaryTint, borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', marginTop: 10,
  },
  completeButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
