import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../services/api.client';

export interface ServiceUserOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  value: ServiceUserOption | null;
  onChange: (serviceUser: ServiceUserOption) => void;
  label?: string;
}

export function ServiceUserPicker({ value, onChange, label = 'Service User *' }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ServiceUserOption[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || options !== null) return;
    apiClient
      .get<{ data: ServiceUserOption[] }>('/service-users', { params: { limit: 100 } })
      .then(({ data }) => setOptions(data.data))
      .catch(() => setOptions([]));
  }, [open, options]);

  const filtered = useMemo(() => {
    if (!options) return [];
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((su) =>
      `${su.firstName} ${su.lastName}`.toLowerCase().includes(q),
    );
  }, [options, search]);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>
          {value ? `${value.firstName} ${value.lastName}` : 'Select a service user...'}
        </Text>
        <Feather name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service User</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name..."
              autoCorrect={false}
            />
            {options === null ? (
              <ActivityIndicator color="#1E3A5F" style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(su) => su.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.empty}>No service users found</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => { onChange(item); setSearch(''); setOpen(false); }}
                  >
                    <View style={styles.optionAvatar}>
                      <Text style={styles.optionAvatarText}>
                        {item.firstName[0]}{item.lastName[0]}
                      </Text>
                    </View>
                    <Text style={styles.optionName}>{item.firstName} {item.lastName}</Text>
                    {value?.id === item.id && <Feather name="check" size={18} color="#14B8A6" />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  field: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fieldValue: { fontSize: 14, color: '#0F172A' },
  fieldPlaceholder: { fontSize: 14, color: '#94A3B8' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', minHeight: '50%', padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  search: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  optionAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  optionAvatarText: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },
  optionName: { flex: 1, fontSize: 15, color: '#0F172A' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 32, fontSize: 14 },
});
