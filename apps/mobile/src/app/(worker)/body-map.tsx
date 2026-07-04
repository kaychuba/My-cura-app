import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../../services/api.client';
import { ServiceUserPicker, ServiceUserOption } from '../../components/ServiceUserPicker';

type BodyView = 'front' | 'back';

interface Marker {
  x: number; // 0-100 (% of outline width)
  y: number; // 0-100 (% of outline height)
  view: BodyView;
  type: string;
  note: string;
}

const MARKER_TYPES = [
  { value: 'bruise', label: 'Bruise', color: '#7C3AED' },
  { value: 'cut_or_graze', label: 'Cut / Graze', color: '#DC2626' },
  { value: 'pressure_sore', label: 'Pressure Sore', color: '#9F1239' },
  { value: 'rash', label: 'Rash', color: '#EA580C' },
  { value: 'swelling', label: 'Swelling', color: '#2563EB' },
  { value: 'burn', label: 'Burn', color: '#D97706' },
  { value: 'scratch', label: 'Scratch', color: '#DB2777' },
  { value: 'other', label: 'Other', color: '#64748B' },
];

const markerColor = (type: string) =>
  MARKER_TYPES.find((t) => t.value === type)?.color ?? '#64748B';
const markerLabel = (type: string) =>
  MARKER_TYPES.find((t) => t.value === type)?.label ?? type;

