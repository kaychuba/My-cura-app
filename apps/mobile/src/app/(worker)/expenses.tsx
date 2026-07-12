import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { enqueue, isNetworkError, cacheSet, cacheGet } from '../../services/offline';
import { SwipeableSheet } from '../../components/SwipeableSheet';
import { colors } from '../../theme';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  status: string;
  reviewNote?: string;
}

const CATEGORIES = ['mileage', 'travel', 'supplies', 'meals', 'other'] as const;
const STATUS_COLOR: Record<string, string> = {
  submitted: '#D97706', approved: '#059669', rejected: '#DC2626', paid: '#7C3AED',
};

export default function ExpensesScreen() {
  const [claims, setClaims] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<string>('mileage');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: Expense[] }>('/expenses/mine?limit=50');
      setClaims(data.data);
      cacheSet('expenses.mine', data.data);
    } catch {
      const cached = await cacheGet<Expense[]>('expenses.mine');
      if (cached) setClaims(cached);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const value = Number(amount.replace(/[£,]/g, ''));
    if (!value || value <= 0) {
      Alert.alert('Amount needed', 'Enter how much you spent, e.g. 8.50');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description needed', 'Say what the expense was for.');
      return;
    }
    const body = {
      category,
      description: description.trim(),
      amount: value,
      expenseDate: new Date().toISOString().split('T')[0],
    };
    setSaving(true);
    try {
      await apiClient.post('/expenses', body);
      setFormOpen(false);
      setAmount(''); setDescription('');
      Alert.alert('Submitted', 'Your claim is with your manager — you\'ll be notified of the decision.');
      load();
    } catch (e: unknown) {
      if (isNetworkError(e)) {
        await enqueue({ method: 'post', url: '/expenses', body, label: 'Expense claim' });
        setClaims((prev) => [{
          id: `offline-${Date.now()}`, category, description: body.description,
          amount: value.toFixed(2), expenseDate: body.expenseDate, status: 'submitted',
        }, ...prev]);
        setFormOpen(false);
        setAmount(''); setDescription('');
        Alert.alert('Saved offline', 'No signal — your claim is stored on the phone and will sync automatically.');
        return;
      }
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Could not submit the claim.');
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
        <Text style={styles.sectionTitle}>My Claims</Text>
        {claims.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="credit-card" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>No expense claims yet — add one below.</Text>
          </View>
        ) : (
          claims.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardAmount}>£{Number(c.amount).toFixed(2)}
                  <Text style={styles.cardCategory}>  {c.category}</Text>
                </Text>
                <Text style={styles.cardDesc}>{c.description}</Text>
                <Text style={styles.cardDate}>{format(parseISO(c.expenseDate), 'd MMM yyyy')}</Text>
                {!!c.reviewNote && <Text style={styles.cardNote}>Manager: {c.reviewNote}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[c.status] ?? '#94A3B8') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[c.status] ?? '#94A3B8' }]}>{c.status}</Text>
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
          <Text style={styles.sheetTitle}>New Expense Claim</Text>

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, category === c && { color: '#FFFFFF' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Amount (£)</Text>
          <TextInput
            style={styles.input} value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="8.50" placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>What was it for?</Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]} value={description} onChangeText={setDescription}
            multiline placeholder="e.g. 18 miles between visits" placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Submit Claim</Text>}
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 22, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 13, color: colors.textMuted },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardAmount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  cardCategory: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  cardNote: { fontSize: 12, color: colors.primary, marginTop: 4, fontStyle: 'italic' },
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
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, fontSize: 14, color: colors.textPrimary,
  },
  saveButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
