import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { SwipeableSheet } from '../../components/SwipeableSheet';
import { colors } from '../../theme';

interface Balance {
  year: number;
  entitlementDays: number;
  annualTaken: number;
  annualPending: number;
  annualRemaining: number;
  sickTaken: number;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: string;
  reason?: string;
}

const TYPES = [
  { value: 'annual', label: 'Annual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
];

const STATUS_COLOR: Record<string, string> = {
  pending: '#D97706', approved: '#059669', rejected: '#DC2626', cancelled: '#94A3B8',
};

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export default function LeaveScreen() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState(toDateStr(new Date()));
  const [endDate, setEndDate] = useState(toDateStr(new Date()));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([
        apiClient.get<Balance>('/leave/balance'),
        apiClient.get<LeaveRequest[]>('/leave/mine'),
      ]);
      setBalance(b.data);
      setRequests(Array.isArray(r.data) ? r.data : []);
    } catch { /* keep whatever we have */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const days = Math.max(1, differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1);

  const submit = async () => {
    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert('Check dates', 'The end date is before the start date.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/leave', {
        leaveType, startDate, endDate, daysRequested: days,
        reason: reason.trim() || undefined,
      });
      setFormOpen(false);
      setReason('');
      Alert.alert('Requested', 'Your leave request is with your manager for approval.');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Could not submit the request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />
        }
      >
        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceBig}>{balance ? balance.annualRemaining : '—'}</Text>
          <Text style={styles.balanceLabel}>annual leave days remaining ({balance?.year ?? ''})</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceSmall}>Entitlement {balance?.entitlementDays ?? '—'}</Text>
            <Text style={styles.balanceSmall}>Taken {balance?.annualTaken ?? '—'}</Text>
            <Text style={styles.balanceSmall}>Pending {balance?.annualPending ?? '—'}</Text>
            <Text style={styles.balanceSmall}>Sick {balance?.sickTaken ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Requests</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="sun" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>No leave requests yet</Text>
          </View>
        ) : (
          requests.map((r) => (
            <View key={r.id} style={styles.reqCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqType}>{r.leaveType.replace(/_/g, ' ')} · {Number(r.daysRequested)} day{Number(r.daysRequested) === 1 ? '' : 's'}</Text>
                <Text style={styles.reqDates}>
                  {format(parseISO(r.startDate), 'd MMM')} – {format(parseISO(r.endDate), 'd MMM yyyy')}
                </Text>
                {!!r.reason && <Text style={styles.reqReason}>{r.reason}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[r.status] ?? '#94A3B8') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] ?? '#94A3B8' }]}>{r.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setFormOpen(true)} activeOpacity={0.85}>
        <Feather name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <SwipeableSheet visible={formOpen} onClose={() => setFormOpen(false)}>
        <View style={styles.sheetBody}>
          <Text style={styles.sheetTitle}>Request Leave</Text>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.chipRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, leaveType === t.value && styles.chipActive]}
                onPress={() => setLeaveType(t.value)}
              >
                <Text style={[styles.chipText, leaveType === t.value && { color: '#FFFFFF' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>First day (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-08-01" placeholderTextColor={colors.textMuted} />
          <Text style={styles.fieldLabel}>Last day (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-08-07" placeholderTextColor={colors.textMuted} />
          <Text style={styles.daysNote}>= {days} day{days === 1 ? '' : 's'} requested</Text>

          <Text style={styles.fieldLabel}>Reason (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} value={reason} onChangeText={setReason} multiline placeholderTextColor={colors.textMuted} placeholder="Anything your manager should know" />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, alignItems: 'center' },
  balanceBig: { fontSize: 44, fontWeight: '800', color: '#FFFFFF' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  balanceRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  balanceSmall: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 18, marginBottom: 10 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 22, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 13, color: colors.textMuted },

  reqCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  reqType: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  reqDates: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  reqReason: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },

  sheetBody: { padding: 20, paddingTop: 6 },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: colors.textPrimary,
  },
  daysNote: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 8 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
