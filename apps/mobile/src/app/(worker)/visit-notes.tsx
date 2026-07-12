import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { enqueue, isNetworkError, cacheSet, cacheGet } from '../../services/offline';
import { ServiceUserPicker, ServiceUserOption } from '../../components/ServiceUserPicker';
import { SwipeableSheet } from '../../components/SwipeableSheet';
import { colors } from '../../theme';

type CareExecution = 'executed' | 'partially_executed' | 'not_executed' | 'other';

interface CareDocEntry {
  id: string;
  slotAt: string;
  documentation: string;
  execution: CareExecution;
  reason: string;
  createdAt: string;
}

interface CareDocSlot {
  slotAt: string;
  entry: CareDocEntry | null;
}

interface CareDocSheet {
  serviceUser: { id: string; firstName: string; lastName: string };
  allocatedHours: number;
  careDayStart: string;
  slots: CareDocSlot[];
}

/** Execution options, colour-coded exactly as specified. */
const EXECUTIONS: { value: CareExecution; label: string; color: string; reasons: { value: string; label: string }[] }[] = [
  {
    value: 'executed', label: 'Executed', color: '#059669',
    reasons: [
      { value: 'fully_executed', label: 'Fully executed' },
      { value: 'adequate', label: 'Adequate' },
      { value: 'satisfactory', label: 'Satisfactory' },
      { value: 'insufficient', label: 'Insufficient' },
    ],
  },
  {
    value: 'partially_executed', label: 'Partially Executed', color: '#D97706',
    reasons: [{ value: 'partially_executed', label: 'Partially executed' }],
  },
  {
    value: 'not_executed', label: 'Not Executed', color: '#DC2626',
    reasons: [
      { value: 'refused', label: 'Refused' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    value: 'other', label: 'Other', color: '#7C3AED',
    reasons: [{ value: 'not_required', label: 'Not required' }],
  },
];

const EXECUTION_META = Object.fromEntries(EXECUTIONS.map((e) => [e.value, e]));

/** Slot timing state: green when saved, orange within the due window
 *  (15 min before the hour until 3 h after), red once 3 h have passed. */
function slotState(slot: CareDocSlot, now: Date): 'done' | 'due' | 'missed' | 'upcoming' {
  if (slot.entry) return 'done';
  const t = parseISO(slot.slotAt).getTime();
  const n = now.getTime();
  if (n < t - 15 * 60 * 1000) return 'upcoming';
  if (n <= t + 3 * 60 * 60 * 1000) return 'due';
  return 'missed';
}

const STATE_STYLE: Record<string, { color: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  done: { color: '#059669', label: 'Done', icon: 'check-circle' },
  due: { color: '#D97706', label: 'Due', icon: 'clock' },
  missed: { color: '#DC2626', label: 'Missed', icon: 'alert-circle' },
  upcoming: { color: '#94A3B8', label: 'Upcoming', icon: 'circle' },
};

export default function CareNotesScreen() {
  const [pickedSU, setPickedSU] = useState<ServiceUserOption | null>(null);
  const [sheet, setSheet] = useState<CareDocSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [documenting, setDocumenting] = useState<CareDocSlot | null>(null);
  const [now, setNow] = useState(new Date());

  // Re-evaluate slot colours every minute so due/missed transitions happen live
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!pickedSU) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<CareDocSheet>(
        `/visit-notes/care-doc?serviceUserId=${pickedSU.id}`,
      );
      setSheet(data);
      cacheSet(`caredoc.${pickedSU.id}`, data);
    } catch (e) {
      const cached = await cacheGet<CareDocSheet>(`caredoc.${pickedSU.id}`);
      if (cached) {
        setSheet(cached);
        if (isNetworkError(e)) Alert.alert('Offline', 'Showing the last saved copy — entries will sync when signal returns.');
      } else {
        Alert.alert('Error', 'Could not load the care documentation sheet');
      }
    } finally {
      setLoading(false);
    }
  }, [pickedSU]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doneCount = sheet?.slots.filter((s) => s.entry).length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <ServiceUserPicker value={pickedSU} onChange={setPickedSU} label="Service User" />

      {!pickedSU ? (
        <View style={styles.emptyCard}>
          <Feather name="file-text" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Choose who you are caring for to open their hourly care documentation.
          </Text>
        </View>
      ) : loading && !sheet ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : sheet && sheet.allocatedHours === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="clock" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            No care hours have been allocated for {sheet.serviceUser.firstName} yet — your manager
            sets these on the admin portal.
          </Text>
        </View>
      ) : sheet ? (
        <>
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>
                Today's Care Documentation
              </Text>
              <TouchableOpacity
                hitSlop={10}
                onPress={() =>
                  router.push({ pathname: '/(worker)/su-profile', params: { serviceUserId: sheet.serviceUser.id } })
                }
              >
                <Feather name="info" size={19} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSub}>
              {sheet.serviceUser.firstName} {sheet.serviceUser.lastName} ·{' '}
              {sheet.allocatedHours} hours allocated from {sheet.careDayStart} ·{' '}
              {doneCount}/{sheet.allocatedHours} documented
            </Text>
            <View style={styles.legendRow}>
              {(['done', 'due', 'missed', 'upcoming'] as const).map((s) => (
                <View key={s} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: STATE_STYLE[s].color }]} />
                  <Text style={styles.legendLabel}>{STATE_STYLE[s].label}</Text>
                </View>
              ))}
            </View>
          </View>

          {sheet.slots.map((slot) => {
            const state = slotState(slot, now);
            const st = STATE_STYLE[state];
            const execMeta = slot.entry ? EXECUTION_META[slot.entry.execution] : null;
            return (
              <TouchableOpacity
                key={slot.slotAt}
                style={[styles.slotCard, { borderLeftColor: st.color }]}
                activeOpacity={slot.entry ? 1 : 0.75}
                onPress={() => { if (!slot.entry) setDocumenting(slot); }}
              >
                <View style={[styles.slotTimeBox, { backgroundColor: st.color + '18' }]}>
                  <Text style={[styles.slotTime, { color: st.color }]}>
                    {format(parseISO(slot.slotAt), 'HH:mm')}
                  </Text>
                  <Feather name={st.icon} size={13} color={st.color} />
                </View>
                <View style={{ flex: 1 }}>
                  {slot.entry ? (
                    <>
                      <View style={styles.entryTopRow}>
                        <View style={[styles.execBadge, { backgroundColor: (execMeta?.color ?? '#64748B') + '22' }]}>
                          <Text style={[styles.execBadgeText, { color: execMeta?.color ?? '#64748B' }]}>
                            {execMeta?.label ?? slot.entry.execution}
                          </Text>
                        </View>
                        <Text style={styles.entryReason}>
                          {execMeta?.reasons.find((r) => r.value === slot.entry!.reason)?.label ?? slot.entry.reason}
                        </Text>
                      </View>
                      <Text style={styles.entryText} numberOfLines={3}>{slot.entry.documentation}</Text>
                      <Text style={styles.entrySaved}>
                        Saved {format(parseISO(slot.entry.createdAt), 'HH:mm')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.slotStateLabel, { color: st.color }]}>{st.label}</Text>
                      <Text style={styles.slotHint}>
                        {state === 'upcoming'
                          ? 'Documentation opens 15 minutes before the hour'
                          : 'Tap to write this hour’s care documentation'}
                      </Text>
                    </>
                  )}
                </View>
                {!slot.entry && <Feather name="chevron-right" size={18} color={colors.textMuted} style={{ alignSelf: 'center' }} />}
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      <DocumentHourSheet
        slot={documenting}
        serviceUserName={sheet ? `${sheet.serviceUser.firstName} ${sheet.serviceUser.lastName}` : ''}
        serviceUserId={pickedSU?.id}
        onClose={() => setDocumenting(null)}
        onSaved={() => { setDocumenting(null); load(); }}
        onSavedOffline={(p) => {
          setSheet((prev) => prev ? {
            ...prev,
            slots: prev.slots.map((sl) => sl.slotAt === p.slotAt
              ? { ...sl, entry: { id: `offline-${Date.now()}`, slotAt: p.slotAt, documentation: p.documentation, execution: p.execution, reason: p.reason, createdAt: new Date().toISOString() } }
              : sl),
          } : prev);
          setDocumenting(null);
        }}
      />
    </ScrollView>
  );
}

function DocumentHourSheet({ slot, serviceUserName, serviceUserId, onClose, onSaved, onSavedOffline }: {
  slot: CareDocSlot | null;
  serviceUserName: string;
  serviceUserId?: string;
  onClose: () => void;
  onSaved: () => void;
  onSavedOffline?: (p: { slotAt: string; documentation: string; execution: CareExecution; reason: string }) => void;
}) {
  const [documentation, setDocumentation] = useState('');
  const [execution, setExecution] = useState<CareExecution | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slot) {
      setDocumentation('');
      setExecution(null);
      setReason(null);
    }
  }, [slot]);

  if (!slot || !serviceUserId) return null;

  const selected = execution ? EXECUTION_META[execution] : null;

  const pickExecution = (value: CareExecution) => {
    setExecution(value);
    const meta = EXECUTION_META[value];
    // Single-option dropdowns pre-select themselves
    setReason(meta.reasons.length === 1 ? meta.reasons[0].value : null);
  };

  const save = async () => {
    if (!documentation.trim()) {
      Alert.alert('Documentation required', 'Please write what care was provided this hour.');
      return;
    }
    if (!execution) {
      Alert.alert('Select an option', 'Was the care executed, partially executed, not executed, or other?');
      return;
    }
    if (!reason) {
      Alert.alert('Select a reason', 'Please choose a reason from the dropdown.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        serviceUserId,
        slotAt: slot.slotAt,
        documentation: documentation.trim(),
        execution,
        reason,
      };
      await apiClient.post('/visit-notes/care-doc', payload);
      Alert.alert('Saved', 'This hour is now documented.');
      onSaved();
    } catch (e: unknown) {
      if (isNetworkError(e)) {
        await enqueue({
          method: 'post',
          url: '/visit-notes/care-doc',
          body: {
            serviceUserId, slotAt: slot.slotAt,
            documentation: documentation.trim(), execution, reason,
          },
          label: 'Care note',
        });
        Alert.alert('Saved offline', 'No signal — this entry is stored on the phone and will sync automatically.');
        onSavedOffline?.({ slotAt: slot.slotAt, documentation: documentation.trim(), execution: execution!, reason: reason! });
        return;
      }
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SwipeableSheet visible onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetBody}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>
              {format(parseISO(slot.slotAt), 'HH:mm')} — {serviceUserName}
            </Text>
            <Text style={styles.sheetSub}>Care documentation for this hour</Text>

            <Text style={styles.fieldLabel}>What care was provided? *</Text>
            <TextInput
              style={styles.textarea}
              value={documentation}
              onChangeText={setDocumentation}
              placeholder="Describe the care given this hour — tasks, observations, wellbeing..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>The care was *</Text>
            <View style={styles.execWrap}>
              {EXECUTIONS.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[
                    styles.execChip,
                    execution === e.value && { backgroundColor: e.color, borderColor: e.color },
                  ]}
                  onPress={() => pickExecution(e.value)}
                >
                  <Text style={[styles.execChipText, execution === e.value && { color: '#FFFFFF' }]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selected && (
              <>
                <Text style={styles.fieldLabel}>Reason *</Text>
                <View style={styles.reasonList}>
                  {selected.reasons.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.reasonRow, reason === r.value && { backgroundColor: selected.color + '15' }]}
                      onPress={() => setReason(r.value)}
                    >
                      <Feather
                        name={reason === r.value ? 'check-circle' : 'circle'}
                        size={17}
                        color={reason === r.value ? selected.color : colors.textMuted}
                      />
                      <Text style={[styles.reasonLabel, reason === r.value && { color: selected.color, fontWeight: '700' }]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.saveButton, selected && { backgroundColor: selected.color }, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveButtonText}>Save Documentation</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SwipeableSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 24, marginTop: 16,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  headerCard: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
    marginTop: 16, marginBottom: 12,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 17 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  slotCard: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.surface,
    borderRadius: 12, padding: 12, marginBottom: 10,
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border,
  },
  slotTimeBox: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 62,
  },
  slotTime: { fontSize: 15, fontWeight: '700' },
  slotStateLabel: { fontSize: 13, fontWeight: '700' },
  slotHint: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },

  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  execBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  execBadgeText: { fontSize: 11, fontWeight: '700' },
  entryReason: { fontSize: 12, color: colors.textSecondary },
  entryText: { fontSize: 13, color: colors.textPrimary, marginTop: 6, lineHeight: 18 },
  entrySaved: { fontSize: 11, color: colors.textMuted, marginTop: 5 },

  sheetBody: { paddingHorizontal: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  textarea: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: colors.textPrimary,
    minHeight: 110, textAlignVertical: 'top',
  },

  execWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  execChip: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface,
  },
  execChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  reasonList: {
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  reasonLabel: { fontSize: 14, color: colors.textPrimary },

  saveButton: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 22,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