export default function BodyMapScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId?: string }>();
  const [serviceUser, setServiceUser] = useState<ServiceUserOption | null>(null);
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [pendingType, setPendingType] = useState('bruise');
  const [pendingNote, setPendingNote] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [outlineSize, setOutlineSize] = useState({ width: 0, height: 0 });

  const addPendingMarker = () => {
    if (!pending) return;
    setMarkers((prev) => [
      ...prev,
      { x: pending.x, y: pending.y, view: bodyView, type: pendingType, note: pendingNote.trim() },
    ]);
    setPending(null);
    setPendingNote('');
  };

  const removeMarker = (index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!serviceUser) return Alert.alert('Required', 'Please select the service user.');
    if (markers.length === 0) return Alert.alert('Required', 'Tap the body outline to mark at least one observation.');
    if (!summary.trim()) return Alert.alert('Required', 'Please add a short summary of what you observed.');

    setSubmitting(true);
    try {
      await apiClient.post('/body-maps', {
        serviceUserId: serviceUser.id,
        shiftId: shiftId || undefined,
        markers,
        summary: summary.trim(),
      });
      Alert.alert(
        'Body Map Saved',
        'Your observation has been recorded and is visible to the care team.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save the body map. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleMarkers = markers
    .map((m, index) => ({ ...m, index }))
    .filter((m) => m.view === bodyView);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          Record anything new you notice on the service user's body — bruises, marks,
          sores or swelling that weren't there before. Tap the outline where you saw it.
        </Text>
      </View>

      <ServiceUserPicker value={serviceUser} onChange={setServiceUser} />

      {/* Front / back toggle */}
      <View style={styles.viewToggle}>
        {(['front', 'back'] as BodyView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewToggleButton, bodyView === v && styles.viewToggleButtonActive]}
            onPress={() => { setBodyView(v); setPending(null); }}
          >
            <Text style={[styles.viewToggleText, bodyView === v && styles.viewToggleTextActive]}>
              {v === 'front' ? 'Front' : 'Back'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body outline */}
      <View style={styles.outlineCard}>
        <Pressable
          style={styles.outlineWrap}
          onLayout={(e) => setOutlineSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })}
          onPress={(e) => {
            if (!outlineSize.width || !outlineSize.height) return;
            const x = Math.round((e.nativeEvent.locationX / outlineSize.width) * 1000) / 10;
            const y = Math.round((e.nativeEvent.locationY / outlineSize.height) * 1000) / 10;
            if (x < 0 || x > 100 || y < 0 || y > 100) return;
            setPending({ x, y });
          }}
        >
          <BodyOutline />
          {visibleMarkers.map((m) => (
            <View
              key={m.index}
              pointerEvents="none"
              style={[
                styles.marker,
                { left: `${m.x}%`, top: `${m.y}%`, backgroundColor: markerColor(m.type) },
              ]}
            >
              <Text style={styles.markerNumber}>{m.index + 1}</Text>
            </View>
          ))}
          {pending && (
            <View
              pointerEvents="none"
              style={[styles.marker, styles.markerPending, { left: `${pending.x}%`, top: `${pending.y}%` }]}
            >
              <Text style={styles.markerNumber}>+</Text>
            </View>
          )}
        </Pressable>
        <Text style={styles.outlineHint}>
          {pending ? 'Now choose what you observed below' : `Viewing ${bodyView} — tap to place a marker`}
        </Text>
      </View>

      {/* Pending marker panel */}
      {pending && (
        <View style={styles.pendingPanel}>
          <Text style={styles.pendingTitle}>What did you observe?</Text>
          <View style={styles.typeWrap}>
            {MARKER_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeChip,
                  pendingType === t.value && { borderColor: t.color, backgroundColor: t.color + '15' },
                ]}
                onPress={() => setPendingType(t.value)}
              >
                <View style={[styles.typeDot, { backgroundColor: t.color }]} />
                <Text style={[styles.typeText, pendingType === t.value && { color: t.color, fontWeight: '600' }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.noteInput}
            value={pendingNote}
            onChangeText={setPendingNote}
            placeholder="Short note — e.g. approx 3cm, purple, service user unaware of cause"
          />
          <View style={styles.pendingActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPending(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={addPendingMarker}>
              <Text style={styles.addText}>Add Marker</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Marker list */}
      {markers.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.label}>Markers ({markers.length})</Text>
          {markers.map((m, i) => (
            <View key={i} style={styles.markerRow}>
              <View style={[styles.markerRowBadge, { backgroundColor: markerColor(m.type) }]}>
                <Text style={styles.markerNumber}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.markerRowTitle}>
                  {markerLabel(m.type)} · {m.view}
                </Text>
                {!!m.note && <Text style={styles.markerRowNote}>{m.note}</Text>}
              </View>
              <TouchableOpacity onPress={() => removeMarker(i)} hitSlop={10}>
                <Feather name="trash-2" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>Summary of observation *</Text>
      <TextInput
        style={styles.textarea}
        value={summary}
        onChangeText={setSummary}
        placeholder="Overall description — when you noticed it, what the service user said, any action taken."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Save Body Map</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/** Simple gender-neutral silhouette, viewBox 100x190. Same outline for front and back. */
function BodyOutline() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 190">
      <Circle cx="50" cy="15" r="11" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Rect x="45" y="25" width="10" height="8" rx="3" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Path
        d="M35 33 h30 q6 0 7 8 l3 42 q0 6 -6 6 h-38 q-6 0 -6 -6 l3 -42 q1 -8 7 -8 z"
        fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5"
      />
      <Rect x="17" y="36" width="9" height="54" rx="4.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Rect x="74" y="36" width="9" height="54" rx="4.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Rect x="34" y="89" width="32" height="16" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Rect x="35" y="103" width="13" height="80" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      <Rect x="52" y="103" width="13" height="80" rx="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  infoBanner: {
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  infoBannerText: { fontSize: 13, color: '#4C1D95', lineHeight: 19 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },

  viewToggle: {
    flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10,
    padding: 3, marginTop: 16,
  },
  viewToggleButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  viewToggleButtonActive: { backgroundColor: '#FFFFFF' },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  viewToggleTextActive: { color: '#4C1D95' },

  outlineCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  outlineWrap: { width: '60%', aspectRatio: 100 / 190 },
  outlineHint: { fontSize: 12, color: '#94A3B8', marginTop: 10 },

  marker: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    marginLeft: -11, marginTop: -11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2, elevation: 3,
  },
  markerPending: { backgroundColor: '#4C1D95' },
  markerNumber: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  pendingPanel: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 12,
    borderWidth: 1.5, borderColor: '#4C1D95',
  },
  pendingTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 18, paddingVertical: 7, paddingHorizontal: 12,
  },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  noteInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginTop: 12,
  },
  pendingActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  addButton: {
    flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#4C1D95',
  },
  addText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  markerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  markerRowBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  markerRowTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B', textTransform: 'capitalize' },
  markerRowNote: { fontSize: 12, color: '#64748B', marginTop: 2 },

  textarea: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A',
    minHeight: 100, textAlignVertical: 'top',
  },

  submitButton: {
    backgroundColor: '#4C1D95', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
