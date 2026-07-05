import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { MARStatus } from '@my-cura/shared-types';
import { ServiceUserPicker, ServiceUserOption } from '../../components/ServiceUserPicker';
import { colors } from '../../theme';

interface Medication {
  id: string;
  name: string;
  purpose?: string;
  dosage: string;
  quantity?: string;
  formulation?: string;
  route: string;
  isControlled: boolean;
  isPrn?: boolean;
  prnInstructions?: string;
}

interface MARRecord {
  id: string;
  medicationId: string;
  scheduledAt: string;
  administeredAt?: string;
  recordedAt?: string;
  status: MARStatus;
  initials?: string;
  witnessInitials?: string;
  reasonNotGiven?: string;
  notes?: string;
}

/** The outcomes a carer can record, in display order. */
const OUTCOMES: { status: MARStatus; label: string; color: string }[] = [
  { status: MARStatus.GIVEN, label: 'Administered', color: '#059669' },
  { status: MARStatus.PARENT_ADMINISTERED, label: 'Parent Administered', color: '#0D9488' },
  { status: MARStatus.REFUSED, label: 'Refused', color: '#DC2626' },
  { status: MARStatus.NOT_ADMINISTERED, label: 'Not Administered', color: '#D97706' },
  { status: MARStatus.OTHER, label: 'Other', color: '#7C3AED' },
];

const OUTCOME_META = Object.fromEntries(OUTCOMES.map((o) => [o.status, o]));

