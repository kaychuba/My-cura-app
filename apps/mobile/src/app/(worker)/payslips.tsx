import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { cacheSet, cacheGet } from '../../services/offline';
import { colors } from '../../theme';

interface Payslip {
  id: string;
  grossPay: number;
  netPay: number;
  taxDeducted?: number;
  niDeducted?: number;
  hoursWorked?: number;
  createdAt: string;
  period?: { periodStart: string; periodEnd: string };
  periodStart?: string;
  periodEnd?: string;
}

const gbp = (n: number | undefined) =>
  n != null ? `£${Number(n).toFixed(2)}` : '—';

export default function PayslipsScreen() {
  const { user } = useAuthStore();
  const [slips, setSlips] = useState<Payslip[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await apiClient.get<Payslip[]>(`/payroll/workers/${user.id}/payslips`);
      setSlips(Array.isArray(data) ? data : []);
      cacheSet(`payslips.${user.id}`, data);
    } catch {
      const cached = await cacheGet<Payslip[]>(`payslips.${user.id}`);
      setSlips(cached ?? []);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const periodOf = (p: Payslip) => {
    const start = p.period?.periodStart ?? p.periodStart;
    const end = p.period?.periodEnd ?? p.periodEnd;
    if (start && end) {
      return `${new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return new Date(p.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  if (slips === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={slips}
      keyExtractor={(p) => p.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="file-text" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No payslips yet — they appear here after your manager runs payroll.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.period}>{periodOf(item)}</Text>
            {item.hoursWorked != null && (
              <Text style={styles.hours}>{Number(item.hoursWorked)}h</Text>
            )}
          </View>
          <View style={styles.payRow}>
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>Gross</Text>
              <Text style={styles.payValue}>{gbp(item.grossPay)}</Text>
            </View>
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>Tax</Text>
              <Text style={styles.payValueSmall}>{gbp(item.taxDeducted)}</Text>
            </View>
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>NI</Text>
              <Text style={styles.payValueSmall}>{gbp(item.niDeducted)}</Text>
            </View>
            <View style={[styles.payBox, styles.netBox]}>
              <Text style={[styles.payLabel, { color: 'rgba(255,255,255,0.8)' }]}>Take home</Text>
              <Text style={[styles.payValue, { color: '#FFFFFF' }]}>{gbp(item.netPay)}</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  empty: { alignItems: 'center', paddingTop: 90, gap: 10, paddingHorizontal: 30 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  period: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  hours: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  payRow: { flexDirection: 'row', gap: 8 },
  payBox: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10 },
  netBox: { backgroundColor: colors.primary },
  payLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  payValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  payValueSmall: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 3 },
});
