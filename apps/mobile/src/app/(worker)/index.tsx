import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../services/api.client';
import { useMedicationReminders } from '../../hooks/useMedicationReminders';
import { ShiftStatus } from '@my-cura/shared-types';
import { formatDisplayTime, formatDisplayDate } from '@my-cura/shared-utils';

interface TodaysShift {
  id: string;
  serviceUser: { firstName: string; lastName: string };
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  locationAddress: string;
}

interface DashboardData {
  todaysShifts: TodaysShift[];
  hoursThisWeek: number;
  shiftsThisWeek: number;
  pendingExpenses: number;
  leaveBalance: number;
}

export default function WorkerDashboard() {
  const { user } = useAuthStore();
  useMedicationReminders(); // vibration-only reminders for today's scheduled doses
  const [data, setData] = useState<DashboardData | null>(null);
  const [policiesToRead, setPoliciesToRead] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data: result } = await apiClient.get<DashboardData>('/care-workers/me/dashboard');
      setData(result);
    } catch { /* fail silently — show placeholder */ }
    try {
      const { data: policies } = await apiClient.get<
        { requiresAcknowledgement: boolean; acknowledgedAt: string | null }[]
      >('/policies');
      setPoliciesToRead(policies.filter((p) => p.requiresAcknowledgement && !p.acknowledgedAt).length);
    } catch { /* fail silently */ }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = new Date();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C1D95" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.userName}>{user?.firstName} 👋</Text>
          <Text style={styles.date}>{formatDisplayDate(today.toISOString())}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Hours this week" value={data ? `${data.hoursThisWeek}h` : '—'} />
        <StatCard label="Visits this week" value={data ? `${data.shiftsThisWeek}` : '—'} />
        <StatCard label="Leave balance" value={data ? `${data.leaveBalance}d` : '—'} />
      </View>

      {/* Today's shifts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Visits</Text>
        {data?.todaysShifts?.length ? (
          data.todaysShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onPress={() => router.push({ pathname: '/(worker)/clock-in', params: { shiftId: shift.id } })}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No visits scheduled for today</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction icon="📍" label="Clock In/Out" onPress={() => router.push('/(worker)/clock-in')} />
          <QuickAction icon="📅" label="My Schedule" onPress={() => router.push('/(worker)/schedule')} />
          <QuickAction icon="🚨" label="Report Incident" onPress={() => router.push('/(worker)/incident-report')} />
          <QuickAction icon="🩹" label="Body Map" onPress={() => router.push('/(worker)/body-map')} />
          <QuickAction
            icon="📖"
            label="Policies"
            badge={policiesToRead}
            onPress={() => router.push('/(worker)/policies')}
          />
          <QuickAction icon="🛡️" label="Speak Up" onPress={() => router.push('/(worker)/whistleblowing')} />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ShiftCard({ shift, onPress }: { shift: TodaysShift; onPress: () => void }) {
  const statusColors: Record<string, string> = {
    [ShiftStatus.ASSIGNED]: '#3B82F6',
    [ShiftStatus.CONFIRMED]: '#3B82F6',
    [ShiftStatus.IN_PROGRESS]: '#059669',
    [ShiftStatus.COMPLETED]: '#6B7280',
    [ShiftStatus.NO_SHOW]: '#DC2626',
  };

  return (
    <TouchableOpacity style={styles.shiftCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.shiftStatusBar, { backgroundColor: statusColors[shift.status] ?? '#94A3B8' }]} />
      <View style={styles.shiftCardContent}>
        <View style={styles.shiftCardTop}>
          <Text style={styles.shiftServiceUser}>
            {shift.serviceUser.firstName} {shift.serviceUser.lastName}
          </Text>
          <View style={[styles.shiftStatusBadge, { backgroundColor: (statusColors[shift.status] ?? '#94A3B8') + '20' }]}>
            <Text style={[styles.shiftStatusText, { color: statusColors[shift.status] ?? '#94A3B8' }]}>
              {shift.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.shiftTime}>
          {formatDisplayTime(shift.scheduledStart)} – {formatDisplayTime(shift.scheduledEnd)}
        </Text>
        <Text style={styles.shiftAddress}>{shift.locationAddress}</Text>
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon, label, onPress, badge,
}: { icon: string; label: string; onPress: () => void; badge?: number }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
      {!!badge && (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#4C1D95', paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  statsRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16,
    marginTop: -14, marginBottom: 4,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#4C1D95' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  shiftCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  shiftStatusBar: { width: 4 },
  shiftCardContent: { flex: 1, padding: 14 },
  shiftCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shiftServiceUser: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  shiftStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  shiftStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  shiftTime: { fontSize: 13, color: '#4C1D95', fontWeight: '500', marginBottom: 2 },
  shiftAddress: { fontSize: 12, color: '#64748B' },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: {
    width: '30.5%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  quickActionIcon: { fontSize: 24, marginBottom: 6 },
  quickActionLabel: { fontSize: 12, color: '#374151', fontWeight: '500', textAlign: 'center' },
  quickActionBadge: {
    position: 'absolute', top: 8, right: 8,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
  },
  quickActionBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