export default function MARScreen() {
  const params = useLocalSearchParams<{ serviceUserId?: string }>();
  const { user } = useAuthStore();
  const [pickedSU, setPickedSU] = useState<ServiceUserOption | null>(null);
  const serviceUserId = params.serviceUserId ?? pickedSU?.id;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [records, setRecords] = useState<MARRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<MARRecord | null>(null);
  const [prnRecording, setPrnRecording] = useState<Medication | null>(null);

  const load = useCallback(async () => {
    if (!serviceUserId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ medications: Medication[]; records: MARRecord[] }>(
        `/mar/daily?serviceUserId=${serviceUserId}&date=${new Date().toISOString().split('T')[0]}`,
      );
      setMedications(data.medications);
      setRecords(data.records);
    } catch {
      Alert.alert('Error', 'Could not load the MAR chart');
    } finally {
      setLoading(false);
    }
  }, [serviceUserId]);

  useEffect(() => { load(); }, [load]);

  const medById = useMemo(
    () => new Map(medications.map((m) => [m.id, m])),
    [medications],
  );
  const due = records
    .filter((r) => r.status === MARStatus.SCHEDULED)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const completed = records
    .filter((r) => r.status !== MARStatus.SCHEDULED)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  if (!serviceUserId) {
    return (
      <View style={styles.pickerWrap}>
        <Text style={styles.pickerHint}>
          Choose who you are giving medication to:
        </Text>
        <ServiceUserPicker value={pickedSU} onChange={setPickedSU} />
      </View>
    );
  }

  if (loading && medications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading MAR chart...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* ── Medication table (all values set by the admin) ── */}
      <Text style={styles.sectionTitle}>Medication Chart</Text>
      {medications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active medications for this service user.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.th, styles.colName]}>Medication</Text>
              <Text style={[styles.th, styles.colPurpose]}>Function</Text>
              <Text style={[styles.th, styles.colSmall]}>Dose</Text>
              <Text style={[styles.th, styles.colSmall]}>Quantity</Text>
              <Text style={[styles.th, styles.colSmall]}>Formulation</Text>
              <Text style={[styles.th, styles.colSmall]}>Route</Text>
            </View>
            {medications.map((m, i) => (
              <View key={m.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <View style={styles.colName}>
                  <Text style={styles.tdName}>{m.name}</Text>
                  {m.isControlled && <Text style={styles.cdTag}>Controlled drug</Text>}
                  {m.isPrn && <Text style={styles.prnTag}>PRN — as needed</Text>}
                </View>
                <Text style={[styles.td, styles.colPurpose]}>{m.purpose ?? '—'}</Text>
                <Text style={[styles.td, styles.colSmall]}>{m.dosage}</Text>
                <Text style={[styles.td, styles.colSmall]}>{m.quantity ?? '—'}</Text>
                <Text style={[styles.td, styles.colSmall, styles.capitalize]}>{m.formulation ?? '—'}</Text>
                <Text style={[styles.td, styles.colSmall, styles.capitalize]}>{m.route}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── PRN medication (give when needed — only shown when the admin set any) ── */}
      {medications.some((m) => m.isPrn) && (
        <>
          <Text style={styles.sectionTitle}>PRN — Give When Needed</Text>
          <Text style={styles.sectionSub}>
            Ongoing as-needed medication set by your manager. Record each time you give it.
          </Text>
          {medications.filter((m) => m.isPrn).map((m) => (
            <View key={m.id} style={styles.prnCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dueMedName}>{m.name}</Text>
                <Text style={styles.dueMedDetail}>
                  {[m.dosage, m.quantity, m.formulation].filter(Boolean).join(' · ')}
                </Text>
                {!!m.prnInstructions && (
                  <Text style={styles.prnInstructions}>{m.prnInstructions}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.recordButton}
                activeOpacity={0.8}
                onPress={() => setPrnRecording(m)}
              >
                <Text style={styles.recordButtonText}>Record</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* ── Due today (admin-scheduled doses awaiting the carer) ── */}
      <Text style={styles.sectionTitle}>Due Today</Text>
      <Text style={styles.sectionSub}>Times set by your manager — tap a dose to record it.</Text>
      {due.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="check-circle" size={20} color={colors.success} />
          <Text style={styles.emptyText}>
            Nothing waiting. Doses appear here when your manager schedules them.
          </Text>
        </View>
      ) : (
        due.map((r) => {
          const med = medById.get(r.medicationId);
          return (
            <TouchableOpacity
              key={r.id}
              style={styles.dueCard}
              onPress={() => setRecording(r)}
              activeOpacity={0.75}
            >
              <View style={styles.dueTimeBox}>
                <Text style={styles.dueTime}>{format(parseISO(r.scheduledAt), 'HH:mm')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dueMedName}>{med?.name ?? 'Medication'}</Text>
                <Text style={styles.dueMedDetail}>
                  {[med?.dosage, med?.quantity, med?.formulation].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.recordButton}>
                <Text style={styles.recordButtonText}>Record</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* ── Completed today (initials + both timestamps) ── */}
      {completed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Completed Today</Text>
          {completed.map((r) => {
            const med = medById.get(r.medicationId);
            const meta = OUTCOME_META[r.status];
            return (
              <View key={r.id} style={styles.doneCard}>
                <View style={styles.doneHeader}>
                  <Text style={styles.doneMedName}>{med?.name ?? 'Medication'}</Text>
                  <View style={[styles.outcomeBadge, { backgroundColor: (meta?.color ?? colors.textMuted) + '22' }]}>
                    <Text style={[styles.outcomeBadgeText, { color: meta?.color ?? colors.textMuted }]}>
                      {meta?.label ?? r.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.doneMetaRow}>
                  <Feather name="clock" size={13} color={colors.textSecondary} />
                  <Text style={styles.doneMeta}>
                    Due {format(parseISO(r.scheduledAt), 'HH:mm')}
                    {r.administeredAt ? ` · Completed ${format(parseISO(r.administeredAt), 'HH:mm')}` : ''}
                  </Text>
                </View>
                {!!r.recordedAt && (
                  <View style={styles.doneMetaRow}>
                    <Feather name="check" size={13} color={colors.textSecondary} />
                    <Text style={styles.doneMeta}>
                      Recorded {format(parseISO(r.recordedAt), 'HH:mm, d MMM')}
                    </Text>
                  </View>
                )}
                {!!r.initials && (
                  <View style={styles.doneMetaRow}>
                    <Feather name="edit-2" size={13} color={colors.textSecondary} />
                    <Text style={styles.doneMeta}>
                      Signed {r.initials}
                      {r.witnessInitials ? ` · Witness ${r.witnessInitials}` : ''}
                    </Text>
                  </View>
                )}
                {!!r.reasonNotGiven && (
                  <Text style={styles.doneReason}>Reason: {r.reasonNotGiven}</Text>
                )}
              </View>
            );
          })}
        </>
      )}

      <RecordDoseModal
        record={recording}
        medication={
          prnRecording ?? (recording ? medById.get(recording.medicationId) : undefined)
        }
        prn={!!prnRecording}
        defaultInitials={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()}
        onClose={() => { setRecording(null); setPrnRecording(null); }}
        onSaved={() => { setRecording(null); setPrnRecording(null); load(); }}
      />
    </ScrollView>
  );
}

/** Compact dependency-free time picker: chevrons step hours / 5-minute blocks. */
function TimeCompletedPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const step = (unit: 'h' | 'm', delta: number) => {
    const next = new Date(value);
    if (unit === 'h') next.setHours(next.getHours() + delta);
    else next.setMinutes(next.getMinutes() + delta);
    onChange(next);
  };

  return (
    <View style={styles.timePicker}>
      <View style={styles.timeUnit}>
        <TouchableOpacity onPress={() => step('h', 1)} hitSlop={8}>
          <Feather name="chevron-up" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.timeDigits}>{format(value, 'HH')}</Text>
        <TouchableOpacity onPress={() => step('h', -1)} hitSlop={8}>
          <Feather name="chevron-down" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.timeColon}>:</Text>
      <View style={styles.timeUnit}>
        <TouchableOpacity onPress={() => step('m', 5)} hitSlop={8}>
          <Feather name="chevron-up" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.timeDigits}>{format(value, 'mm')}</Text>
        <TouchableOpacity onPress={() => step('m', -5)} hitSlop={8}>
          <Feather name="chevron-down" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.nowButton} onPress={() => onChange(new Date())}>
        <Text style={styles.nowButtonText}>Now</Text>
      </TouchableOpacity>
    </View>
  );
}

function RecordDoseModal({ record, medication, prn, defaultInitials, onClose, onSaved }: {
  record: MARRecord | null;
  medication?: Medication;
  prn?: boolean;
  defaultInitials: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<MARStatus | null>(null);
  const [timeCompleted, setTimeCompleted] = useState(new Date());
  const [initials, setInitials] = useState(defaultInitials);
  const [witnessInitials, setWitnessInitials] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const open = !!record || (prn && !!medication);

  useEffect(() => {
    if (open) {
      setOutcome(null);
      setTimeCompleted(new Date());
      setInitials(defaultInitials);
      setWitnessInitials('');
      setReason('');
    }
  }, [open, record, medication, defaultInitials]);

  if (!open) return null;

  const needsWitness = !!medication?.isControlled && outcome === MARStatus.GIVEN;
  const isOther = outcome === MARStatus.OTHER;
  const showOptionalReason =
    outcome === MARStatus.REFUSED || outcome === MARStatus.NOT_ADMINISTERED;

  const save = async () => {
    if (!outcome) {
      Alert.alert('Select an outcome', 'Please choose what happened with this dose.');
      return;
    }
    if (!initials.trim()) {
      Alert.alert('Initials required', 'Enter your initials as your signature.');
      return;
    }
    if (isOther && !reason.trim()) {
      Alert.alert('Reason required', 'Please state the reason when selecting Other.');
      return;
    }
    if (needsWitness && !witnessInitials.trim()) {
      Alert.alert('Witness required', 'A controlled drug needs witness initials.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: outcome,
        timeCompleted: timeCompleted.toISOString(),
        initials: initials.trim(),
        reason: reason.trim() || undefined,
        witnessInitials: needsWitness ? witnessInitials.trim() : undefined,
      };
      if (prn && medication) {
        await apiClient.post(`/mar/prn/${medication.id}`, payload);
      } else if (record) {
        await apiClient.patch(`/mar/records/${record.id}/administer`, payload);
      }
      Alert.alert('Recorded', 'The dose has been recorded on the MAR chart.');
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{medication?.name ?? 'Record dose'}</Text>
            <Text style={styles.modalSub}>
              {prn
                ? `PRN (as needed)${medication ? ` · ${[medication.dosage, medication.quantity].filter(Boolean).join(' · ')}` : ''}`
                : `Due ${format(parseISO(record!.scheduledAt), 'HH:mm, EEE d MMM')}${
                    medication ? ` · ${[medication.dosage, medication.quantity].filter(Boolean).join(' · ')}` : ''
                  }`}
            </Text>
            {prn && !!medication?.prnInstructions && (
              <Text style={styles.prnModalNote}>{medication.prnInstructions}</Text>
            )}

            <Text style={styles.fieldLabel}>Outcome</Text>
            <View style={styles.outcomeWrap}>
              {OUTCOMES.map((o) => (
                <TouchableOpacity
                  key={o.status}
                  style={[
                    styles.outcomeChip,
                    outcome === o.status && { backgroundColor: o.color, borderColor: o.color },
                  ]}
                  onPress={() => setOutcome(o.status)}
                >
                  <Text style={[styles.outcomeChipText, outcome === o.status && { color: '#FFFFFF' }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isOther && (
              <>
                <Text style={styles.fieldLabel}>Reason *</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Please state the reason..."
                  placeholderTextColor={colors.textMuted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
              </>
            )}
            {showOptionalReason && (
              <>
                <Text style={styles.fieldLabel}>Reason (optional)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Add any context..."
                  placeholderTextColor={colors.textMuted}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Time completed</Text>
            <TimeCompletedPicker value={timeCompleted} onChange={setTimeCompleted} />

            <Text style={styles.fieldLabel}>Your initials (signature) *</Text>
            <TextInput
              style={styles.initialsInput}
              value={initials}
              onChangeText={(t) => setInitials(t.toUpperCase())}
              maxLength={4}
              autoCapitalize="characters"
              placeholder="e.g. SJ"
              placeholderTextColor={colors.textMuted}
            />

            {needsWitness && (
              <>
                <Text style={styles.fieldLabel}>Witness initials (controlled drug) *</Text>
                <TextInput
                  style={styles.initialsInput}
                  value={witnessInitials}
                  onChangeText={(t) => setWitnessInitials(t.toUpperCase())}
                  maxLength={4}
                  autoCapitalize="characters"
                  placeholder="e.g. MR"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveButtonText}>Save to MAR Chart</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  pickerWrap: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 32 },
  pickerHint: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 18, marginBottom: 6 },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 18,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  tableScroll: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  tableHeader: { backgroundColor: colors.primaryTint, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  tableRowAlt: { backgroundColor: colors.background },
  th: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  td: { fontSize: 13, color: colors.textPrimary },
  tdName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  capitalize: { textTransform: 'capitalize' },
  cdTag: { fontSize: 10, fontWeight: '700', color: colors.danger, marginTop: 2 },
  prnTag: { fontSize: 10, fontWeight: '700', color: colors.primaryLight, marginTop: 2 },
  prnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primaryTint, borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.primaryBorder,
  },
  prnInstructions: { fontSize: 12, color: colors.primary, marginTop: 4, fontStyle: 'italic' },
  prnModalNote: {
    fontSize: 13, color: colors.primary, backgroundColor: colors.primaryTint,
    borderRadius: 8, padding: 10, marginTop: 8, fontStyle: 'italic',
  },
  colName: { width: 120, paddingRight: 8 },
  colPurpose: { width: 170, paddingRight: 8 },
  colSmall: { width: 92, paddingRight: 8 },

  dueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
  },
  dueTimeBox: {
    backgroundColor: colors.primaryTint, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center',
  },
  dueTime: { fontSize: 15, fontWeight: '700', color: colors.primary },
  dueMedName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  dueMedDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  recordButton: {
    backgroundColor: colors.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  recordButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  doneCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  doneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doneMedName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  outcomeBadgeText: { fontSize: 11, fontWeight: '700' },
  doneMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  doneMeta: { fontSize: 12, color: colors.textSecondary },
  doneReason: { fontSize: 12, color: colors.textPrimary, marginTop: 8, fontStyle: 'italic' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10, maxHeight: '90%',
  },
  modalHandle: {
    alignSelf: 'center', width: 42, height: 5, borderRadius: 3,
    backgroundColor: colors.border, marginBottom: 12,
  },
  modalTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3, marginBottom: 6, textTransform: 'capitalize' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  outcomeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outcomeChip: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.surface,
  },
  outcomeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  reasonInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 14, minHeight: 70,
    textAlignVertical: 'top', color: colors.textPrimary,
  },

  timePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 10,
  },
  timeUnit: { alignItems: 'center', gap: 2 },
  timeDigits: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, minWidth: 44, textAlign: 'center' },
  timeColon: { fontSize: 28, fontWeight: '700', color: colors.textMuted },
  nowButton: {
    marginLeft: 12, backgroundColor: colors.primaryTint, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  nowButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  initialsInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700',
    letterSpacing: 2, color: colors.textPrimary, width: 120, textAlign: 'center',
  },

  saveButton: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 22,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 14 },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
