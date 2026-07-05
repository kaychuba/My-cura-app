import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { colors } from '../../theme';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  medication_alert: 'alert-circle',
  escalation: 'alert-triangle',
  expense_update: 'credit-card',
  expense_submitted: 'credit-card',
  training_assigned: 'book-open',
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: AppNotification[] }>('/notifications?limit=50');
      setItems(data.data);
    } catch { /* keep whatever we have */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      apiClient.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    apiClient.patch('/notifications/read-all').catch(() => {});
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <View style={styles.container}>
      {unread > 0 && (
        <TouchableOpacity style={styles.markAllBar} onPress={markAll} activeOpacity={0.7}>
          <Text style={styles.markAllText}>Mark all {unread} as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.readAt && styles.cardUnread]}
            onPress={() => open(item)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, !item.readAt && { backgroundColor: colors.primary }]}>
              <Feather
                name={TYPE_ICON[item.type] ?? 'bell'}
                size={16}
                color={item.readAt ? colors.primary : '#FFFFFF'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !item.readAt && { fontWeight: '700' }]}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </Text>
            </View>
            {!item.readAt && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  markAllBar: { padding: 12, alignItems: 'center', backgroundColor: colors.primaryTint },
  markAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: colors.textMuted },

  card: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.surface,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardUnread: { borderColor: colors.primaryBorder, backgroundColor: colors.surface },
  iconCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight,
    alignSelf: 'center',
  },
});
