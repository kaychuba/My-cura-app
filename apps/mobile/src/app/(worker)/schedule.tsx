import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Linking, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { apiClient } from '../../services/api.client';
import { ShiftStatus } from '@my-cura/shared-types';
import { colors } from '../../theme';

interface CalendarShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  shiftType?: string;
  serviceUser?: {
    id: string;
    firstName: string;
    lastName: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      postcode: string;
      lat: number;
      lon: number;
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  [ShiftStatus.ASSIGNED]: colors.info,
  [ShiftStatus.CONFIRMED]: colors.info,
  [ShiftStatus.IN_PROGRESS]: colors.success,
  [ShiftStatus.COMPLETED]: '#6B7280',
  [ShiftStatus.NO_SHOW]: colors.danger,
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function ScheduleScreen() {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openShift, setOpenShift] = useState<CalendarShift | null>(null);

  const load = async (forMonth: Date) => {
    try {
      const from = startOfMonth(forMonth).toISOString();
      const to = endOfMonth(forMonth).toISOString();
      const { data } = await apiClient.get<CalendarShift[]>(
        `/shifts/mine?from=${from}&to=${to}`,
      );
      setShifts(Array.isArray(data) ? data : []);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load(month);
  }, [month]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(month);
    setRefreshing(false);
  };

  /** Shifts grouped by calendar day for fast dot/list lookups. */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarShift[]>();
    for (const s of shifts) {
      const key = format(parseISO(s.scheduledStart), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [shifts]);

  /** 6 weeks starting from the Monday on/before the 1st. */
  const gridDays = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  const dayShifts = byDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];

  const goToday = () => {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelectedDay(now);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Month header */}
      <View style={styles.monthBar}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setMonth(addMonths(month, -1))}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>{format(month, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={goToday}>
            <Text style={styles.todayLink}>Today</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setMonth(addMonths(month, 1))}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar card */}
      <View style={styles.calendarCard}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={styles.weekdayLabel}>{d}</Text>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 60 }} />
        ) : (
          <View style={styles.grid}>
            {gridDays.map((day) => {
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const count = (byDay.get(format(day, 'yyyy-MM-dd')) ?? []).length;

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={styles.dayCell}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.6}
                >
                  <View style={[
                    styles.dayCircle,
                    isToday && !isSelected && styles.dayCircleToday,
                    isSelected && styles.dayCircleSelected,
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      !inMonth && styles.dayNumberDim,
                      isSelected && styles.dayNumberSelected,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                      <View key={i} style={[styles.dot, isSelected && styles.dotSelected]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Selected day's visits */}
      <View style={styles.daySection}>
        <Text style={styles.dayTitle}>{format(selectedDay, 'EEEE d MMMM')}</Text>
        {dayShifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="coffee" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>No visits on this day</Text>
          </View>
        ) : (
          dayShifts.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.shiftCard}
              onPress={() => setOpenShift(s)}
              activeOpacity={0.75}
            >
              <View style={[styles.shiftBar, { backgroundColor: STATUS_COLORS[s.status] ?? colors.textMuted }]} />
              <View style={styles.shiftBody}>
                <Text style={styles.shiftTime}>
                  {format(parseISO(s.scheduledStart), 'HH:mm')} – {format(parseISO(s.scheduledEnd), 'HH:mm')}
                </Text>
                <Text style={styles.shiftName}>
                  {s.serviceUser ? `${s.serviceUser.firstName} ${s.serviceUser.lastName}` : 'Service user'}
                </Text>
                {!!s.serviceUser?.address && (
                  <Text style={styles.shiftAddr} numberOfLines={1}>
                    {s.serviceUser.address.line1}, {s.serviceUser.address.postcode}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} style={{ alignSelf: 'center', marginRight: 10 }} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <ShiftDetailModal shift={openShift} onClose={() => setOpenShift(null)} />
    </ScrollView>
  );
}

function ShiftDetailModal({ shift, onClose }: { shift: CalendarShift | null; onClose: () => void }) {
  if (!shift) return null;
  const su = shift.serviceUser;
  const addr = su?.address;
  const statusColor = STATUS_COLORS[shift.status] ?? colors.textMuted;

  const openMaps = () => {
    if (!addr) return;
    const label = encodeURIComponent(`${su!.firstName} ${su!.lastName} — ${addr.line1}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${addr.lat},${addr.lon}`,
      default: `geo:${addr.lat},${addr.lon}?q=${addr.lat},${addr.lon}(${label})`,
    });
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Visit details</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {shift.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <DetailRow icon="clock" label="Time">
            {format(parseISO(shift.scheduledStart), 'EEE d MMM, HH:mm')} – {format(parseISO(shift.scheduledEnd), 'HH:mm')}
          </DetailRow>

          <DetailRow icon="user" label="Service user">
            {su ? `${su.firstName} ${su.lastName}` : 'Not available'}
          </DetailRow>

          <DetailRow icon="home" label="Address">
            {addr
              ? [addr.line1, addr.line2, addr.city].filter(Boolean).join(', ')
              : 'Not available'}
          </DetailRow>

          <DetailRow icon="mail" label="Postcode">
            {addr?.postcode ?? 'Not available'}
          </DetailRow>

          <DetailRow icon="map-pin" label="Location">
            {addr ? `${addr.lat.toFixed(5)}, ${addr.lon.toFixed(5)}` : 'Not available'}
          </DetailRow>

          {!!su && (
            <TouchableOpacity
              style={styles.carePlanButton}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/(worker)/care-plan',
                  params: { serviceUserId: su.id, suName: `${su.firstName} ${su.lastName}` },
                });
              }}
            >
              <Feather name="clipboard" size={16} color={colors.primary} />
              <Text style={styles.carePlanButtonText}>View Care Plan</Text>
            </TouchableOpacity>
          )}

          {!!addr && (
            <TouchableOpacity style={styles.mapsButton} onPress={openMaps} activeOpacity={0.85}>
              <Feather name="navigation" size={16} color="#FFFFFF" />
              <Text style={styles.mapsButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  monthBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 14,
  },
  monthArrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitleWrap: { alignItems: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  todayLink: { fontSize: 12, fontWeight: '600', color: colors.primaryLight, marginTop: 2 },

  calendarCard: {
    backgroundColor: colors.surface, borderRadius: 16, margin: 12, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: colors.textMuted, textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.primaryLight },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayNumber: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  dayNumberDim: { color: '#CBD5E1' },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primaryLight },
  dotSelected: { backgroundColor: colors.primary },

  daySection: { paddingHorizontal: 16, paddingBottom: 32 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 22,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted },

  shiftCard: {
    backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  shiftBar: { width: 4 },
  shiftBody: { flex: 1, padding: 12 },
  shiftTime: { fontSize: 13, fontWeight: '700', color: colors.primary },
  shiftName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginTop: 2 },
  shiftAddr: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 10,
  },
  modalHandle: {
    alignSelf: 'center', width: 42, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  detailIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: colors.textPrimary, marginTop: 2, lineHeight: 20 },

  carePlanButton: {
    flexDirection: 'row', gap: 8, backgroundColor: colors.primaryTint,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 4, marginBottom: 8,
  },
  carePlanButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  mapsButton: {
    flexDirection: 'row', gap: 8, backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  mapsButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  closeButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  closeButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
