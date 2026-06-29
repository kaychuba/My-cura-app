import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import SignatureCanvas from 'react-native-signature-canvas';
import { apiClient } from '../../services/api.client';
import { MARStatus, MedicationRoute } from '@my-cura/shared-types';
import { formatDisplayTime } from '@my-cura/shared-utils';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  route: MedicationRoute;
  timesOfDay?: string[];
  isControlled: boolean;
  barcode?: string;
}

interface MARRecord {
  medicationId: string;
  status: MARStatus | null;
  barcodeVerified: boolean;
  signatureSvg: string | null;
  notes: string;
  reasonNotGiven: string;
}

export default function MARScreen() {
  const { serviceUserId, shiftId } = useLocalSearchParams<{ serviceUserId: string; shiftId: string }>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [records, setRecords] = useState<Map<string, MARRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanningFor, setScanningFor] = useState<string | null>(null);
  const [signingFor, setSigningFor] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const sigRef = useRef<SignatureCanvas>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ medications: Medication[] }>(
        `/mar/daily?serviceUserId=${serviceUserId}&date=${new Date().toISOString().split('T')[0]}`,
      );
      setMedications(data.medications);
      const initial = new Map<string, MARRecord>();
      for (const med of data.medications) {
        initial.set(med.id, {
          medicationId: med.id,
          status: null,
          barcodeVerified: false,
          signatureSvg: null,
          notes: '',
          reasonNotGiven: '',
        });
      }
      setRecords(initial);
    } catch {
      Alert.alert('Error', 'Could not load medications');
    } finally {
      setLoading(false);
    }
  }, [serviceUserId]);

  React.useEffect(() => { load(); }, [load]);

  const updateRecord = (medicationId: string, update: Partial<MARRecord>) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(medicationId) ?? {
        medicationId, status: null, barcodeVerified: false,
        signatureSvg: null, notes: '', reasonNotGiven: '',
      };
      next.set(medicationId, { ...existing, ...update });
      return next;
    });
  };

  const handleBarcodeScan = async (medicationId: string) => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    setScanningFor(medicationId);
  };

  const onBarcodeScanned = ({ data: scannedCode }: { data: string }) => {
    if (!scanningFor) return;
    const med = medications.find((m) => m.id === scanningFor);
    if (med?.barcode && med.barcode !== scannedCode) {
      Alert.alert('Barcode Mismatch', 'The scanned barcode does not match the expected medication.');
    } else {
      updateRecord(scanningFor, { barcodeVerified: true });
    }
    setScanningFor(null);
  };

  const handleSignature = (sig: string) => {
    if (!signingFor) return;
    updateRecord(signingFor, { signatureSvg: sig });
    setSigningFor(null);
  };

  const submitAll = async () => {
    const pending = Array.from(records.values()).filter((r) => r.status !== null);
    if (pending.length === 0) {
      Alert.alert('Nothing to Submit', 'Please record the status for at least one medication.');
      return;
    }

    const unsigned = pending.filter((r) => r.status === MARStatus.GIVEN && !r.signatureSvg);
    if (unsigned.length > 0) {
      Alert.alert('Signature Required', 'Please sign for all medications marked as given.');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        pending.map((r) =>
          apiClient.post('/mar/records', {
            medicationId: r.medicationId,
            serviceUserId,
            shiftId,
            scheduledAt: new Date().toISOString(),
            status: r.status,
            signatureSvg: r.signatureSvg,
            barcodeVerified: r.barcodeVerified,
            reasonNotGiven: r.status !== MARStatus.GIVEN ? r.reasonNotGiven : undefined,
            notes: r.notes || undefined,
          }),
        ),
      );
      Alert.alert('MAR Submitted', `${pending.length} medication record(s) saved successfully.`);
      load();
    } catch {
      Alert.alert('Error', 'Failed to submit MAR records. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Loading medications...</Text>
      </View>
    );
  }

  if (medications.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💊</Text>
        <Text style={styles.emptyTitle}>No medications</Text>
        <Text style={styles.emptySub}>No active medications for this service user.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {medications.map((med) => {
          const record = records.get(med.id);
          const isGiven = record?.status === MARStatus.GIVEN;
          const isNotGiven = record?.status && record.status !== MARStatus.GIVEN;

          return (
            <View key={med.id} style={styles.medCard}>
              {/* Header */}
              <View style={styles.medHeader}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>{med.dosage} · {med.route}</Text>
                  {med.isControlled && (
                    <View style={styles.cdBadge}>
                      <Text style={styles.cdText}>⚠️ Controlled Drug</Text>
                    </View>
                  )}
                </View>
                {med.barcode && (
                  <TouchableOpacity
                    style={[styles.scanButton, record?.barcodeVerified && styles.scanButtonDone]}
                    onPress={() => handleBarcodeScan(med.id)}
                  >
                    <Text style={styles.scanButtonText}>
                      {record?.barcodeVerified ? '✓ Scanned' : '📷 Scan'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status buttons */}
              <View style={styles.statusRow}>
                {[
                  { status: MARStatus.GIVEN, label: 'Given', color: '#059669' },
                  { status: MARStatus.REFUSED, label: 'Refused', color: '#DC2626' },
                  { status: MARStatus.OMITTED, label: 'Omitted', color: '#D97706' },
                  { status: MARStatus.PRN_NOT_REQUIRED, label: 'PRN N/R', color: '#6B7280' },
                ].map(({ status, label, color }) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      record?.status === status && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => updateRecord(med.id, { status })}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      record?.status === status && { color: '#FFFFFF' },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason if not given */}
              {isNotGiven && (
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Reason for not giving..."
                  value={record?.reasonNotGiven}
                  onChangeText={(t) => updateRecord(med.id, { reasonNotGiven: t })}
                  multiline
                />
              )}

              {/* Signature if given */}
              {isGiven && (
                <TouchableOpacity
                  style={[styles.signButton, record?.signatureSvg && styles.signButtonDone]}
                  onPress={() => setSigningFor(med.id)}
                >
                  <Text style={styles.signButtonText}>
                    {record?.signatureSvg ? '✓ Signed' : '✍️ Add Signature'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submitAll}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit MAR Records</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Barcode scanner modal */}
      <Modal visible={!!scanningFor} animationType="slide" onRequestClose={() => setScanningFor(null)}>
        <View style={styles.flex}>
          {cameraPermission?.granted ? (
            <CameraView
              style={styles.flex}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'datamatrix'] }}
              onBarcodeScanned={onBarcodeScanned}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanInstructions}>Align barcode within the frame</Text>
                <TouchableOpacity style={styles.cancelScanButton} onPress={() => setScanningFor(null)}>
                  <Text style={styles.cancelScanText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={styles.centered}>
              <Text>Camera permission required</Text>
              <TouchableOpacity onPress={requestCameraPermission} style={styles.submitButton}>
                <Text style={styles.submitText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Signature modal */}
      <Modal visible={!!signingFor} animationType="slide" onRequestClose={() => setSigningFor(null)}>
        <View style={styles.flex}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>Care Worker Signature</Text>
            <TouchableOpacity onPress={() => { sigRef.current?.clearSignature(); }}>
              <Text style={styles.sigClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          <SignatureCanvas
            ref={sigRef}
            onOK={handleSignature}
            onEmpty={() => Alert.alert('Signature Required', 'Please sign before confirming.')}
            descriptionText="Sign here"
            clearText="Clear"
            confirmText="Confirm"
            style={{ flex: 1 }}
            webStyle=".m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--footer { background-color: #1E3A5F; }"
          />
          <TouchableOpacity style={styles.cancelSigButton} onPress={() => setSigningFor(null)}>
            <Text style={styles.cancelSigText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748B' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

  medCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 6, elevation: 2,
  },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  medDetail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cdBadge: {
    backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6,
  },
  cdText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  scanButton: {
    backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, marginLeft: 10,
  },
  scanButtonDone: { backgroundColor: '#ECFDF5' },
  scanButtonText: { fontSize: 12, fontWeight: '600', color: '#1E3A5F' },

  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statusButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  statusButtonText: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  reasonInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, padding: 10, fontSize: 13, marginTop: 8, minHeight: 60,
    textAlignVertical: 'top',
  },
  signButton: {
    borderWidth: 1.5, borderColor: '#1E3A5F', borderRadius: 8, paddingVertical: 10,
    alignItems: 'center', marginTop: 8, borderStyle: 'dashed',
  },
  signButtonDone: { backgroundColor: '#ECFDF5', borderColor: '#059669', borderStyle: 'solid' },
  signButtonText: { fontSize: 13, color: '#1E3A5F', fontWeight: '600' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', padding: 16,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 240, height: 160, borderWidth: 2, borderColor: '#FFFFFF',
    borderRadius: 12, marginBottom: 20,
  },
  scanInstructions: { color: '#FFFFFF', fontSize: 14, marginBottom: 20 },
  cancelScanButton: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 10,
  },
  cancelScanText: { color: '#FFFFFF', fontWeight: '600' },

  sigHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  sigTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  sigClear: { color: '#DC2626', fontWeight: '600' },
  cancelSigButton: {
    margin: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelSigText: { color: '#64748B', fontWeight: '600' },
});
