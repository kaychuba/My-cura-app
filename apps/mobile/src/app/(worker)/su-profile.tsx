import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Linking, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../services/api.client';
import { colors } from '../../theme';

interface ServiceUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  conditionSummary?: string;
  photoUrl?: string;
  careCommencedOn?: string;
  careHoursPerDay?: number;
  careDayStart?: string;
  address?: { line1: string; line2?: string; city: string; postcode: string };
  contactDetails?: { phone?: string; email?: string };
  emergencyContacts?: { name: string; relationship: string; phone: string }[];
  hospitalContact?: { name: string; phone?: string; ward?: string };
  pharmacyContact?: { name: string; phone?: string; address?: string };
  allergies?: string[];
  medicalConditions?: string[];
}

function age(dob: string): number {
  const b = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

export default function ServiceUserProfileScreen() {
  const { serviceUserId } = useLocalSearchParams<{ serviceUserId: string }>();
  const [su, setSu] = useState<ServiceUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceUserId) { setLoading(false); return; }
    apiClient
      .get<ServiceUserProfile>(`/service-users/${serviceUserId}`)
      .then(({ data }) => setSu(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceUserId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!su) {
    return (
      <View style={styles.centered}>
        <Feather name="user-x" size={32} color={colors.textMuted} />
        <Text style={styles.emptyText}>Profile not available</Text>
      </View>
    );
  }

  const call = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Identity */}
      <View style={styles.headerCard}>
        {su.photoUrl ? (
          <Image source={{ uri: su.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{su.firstName?.[0]}{su.lastName?.[0]}</Text>
          </View>
        )}
        <Text style={styles.name}>{su.firstName} {su.lastName}</Text>
        <Text style={styles.meta}>
          {su.dateOfBirth ? `${age(su.dateOfBirth)} years` : ''}
          {su.gender ? ` · ${su.gender.replace(/_/g, ' ')}` : ''}
          {su.careCommencedOn
            ? ` · care since ${new Date(su.careCommencedOn).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
            : ''}
        </Text>
        {!!su.careHoursPerDay && (
          <Text style={styles.metaSmall}>
            {su.careHoursPerDay} care hours/day from {su.careDayStart ?? '08:00'}
          </Text>
        )}
      </View>

      {/* Condition */}
      {!!su.conditionSummary && (
        <Card icon="heart" title="Why they need care">
          <Text style={styles.body}>{su.conditionSummary}</Text>
        </Card>
      )}

      {/* Allergies — safety critical, keep prominent */}
      {(su.allergies?.length ?? 0) > 0 && (
        <Card icon="alert-triangle" title="Allergies" tone="danger">
          <Text style={[styles.body, { color: colors.danger, fontWeight: '600' }]}>
            {su.allergies!.join(' · ')}
          </Text>
        </Card>
      )}

      {/* Address */}
      {!!su.address && (
        <Card icon="map-pin" title="Address">
          <Text style={styles.body}>
            {[su.address.line1, su.address.line2, su.address.city, su.address.postcode]
              .filter(Boolean).join(', ')}
          </Text>
        </Card>
      )}

      {/* Contact */}
      <Card icon="phone" title="Contact">
        {su.contactDetails?.phone ? (
          <PhoneRow label={su.contactDetails.phone} onPress={() => call(su.contactDetails?.phone)} />
        ) : (
          <Text style={styles.muted}>No phone on file</Text>
        )}
        {!!su.contactDetails?.email && <Text style={styles.body}>{su.contactDetails.email}</Text>}
      </Card>

      {/* Emergency contacts */}
      <Card icon="users" title="Emergency contact">
        {(su.emergencyContacts?.length ?? 0) > 0 ? (
          su.emergencyContacts!.map((ec, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={styles.body}>
                <Text style={{ fontWeight: '700' }}>{ec.name}</Text> ({ec.relationship})
              </Text>
              <PhoneRow label={ec.phone} onPress={() => call(ec.phone)} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Not set</Text>
        )}
      </Card>

      {/* Hospital */}
      <Card icon="plus-square" title="Registered hospital">
        {su.hospitalContact ? (
          <>
            <Text style={[styles.body, { fontWeight: '700' }]}>{su.hospitalContact.name}</Text>
            {!!su.hospitalContact.ward && <Text style={styles.body}>{su.hospitalContact.ward}</Text>}
            {!!su.hospitalContact.phone && (
              <PhoneRow label={su.hospitalContact.phone} onPress={() => call(su.hospitalContact?.phone)} />
            )}
          </>
        ) : (
          <Text style={styles.muted}>Not set</Text>
        )}
      </Card>

      {/* Pharmacy */}
      <Card icon="package" title="Pharmacy">
        {su.pharmacyContact ? (
          <>
            <Text style={[styles.body, { fontWeight: '700' }]}>{su.pharmacyContact.name}</Text>
            {!!su.pharmacyContact.address && <Text style={styles.body}>{su.pharmacyContact.address}</Text>}
            {!!su.pharmacyContact.phone && (
              <PhoneRow label={su.pharmacyContact.phone} onPress={() => call(su.pharmacyContact?.phone)} />
            )}
          </>
        ) : (
          <Text style={styles.muted}>Not set</Text>
        )}
      </Card>

      {/* Jump-offs into the care record */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push({ pathname: '/(worker)/care-plan', params: { serviceUserId: su.id, suName: `${su.firstName} ${su.lastName}` } })}
        >
          <Feather name="clipboard" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Care Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push({ pathname: '/(worker)/mar', params: { serviceUserId: su.id } })}
        >
          <Feather name="clipboard" size={16} color={colors.primary} />
          <Text style={styles.actionText}>MAR Chart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(worker)/visit-notes')}
        >
          <Feather name="edit-3" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Care Notes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Card({ icon, title, tone, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, tone === 'danger' && { borderColor: '#FECACA' }]}>
      <View style={styles.cardHeader}>
        <Feather name={icon} size={15} color={tone === 'danger' ? colors.danger : colors.primary} />
        <Text style={[styles.cardTitle, tone === 'danger' && { color: colors.danger }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PhoneRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.phoneRow} onPress={onPress} activeOpacity={0.7}>
      <Feather name="phone-call" size={14} color={colors.primary} />
      <Text style={styles.phoneText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.background },
  emptyText: { fontSize: 14, color: colors.textMuted },

  headerCard: {
    backgroundColor: colors.primary, borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  photo: { width: 84, height: 84, borderRadius: 42, marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, textTransform: 'capitalize' },
  metaSmall: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  card: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  body: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  muted: { fontSize: 13, color: colors.textMuted },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryTint, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 4, alignSelf: 'flex-start',
  },
  phoneText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionButton: {
    flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryTint, borderRadius: 10, paddingVertical: 12,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
