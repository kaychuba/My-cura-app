import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiClient } from '../../services/api.client';
import { ClockEventType, ShiftStatus } from '@my-cura/shared-types';
import { isWithinRadius, haversineDistanceMetres } from '@my-cura/shared-utils';
import { formatDisplayTime } from '@my-cura/shared-utils';

const GPS_RADIUS_METRES = 200;
const ACCURACY_THRESHOLD = 50;

interface ActiveShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  locationAddress: string;
  locationLat: number;
  locationLon: number;
  serviceUser: { firstName: string; lastName: string };
}

type ClockPhase = 'idle' | 'acquiring_gps' | 'confirming' | 'submitting' | 'clocked_in' | 'clocked_out';

export default function ClockInScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const [shift, setShift] = useState<ActiveShift | null>(null);
  const [todayShifts, setTodayShifts] = useState<ActiveShift[]>([]);
  const [phase, setPhase] = useState<ClockPhase>('idle');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [distanceMetres, setDistanceMetres] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);

  // Reload every time the tab opens so newly rostered shifts appear instantly
  useFocusEffect(
    useCallback(() => {
      loadShift();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shiftId]),
  );

  const applyShift = (data: ActiveShift) => {
    setShift(data);
    if (data.status === ShiftStatus.IN_PROGRESS) {
      setClockedIn(true);
      setPhase('clocked_in');
    } else {
      setClockedIn(false);
      setPhase('idle');
    }
  };

  const loadShift = async () => {
    setLoading(true);
    try {
      if (shiftId) {
        const { data } = await apiClient.get<ActiveShift>(`/shifts/${shiftId}`);
        applyShift(data);
      } else {
        // The moment a manager rosters a shift for today, it appears here.
        const { data } = await apiClient.get<ActiveShift[]>('/shifts/mine');
        const usable = (data ?? []).filter(
          (s) => s.status !== ShiftStatus.CANCELLED && s.status !== ShiftStatus.COMPLETED,
        );
        setTodayShifts(usable);
        if (usable.length === 1) applyShift(usable[0]);
        else setShift(null);
      }
    } catch {
      Alert.alert('Error', 'Could not load your shifts. Pull to refresh or try again.');
    } finally {
      setLoading(false);
    }
  };

  const acquireGPS = useCallback(async () => {
    setGpsStatus('loading');
    setPhase('acquiring_gps');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'My-Cura needs your location to verify you are at the care address.',
          [{ text: 'OK' }]
        );
        setGpsStatus('error');
        setPhase('idle');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = location.coords;

      if (shift?.locationLat && shift?.locationLon) {
        const dist = haversineDistanceMetres(latitude, longitude, shift.locationLat, shift.locationLon);
        setDistanceMetres(Math.round(dist));
      }

      setGpsCoords({ lat: latitude, lon: longitude, accuracy: accuracy ?? 99 });
      setGpsStatus('ok');
      setPhase('confirming');
    } catch {
      setGpsStatus('error');
      setPhase('idle');
      Alert.alert('GPS Error', 'Could not get your location. Please ensure GPS is enabled.');
    }
  }, [shift]);

  const submitClockEvent = async (eventType: ClockEventType) => {
    if (!gpsCoords || !shift) return;

    setPhase('submitting');
    try {
      await apiClient.post('/clock-in', {
        shiftId: shift.id,
        eventType,
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lon,
        accuracy: gpsCoords.accuracy,
        timestamp: new Date().toISOString(),
        deviceId: 'mobile',
      });

      if (eventType === ClockEventType.CLOCK_IN) {
        setClockedIn(true);
        setPhase('clocked_in');
      } else {
        setPhase('clocked_out');
        Alert.alert(
          'Clocked Out',
          'Your visit has been recorded. Have a safe journey!',
          [{ text: 'Done', onPress: () => router.replace('/(worker)') }]
        );
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPhase(clockedIn ? 'clocked_in' : 'idle');
      Alert.alert('Error', error?.response?.data?.message ?? 'Failed to record event. Please try again.');
    }
  };

  const isOutOfRange = distanceMetres !== null && shift?.locationLat
    ? !isWithinRadius(gpsCoords!.lat, gpsCoords!.lon, shift.locationLat, shift.locationLon, GPS_RADIUS_METRES)
    : false;

  const isLowAccuracy = gpsCoords !== null && gpsCoords.accuracy > ACCURACY_THRESHOLD;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C1D95" />
        <Text style={styles.loadingText}>Loading shift...</Text>
      </View>
    );
  }

  if (!shift) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {todayShifts.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.noShiftIcon}>📋</Text>
            <Text style={styles.noShiftTitle}>No shift scheduled today</Text>
            <Text style={styles.noShiftSub}>
              When your manager rosters you, the visit appears here ready to clock in.
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={loadShift}>
              <Text style={styles.backButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.noShiftTitle}>Today's shifts</Text>
            <Text style={styles.noShiftSub}>Choose the visit you're clocking for:</Text>
            {todayShifts.map((s) => (
              <TouchableOpacity key={s.id} style={styles.shiftCard} onPress={() => applyShift(s)} activeOpacity={0.8}>
                <Text style={styles.serviceUserName}>
                  {s.serviceUser?.firstName} {s.serviceUser?.lastName}
                </Text>
                <Text style={styles.shiftAddress}>
                  {formatDisplayTime(s.scheduledStart)} – {formatDisplayTime(s.scheduledEnd)}
                  {s.status === ShiftStatus.IN_PROGRESS ? '  ·  🟢 clocked in' : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.backButton} onPress={loadShift}>
              <Text style={styles.backButtonText}>Refresh</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Shift info card */}
      <View style={styles.shiftCard}>
        <Text style={styles.shiftLabel}>Current Visit</Text>
        <Text style={styles.serviceUserName}>
          {shift.serviceUser.firstName} {shift.serviceUser.lastName}
        </Text>
        <Text style={styles.shiftAddress}>{shift.locationAddress}</Text>
        <View style={styles.shiftTimes}>
          <View style={styles.shiftTime}>
            <Text style={styles.shiftTimeLabel}>Start</Text>
            <Text style={styles.shiftTimeValue}>{formatDisplayTime(shift.scheduledStart)}</Text>
          </View>
          <View style={styles.shiftTimeDivider} />
          <View style={styles.shiftTime}>
            <Text style={styles.shiftTimeLabel}>End</Text>
            <Text style={styles.shiftTimeValue}>{formatDisplayTime(shift.scheduledEnd)}</Text>
          </View>
        </View>
      </View>

      {/* Status indicator */}
      <View style={[styles.statusBadge, clockedIn ? styles.statusBadgeIn : styles.statusBadgeOut]}>
        <Text style={styles.statusDot}>{clockedIn ? '🟢' : '⚪'}</Text>
        <Text style={styles.statusText}>{clockedIn ? 'Currently clocked in' : 'Not clocked in'}</Text>
      </View>

      {/* GPS info */}
      {gpsCoords && (
        <View style={styles.gpsInfo}>
          <Text style={styles.gpsInfoTitle}>GPS Reading</Text>
          <View style={styles.gpsInfoRow}>
            <Text style={styles.gpsInfoLabel}>Accuracy</Text>
            <Text style={[styles.gpsInfoValue, isLowAccuracy && styles.gpsInfoWarn]}>
              {Math.round(gpsCoords.accuracy)}m {isLowAccuracy ? '⚠️' : '✓'}
            </Text>
          </View>
          {distanceMetres !== null && (
            <View style={styles.gpsInfoRow}>
              <Text style={styles.gpsInfoLabel}>Distance from address</Text>
              <Text style={[styles.gpsInfoValue, isOutOfRange && styles.gpsInfoError]}>
                {distanceMetres}m {isOutOfRange ? '⚠️ Out of range' : '✓ In range'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Out of range warning */}
      {isOutOfRange && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Location Warning</Text>
          <Text style={styles.warningText}>
            You appear to be more than {GPS_RADIUS_METRES}m from the care address.
            Your clock-in will still be recorded but flagged for manager review.
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {phase === 'idle' || phase === 'acquiring_gps' ? (
          <>
            {!clockedIn && (
              <TouchableOpacity
                style={[styles.actionButton, styles.clockInButton, phase === 'acquiring_gps' && styles.disabledButton]}
                onPress={acquireGPS}
                disabled={phase === 'acquiring_gps'}
              >
                {phase === 'acquiring_gps' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>📍 Clock In</Text>
                )}
              </TouchableOpacity>
            )}
            {clockedIn && (
              <TouchableOpacity
                style={[styles.actionButton, styles.clockOutButton]}
                onPress={acquireGPS}
              >
                <Text style={styles.actionButtonText}>🔴 Clock Out</Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}

        {phase === 'confirming' && gpsCoords && (
          <View>
            <TouchableOpacity
              style={[styles.actionButton, clockedIn ? styles.clockOutButton : styles.clockInButton]}
              onPress={() => submitClockEvent(clockedIn ? ClockEventType.CLOCK_OUT : ClockEventType.CLOCK_IN)}
            >
              <Text style={styles.actionButtonText}>
                {clockedIn ? '✓ Confirm Clock Out' : '✓ Confirm Clock In'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => { setPhase('idle'); setGpsCoords(null); setDistanceMetres(null); }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'submitting' && (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="large" color="#4C1D95" />
            <Text style={styles.submittingText}>Recording visit...</Text>
          </View>
        )}
      </View>

      {/* Notes button — only after clock in */}
      {clockedIn && (
        <TouchableOpacity
          style={styles.notesButton}
          onPress={() => router.push({ pathname: '/(worker)/visit-notes', params: { shiftId: shift.id } })}
        >
          <Text style={styles.notesButtonText}>📝 Add Visit Notes</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  noShiftIcon: { fontSize: 48, marginBottom: 16 },
  noShiftTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  noShiftSub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  backButton: {
    marginTop: 20, backgroundColor: '#4C1D95', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10,
  },
  backButtonText: { color: '#FFFFFF', fontWeight: '600' },

  shiftCard: {
    backgroundColor: '#4C1D95', borderRadius: 16, padding: 20, marginBottom: 16,
  },
  shiftLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  serviceUserName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  shiftAddress: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 16 },
  shiftTimes: { flexDirection: 'row', alignItems: 'center' },
  shiftTime: { flex: 1, alignItems: 'center' },
  shiftTimeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  shiftTimeValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  shiftTimeDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    borderRadius: 10, marginBottom: 16,
  },
  statusBadgeIn: { backgroundColor: '#ECFDF5' },
  statusBadgeOut: { backgroundColor: '#F1F5F9' },
  statusDot: { fontSize: 14 },
  statusText: { fontSize: 14, fontWeight: '500', color: '#374151' },

  gpsInfo: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  gpsInfoTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10, textTransform: 'uppercase' },
  gpsInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gpsInfoLabel: { fontSize: 13, color: '#64748B' },
  gpsInfoValue: { fontSize: 13, fontWeight: '600', color: '#059669' },
  gpsInfoWarn: { color: '#D97706' },
  gpsInfoError: { color: '#DC2626' },

  warningBox: {
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D',
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 18 },

  actions: { gap: 12, marginBottom: 20 },
  actionButton: {
    borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  clockInButton: { backgroundColor: '#059669' },
  clockOutButton: { backgroundColor: '#DC2626' },
  cancelButton: { backgroundColor: '#F1F5F9', marginTop: 8 },
  disabledButton: { opacity: 0.7 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelButtonText: { color: '#64748B', fontSize: 15, fontWeight: '500' },

  submittingContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  submittingText: { color: '#64748B', fontSize: 14 },

  notesButton: {
    borderWidth: 1.5, borderColor: '#4C1D95', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  notesButtonText: { color: '#4C1D95', fontSize: 14, fontWeight: '600' },
});
